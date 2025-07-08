from fastapi import FastAPI
from auth import auth_router
from notes import notes_router
from database import init_db

init_db()

app = FastAPI(
    title="VoiceMate API",
    description="Upload voice notes, transcribe them using Whisper, summarize with GPT, and manage your notes easily.",
    version="1.0.0"
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(notes_router, prefix="/notes", tags=["Notes"])
