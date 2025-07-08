# VoiceMate API

VoiceMate is a simple voice-to-text notes API built using FastAPI, Whisper (local), and JWT. It allows users to upload audio notes, transcribe them into text, summarize the content, and filter saved notes by date.

---

This project helps me learn how to:

- Use FastAPI and SQLite
- Handle file uploads
- Integrate a local AI model (Whisper)
- Implement JWT authentication
- Structure modular FastAPI apps

  
## Features

- Upload `.mp3` audio files
- Local transcription using Whisper (no OpenAI API needed)
- Summarization of transcribed text
- User authentication using JWT
- SQLite database with SQLAlchemy ORM
- Filter notes by upload date

---

## Tech Stack
- Python 3.11+
- FastAPI
- SQLite with SQLAlchemy
- JWT for authentication
- Whisper (running locally)


---

## Getting Started

### Clone the Repo

```bash
git clone https://github.com/your-username/VoiceMate-API.git
cd VoiceMate-API
```

### Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### Install Requirements

```bash
pip install -r requirements.txt
```

### Generate a Secret Key

To generate a secure secret key:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Create a `.env` file in your project root and add:

```env
SECRET_KEY=your_generated_key
```

---

## Running the App

```bash
uvicorn main:app --reload
```

The API will be available at: `http://localhost:8000`

---

## API Endpoints and Tests

### 1. Register a New User

**POST /auth/register**

**Request**:

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**Test**:

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456"}'
```

**Expected Status Code**: `201 Created`

---

### 2. Login

**POST /auth/login**

**Request**:

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**Test**:

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456"}'
```

**Expected Status Code**: `200 OK`

---

### 3. Upload Audio Note

**POST /notes/upload**

**Test**:

```bash
curl -X POST http://localhost:8000/notes/upload \
  -H "Authorization: Bearer <your_token>" \
  -F "file=@path/to/audio.mp3"
```

**Expected Status Code**: `201 Created`

---

### 4. List All Notes

**GET /notes/**

**Test**:

```bash
curl -X GET http://localhost:8000/notes/ \
  -H "Authorization: Bearer <your_token>"
```

**Expected Status Code**: `200 OK`

---

### 5. Filter Notes by Date

**GET /notes/?date=YYYY-MM-DD**

**Test**:

```bash
curl -X GET "http://localhost:8000/notes/?date=2025-07-08" \
  -H "Authorization: Bearer <your_token>"
```

**Expected Status Code**: `200 OK`

---





