import os
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Depends, Query, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

import config
from database import get_db
from models import Note
from schemas import NoteOut
from utils import get_current_user, save_file, audio_duration_seconds
from tasks import process_note

notes_router = APIRouter()


def get_note_or_404(db, note_id, user_id):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@notes_router.post("/upload", response_model=NoteOut, status_code=201)
def upload_audio(file: UploadFile = File(...), db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    filename = save_file(file)
    duration = audio_duration_seconds(filename)
    if duration is None:
        os.remove(os.path.join(config.UPLOAD_DIR, filename))
        raise HTTPException(status_code=400, detail="Invalid or unsupported audio file")
    if duration < config.MIN_AUDIO_SECONDS:
        os.remove(os.path.join(config.UPLOAD_DIR, filename))
        raise HTTPException(
            status_code=400,
            detail=f"Audio is shorter than the {config.MIN_AUDIO_SECONDS}-second minimum",
        )
    if duration > config.MAX_AUDIO_SECONDS:
        os.remove(os.path.join(config.UPLOAD_DIR, filename))
        raise HTTPException(
            status_code=400,
            detail=f"Audio is longer than the {config.MAX_AUDIO_SECONDS}-second limit",
        )
    note = Note(user_id=user_id, filename=filename, status="processing")
    db.add(note)
    db.commit()
    db.refresh(note)
    process_note.delay(note.id)
    return note


@notes_router.get("/", response_model=list[NoteOut])
def get_notes(db: Session = Depends(get_db), user_id: int = Depends(get_current_user),
              from_date: datetime = Query(None), to_date: datetime = Query(None)):
    query = db.query(Note).filter(Note.user_id == user_id)
    if from_date:
        query = query.filter(Note.created_at >= from_date)
    if to_date:
        query = query.filter(Note.created_at <= to_date)
    return query.order_by(Note.created_at.desc()).all()


@notes_router.get("/{note_id}", response_model=NoteOut)
def get_note(note_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    return get_note_or_404(db, note_id, user_id)


@notes_router.delete("/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    note = get_note_or_404(db, note_id, user_id)
    filename = note.filename
    db.delete(note)
    db.commit()
    path = os.path.join(config.UPLOAD_DIR, filename)
    if os.path.exists(path):
        os.remove(path)
    return Response(status_code=204)


@notes_router.get("/{note_id}/audio")
def get_audio(note_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    note = get_note_or_404(db, note_id, user_id)
    path = os.path.join(config.UPLOAD_DIR, note.filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(path)
