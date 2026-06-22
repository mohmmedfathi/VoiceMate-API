# VoiceMate

A voice‑notes app built with FastAPI. Record or upload audio and get it
transcribed locally with Whisper. Ships with a small, server‑rendered web UI
that works in both English and Arabic (RTL).

## Features

- **Record or upload** — record in the browser with a live waveform, or drag and drop an `.mp3` / `.m4a` / `.wav` / `.webm` / `.ogg`.
- **Background transcription** — uploads return immediately; Whisper runs in a Celery worker while the UI polls for the result.
- **Per‑note audio + transcript** — play back the original audio and read the transcript and a short summary.
- **Filter & manage** — filter notes by date and delete the ones you don't need.
- **JWT auth** — register / login; every note (and its audio) is scoped to its owner.
- **Bilingual UI** — English / Arabic toggle with full RTL/LTR support.

## Tech stack

| Area            | Choice                          |
| --------------- | ------------------------------- |
| API             | FastAPI                         |
| Database        | SQLAlchemy + SQLite (default)   |
| Background jobs | Celery + Redis                  |
| Transcription   | OpenAI Whisper (local)          |
| Frontend        | Jinja2 templates + vanilla JS   |

## Prerequisites

- Python 3.11+
- [ffmpeg](https://ffmpeg.org/) on your `PATH` (required by Whisper)
- Redis (for the Celery worker) — or just use Docker, which provides it

## Run with Docker

The quickest way to run the full stack (web + Celery worker + Redis):

```bash
docker compose up --build
```

Then open http://localhost:8000.

Set a `SECRET_KEY` before starting Docker. Docker Compose refuses to start
without it. Create a `.env` file next to `docker-compose.yml`:

```env
SECRET_KEY=your-long-random-string
```

The database, uploaded audio, and the downloaded Whisper model are kept in named
volumes, so they survive restarts. The first transcription downloads the Whisper
model and is slower than later ones.

## Run locally

The steps below run the project directly on your machine instead of in Docker.

### 1. Install

```bash
git clone https://github.com/your-username/VoiceMate-API.git
cd VoiceMate-API
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

For the test suite:

```bash
pip install -r requirements-dev.txt
pytest
```

### 2. Configure

```bash
cp .env.example .env
```

Set at least `SECRET_KEY`:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

See [Configuration](#configuration) for all options.

### 3. Run

Transcription runs on a Celery worker backed by Redis, so start three processes:

```bash
redis-server                                          # broker
celery -A celery_app.celery_app worker --loglevel=info
uvicorn main:app --reload
```

Open http://localhost:8000.

> No Redis handy? For local development set `CELERY_TASK_ALWAYS_EAGER=1` to run
> transcription inline in the web process (no broker or worker needed).

## Configuration

| Variable                   | Default                        | Description                                   |
| -------------------------- | ------------------------------ | --------------------------------------------- |
| `SECRET_KEY`               | —                              | **Required.** Secret used to sign JWTs.       |
| `JWT_EXPIRES_MINUTES`      | `1440`                         | Token lifetime in minutes.                    |
| `DATABASE_URL`             | `sqlite:///./voicemate.db`     | SQLAlchemy database URL.                       |
| `REDIS_URL`                | `redis://localhost:6379/0`     | Celery broker / result backend.                |
| `CELERY_TASK_ALWAYS_EAGER` | `0`                            | `1` runs tasks inline (development only).       |
| `UPLOAD_DIR`               | `uploads`                      | Where audio files are stored.                  |
| `WHISPER_MODEL`            | `small`                        | Whisper model size (`tiny`, `base`, `small`, `medium`, `large-v3`). Use `medium`/`large-v3` for good Arabic accuracy. |
| `WHISPER_LANGUAGE`         | — (auto-detect)                | Force a language code (`ar`, `en`, …) for short/accented clips. |
| `GEMINI_API_KEY`           | —                              | Optional. Google Gemini key for AI summaries; empty uses the built-in local summarizer. |
| `GEMINI_MODEL`             | `gemini-2.5-flash-lite`        | Gemini model used when `GEMINI_API_KEY` is set. |

## API

Interactive docs are available at `/docs` once the server is running.

| Method   | Endpoint                | Description                          |
| -------- | ----------------------- | ----------------------------------- |
| `POST`   | `/auth/register`        | Create an account                   |
| `POST`   | `/auth/login`           | Obtain a JWT                        |
| `POST`   | `/notes/upload`         | Upload audio (queues transcription) |
| `GET`    | `/notes/`               | List notes (filter by date)         |
| `GET`    | `/notes/{id}`           | Get a single note (poll its status) |
| `DELETE` | `/notes/{id}`           | Delete a note and its audio         |
| `GET`    | `/notes/{id}/audio`     | Stream the original audio (owner)   |

All `/notes` routes require an `Authorization: Bearer <token>` header.

### Example

```bash
# 1. Register and log in
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"secret123"}'

TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"secret123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# 2. Upload audio (returns a note with status "processing")
curl -X POST http://localhost:8000/notes/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample.mp3"

# 3. Poll the note until status is "done", then list everything
curl http://localhost:8000/notes/ -H "Authorization: Bearer $TOKEN"
```

## How it works

1. `POST /notes/upload` stores the audio and creates a note with status
   `processing`, then enqueues a Celery task and returns immediately.
2. The worker transcribes the audio with Whisper, writes the transcript and a
   short summary, and sets the status to `done` (or `error` on failure). The
   summary uses Google Gemini when `GEMINI_API_KEY` is set, and falls back to a
   local extractive summarizer otherwise (or if the API call fails).
3. The web UI polls `GET /notes/{id}` until the note is ready.

Audio is never served from a public folder — `GET /notes/{id}/audio` checks
ownership first, and stored files are given unique names to avoid collisions.

## Project structure

```
config.py        Settings loaded from environment / .env
main.py          FastAPI app, routers and static mounts
auth.py          Register / login endpoints
notes.py         Upload, list, audio and delete endpoints
web.py           Server-rendered pages (login, dashboard)
models.py        SQLAlchemy models (User, Note)
schemas.py       Pydantic schemas
database.py      Engine, session, lightweight migrations
celery_app.py    Celery application and configuration
tasks.py         Background transcription task
utils.py         Auth, hashing, file storage, Whisper
templates/       Jinja2 templates
static/          CSS and JS
```
