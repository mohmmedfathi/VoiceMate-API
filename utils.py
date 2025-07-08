import os
import jwt
import whisper
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
whisper_model = whisper.load_model("base")

def create_jwt_token(data: dict) -> str:
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["user_id"]
    except:
        raise HTTPException(status_code=403, detail="Invalid token")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def save_file(file: UploadFile) -> str:
    path = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(path, "wb") as f:
        f.write(file.file.read())
    return file.filename

def whisper_transcribe(filename: str) -> str:
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    result = whisper_model.transcribe(file_path)
    return result["text"]

def summarize_text(text: str) -> str:
    return "ملخص (تلقائي): " + text[:100] + ("..." if len(text) > 100 else "")
