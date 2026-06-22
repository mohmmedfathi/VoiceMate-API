from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from auth import auth_router
from notes import notes_router
from web import web_router
from database import init_db

init_db()

app = FastAPI(
    title="VoiceMate API",
    description="Record or upload voice notes and transcribe them with Whisper.",
    version="1.0.0",
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(notes_router, prefix="/notes", tags=["Notes"])

app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(web_router)
