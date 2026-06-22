import os
import re
import json
import time
import uuid
import subprocess
import urllib.request
import urllib.error
from collections import Counter
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext

import config

os.makedirs(config.UPLOAD_DIR, exist_ok=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
whisper_model = None


def hash_password(password):
    return pwd_context.hash(password)


def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)


def create_jwt_token(user_id):
    expires = datetime.now(timezone.utc) + timedelta(minutes=config.JWT_EXPIRES_MINUTES)
    data = {"user_id": user_id, "exp": expires}
    return jwt.encode(data, config.SECRET_KEY, algorithm=config.JWT_ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, config.SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
        return payload["user_id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def save_file(file):
    ext = os.path.splitext(file.filename)[1] or ".bin"
    name = uuid.uuid4().hex + ext
    path = os.path.join(config.UPLOAD_DIR, name)
    with open(path, "wb") as f:
        f.write(file.file.read())
    return name


def whisper_transcribe(filename):
    global whisper_model
    if whisper_model is None:
        import whisper
        whisper_model = whisper.load_model(config.WHISPER_MODEL)
    path = os.path.join(config.UPLOAD_DIR, filename)
    result = whisper_model.transcribe(
        path,
        language=config.WHISPER_LANGUAGE or None,
        task="transcribe",
        beam_size=5,
        best_of=5,
        temperature=(0.0, 0.2, 0.4, 0.6, 0.8, 1.0),
        condition_on_previous_text=False,
        compression_ratio_threshold=2.4,
        no_speech_threshold=0.6,
        fp16=False,
    )
    return result["text"].strip()


def summarize_text(text):
    text = (text or "").strip()
    if not text:
        return ""
    if config.GEMINI_API_KEY:
        summary = gemini_summary(text)
        if summary:
            return summary
    return extractive_summary(text)


def gemini_summary(text):
    prompt = (
        "Summarize this voice note in one or two short sentences. "
        "Reply in the same language as the note and return only the summary.\n\n"
        + text
    )
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{config.GEMINI_MODEL}:generateContent?key={config.GEMINI_API_KEY}"
    )
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 200},
    }).encode()
    for attempt in range(3):
        request = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.loads(response.read())
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except urllib.error.HTTPError as error:
            if error.code in (429, 503) and attempt < 2:
                time.sleep(1.5 * (attempt + 1))
                continue
            return ""
        except Exception:
            return ""
    return ""


def extractive_summary(text):
    sentences = [s.strip() for s in re.split(r"(?<=[.!?؟])\s+|\n+", text) if s.strip()]
    if len(sentences) < 2:
        return text
    words = [w for w in re.findall(r"\w+", text.lower()) if len(w) >= 3]
    if not words:
        return sentences[0]
    freq = Counter(words)
    scored = []
    for index, sentence in enumerate(sentences):
        sw = [w for w in re.findall(r"\w+", sentence.lower()) if len(w) >= 3]
        if sw:
            scored.append((sum(freq[w] for w in sw) / len(sw), index, sentence))
    if not scored:
        return sentences[0]
    count = max(1, min(3, round(len(sentences) * 0.35)))
    top = sorted(scored, key=lambda item: item[0], reverse=True)[:count]
    return " ".join(s for _, _, s in sorted(top, key=lambda item: item[1]))


def audio_duration_seconds(filename):
    path = os.path.join(config.UPLOAD_DIR, filename)
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, text=True, timeout=30, check=True,
        )
        duration = float(result.stdout.strip())
        return duration if duration >= 0 else None
    except (OSError, subprocess.SubprocessError, ValueError):
        return None
