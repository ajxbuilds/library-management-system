from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.reservation import ReservationStatus

class ReservationCreate(BaseModel):
    user_id: int
    book_id: int

class ReservationOut(BaseModel):
    id: int
    user_id: int
    book_id: int
    queue_position: int
    priority_score: float
    status: ReservationStatus
    created_at: datetime
    ready_until: Optional[datetime] = None
    book_title: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True
