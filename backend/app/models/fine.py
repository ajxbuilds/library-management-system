import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey, String, Enum
from sqlalchemy.orm import relationship
from app.database.session import Base

class FineStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    WAIVED = "waived"

class Fine(Base):
    __tablename__ = "fines"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=False, unique=True, index=True)
    
    amount = Column(Float, nullable=False)
    days_overdue = Column(Integer, default=0, nullable=False)
    status = Column(Enum(FineStatus), default=FineStatus.PENDING, nullable=False, index=True)
    paid_at = Column(DateTime, nullable=True)
    waived_by = Column(String(100), nullable=True)
    waived_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="fines")
    loan = relationship("Loan", back_populates="fine")
