from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.loan import LoanStatus

class LoanIssueRequest(BaseModel):
    user_id: Optional[int] = None
    book_id: int
    loan_days: Optional[int] = 14

class LoanReturnRequest(BaseModel):
    loan_id: int

class LoanOut(BaseModel):
    id: int
    user_id: int
    book_id: int
    book_copy_id: int
    issue_date: datetime
    due_date: datetime
    return_date: Optional[datetime] = None
    status: LoanStatus
    renewal_count: int
    book_title: Optional[str] = None
    user_name: Optional[str] = None
    fine_amount: Optional[float] = 0.0

    class Config:
        from_attributes = True
