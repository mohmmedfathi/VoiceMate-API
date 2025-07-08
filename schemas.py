from pydantic import BaseModel
from datetime import datetime

class UserCreate(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    class Config:
        orm_mode = True

class NoteCreate(BaseModel):
    filename: str
    transcript: str
    summary: str

class NoteOut(NoteCreate):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True
