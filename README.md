# VoiceMate

Record or upload audio and get an automatic **transcript** and **summary**, with notes you can search, play back, and manage.

FastAPI backend, local Whisper transcription on a background worker, optional Gemini summaries, and a bilingual **English / Arabic (RTL)** web UI.

## Features

- **Record or upload** — record in the browser with a live waveform, or upload `mp3 / m4a / wav / webm / ogg`.
- **Async transcription** — uploads return instantly; a Celery worker transcribes in the background while the UI polls for the result.
- **Auto summary** — each note gets a short summary (Google Gemini when configured, local extractive fallback otherwise).
- **Auth & ownership** — JWT register/login; every note and its audio is scoped to its owner.
- **Manage notes** — filter by date, play original audio, copy transcript, delete.
- **Input validation** — duration limits (5s–10min) and audio-format checks before anything is queued.
- **Bilingual UI** — English / Arabic toggle with full RTL/LTR support.

## Stack

| Layer            | Tech                          |
| ---------------- | ----------------------------- |
| API              | FastAPI, Pydantic             |
| Data             | SQLAlchemy + SQLite           |
| Background jobs  | Celery + Redis                |
| Transcription    | OpenAI Whisper (local)        |
| Summaries        | Google Gemini (optional)      |
| Frontend         | Jinja2 + vanilla JS (no build step) |
| Infra            | Docker Compose                |

## Architecture

```
Browser ──upload──▶ FastAPI ──enqueue──▶ Redis ──▶ Celery worker
   ▲                   │                              │ Whisper + summary
   └── polls GET /notes/{id} ◀── SQLite ◀─────────────┘
```

1. `POST /notes/upload` validates the file, stores it, creates a note with status `processing`, enqueues a task, and returns immediately.
2. The worker transcribes with Whisper, writes the transcript + summary, and sets status to `done` (or `error`).
3. The UI polls `GET /notes/{id}` until the note is ready.

Audio is never served from a public folder — `GET /notes/{id}/audio` checks ownership first, and files are stored under unique names.

## Quick start (Docker)

```bash
echo "SECRET_KEY=$(python3 -c 'import secrets;print(secrets.token_urlsafe(32))')" > .env
docker compose up --build
```

Open http://localhost:8000. Compose runs web + worker + Redis; the database, uploads, and Whisper model persist in named volumes. The first transcription downloads the model and is slower than later ones.

## Run locally

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # set SECRET_KEY

# transcription runs on a worker:
redis-server
celery -A celery_app.celery_app worker --loglevel=info
uvicorn main:app --reload
```

No Redis? Set `CELERY_TASK_ALWAYS_EAGER=1` to transcribe inline in the web process. Tests: `pip install -r requirements-dev.txt && pytest`.

## Configuration

Set in `.env` (full list in `.env.example`):

| Variable             | Default                 | Notes                                                        |
| -------------------- | ----------------------- | ------------------------------------------------------------ |
| `SECRET_KEY`         | —                       | **Required.** Signs JWTs.                                    |
| `DATABASE_URL`       | `sqlite:///./voicemate.db` | SQLAlchemy URL.                                           |
| `REDIS_URL`          | `redis://localhost:6379/0` | Celery broker / backend.                                  |
| `WHISPER_MODEL`      | `small`                 | `tiny`→`large-v3`. Use `medium`/`large-v3` for better Arabic. |
| `WHISPER_LANGUAGE`   | auto-detect             | Force `ar`/`en` for short clips.                             |
| `GEMINI_API_KEY`     | —                       | Enables AI summaries; empty = local fallback.               |
| `GEMINI_MODEL`       | `gemini-2.5-flash-lite` | Model used when a key is set.                               |

## API

Interactive docs at `/docs`. All `/notes` routes need `Authorization: Bearer <token>`.

| Method   | Endpoint              | Description                          |
| -------- | --------------------- | ------------------------------------ |
| `POST`   | `/auth/register`      | Create an account                    |
| `POST`   | `/auth/login`         | Get a JWT                            |
| `POST`   | `/notes/upload`       | Upload audio (queues transcription)  |
| `GET`    | `/notes/`             | List notes (filter by date)          |
| `GET`    | `/notes/{id}`         | Get one note (poll its status)       |
| `DELETE` | `/notes/{id}`         | Delete a note and its audio          |
| `GET`    | `/notes/{id}/audio`   | Stream the original audio (owner)    |

```bash
TOKEN=$(curl -s -X POST localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"secret123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -X POST localhost:8000/notes/upload \
  -H "Authorization: Bearer $TOKEN" -F "file=@sample.mp3"
```

## Project structure

```
main.py        FastAPI app, routers, static mounts
auth.py        Register / login
notes.py       Upload, list, audio, delete
web.py         Server-rendered pages
tasks.py       Background transcription task
utils.py       Auth, hashing, storage, Whisper, summaries
models.py      SQLAlchemy models      schemas.py   Pydantic schemas
database.py    Engine / session       config.py    Settings
celery_app.py  Celery setup
templates/     Jinja2 views           static/      CSS + JS
```
