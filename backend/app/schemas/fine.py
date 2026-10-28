from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.fine import FineStatus

class FineWaiveRequest(BaseModel):
    fine_id: int
    reason: str

class FineOut(BaseModel):
    id: int
    user_id: int
    loan_id: int
    amount: float
    days_overdue: int
    status: FineStatus
    paid_at: Optional[datetime] = None
    waived_by: Optional[str] = None
    waived_reason: Optional[str] = None
    created_at: datetime
    book_title: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True
