import os
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


PROJECT_ROOT = Path(__file__).resolve().parents[1]
TEST_DATA_DIR = Path(tempfile.mkdtemp(prefix="voicemate-tests-"))

os.environ.update(
    SECRET_KEY="test-secret",
    DATABASE_URL=f"sqlite:///{TEST_DATA_DIR / 'voicemate.db'}",
    UPLOAD_DIR=str(TEST_DATA_DIR / "uploads"),
    CELERY_TASK_ALWAYS_EAGER="0",
    MAX_AUDIO_SECONDS="600",
)

import notes
import tasks
from database import engine, SessionLocal
from main import app
from models import Base, Note


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def register(client, email):
    response = client.post("/auth/register", json={"email": email, "password": "secret123"})
    assert response.status_code == 200
    return response.json()


def auth_headers(client, email):
    response = client.post("/auth/login", json={"email": email, "password": "secret123"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_missing_secret_key_stops_startup():
    env = os.environ.copy()
    env.pop("SECRET_KEY", None)
    env["PYTHONPATH"] = str(PROJECT_ROOT)

    result = subprocess.run(
        [sys.executable, "-c", "import config"],
        cwd=TEST_DATA_DIR,
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    assert "SECRET_KEY must be set" in result.stderr


def test_upload_rejects_audio_with_no_readable_duration(client, monkeypatch):
    register(client, "owner@example.com")
    headers = auth_headers(client, "owner@example.com")
    monkeypatch.setattr(notes, "audio_duration_seconds", lambda _: None)

    response = client.post(
        "/notes/upload",
        headers=headers,
        files={"file": ("invalid.mp3", b"not audio", "audio/mpeg")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or unsupported audio file"
    assert not list((TEST_DATA_DIR / "uploads").iterdir())


def test_upload_uses_the_server_duration_limit(client, monkeypatch):
    register(client, "owner@example.com")
    headers = auth_headers(client, "owner@example.com")
    monkeypatch.setattr(notes, "audio_duration_seconds", lambda _: 601)

    response = client.post(
        "/notes/upload",
        headers=headers,
        files={"file": ("long.mp3", b"audio", "audio/mpeg")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Audio is longer than the 600-second limit"


def test_notes_are_not_available_to_other_users(client):
    owner = register(client, "owner@example.com")
    register(client, "other@example.com")
    other_headers = auth_headers(client, "other@example.com")
    db = SessionLocal()
    try:
        note = Note(user_id=owner["id"], filename="recording.webm", status="done")
        db.add(note)
        db.commit()
        db.refresh(note)
        note_id = note.id
    finally:
        db.close()

    response = client.get(f"/notes/{note_id}", headers=other_headers)

    assert response.status_code == 404


def test_processing_failure_marks_the_note_as_error(monkeypatch, client):
    owner = register(client, "owner@example.com")
    db = SessionLocal()
    try:
        note = Note(user_id=owner["id"], filename="recording.webm", status="processing")
        db.add(note)
        db.commit()
        db.refresh(note)
        note_id = note.id
    finally:
        db.close()

    def fail_transcription(_):
        raise RuntimeError("transcription failed")

    monkeypatch.setattr(tasks, "whisper_transcribe", fail_transcription)
    tasks.process_note(note_id)

    db = SessionLocal()
    try:
        note = db.get(Note, note_id)
        assert note.status == "error"
        assert note.error == "transcription failed"
    finally:
        db.close()
