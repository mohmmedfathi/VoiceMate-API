import os
import re
import uuid
import subprocess
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
    return whisper_model.transcribe(path)["text"].strip()


def summarize_text(text):
    text = (text or "").strip()
    if not text:
        return ""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?؟])\s+|\n+", text) if s.strip()]
    if len(sentences) <= 2:
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
