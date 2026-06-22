from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str

    model_config = ConfigDict(from_attributes=True)

class NoteOut(BaseModel):
    id: int
    filename: str
    transcript: Optional[str] = None
    summary: Optional[str] = None
    status: str
    error: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
