from celery_app import celery_app
from database import SessionLocal
from models import Note
from utils import whisper_transcribe, summarize_text


@celery_app.task(name="process_note")
def process_note(note_id):
    db = SessionLocal()
    try:
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            return
        try:
            note.transcript = whisper_transcribe(note.filename)
            note.summary = summarize_text(note.transcript)
            note.status = "done"
        except Exception as e:
            note.status = "error"
            note.error = str(e)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
