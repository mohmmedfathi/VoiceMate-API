from fastapi import APIRouter, UploadFile, File, Depends, Query
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Note
from schemas import NoteOut
from utils import get_current_user, save_file, whisper_transcribe, summarize_text
from datetime import datetime

notes_router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@notes_router.post("/upload")
async def upload_audio(file: UploadFile = File(...), db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    filename = save_file(file)
    transcript = whisper_transcribe(filename)
    summary = summarize_text(transcript)
    note = Note(user_id=user_id, filename=filename, transcript=transcript, summary=summary)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {
        "id": note.id,
        "filename": note.filename,
        "transcript": note.transcript,
        "summary": note.summary
    }

@notes_router.get("/", response_model=list[NoteOut])
def get_notes(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
    from_date: datetime = Query(None),
    to_date: datetime = Query(None)
):
    query = db.query(Note).filter(Note.user_id == user_id)
    if from_date:
        query = query.filter(Note.created_at >= from_date)
    if to_date:
        query = query.filter(Note.created_at <= to_date)
    return query.order_by(Note.created_at.desc()).all()
