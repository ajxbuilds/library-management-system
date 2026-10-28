import enum
from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from app.database.session import Base

class ReservationStatus(str, enum.Enum):
    PENDING = "pending"     # Waiting in queue
    READY = "ready"         # Book returned, reserved for user pickup
    COLLECTED = "collected" # User collected the book
    EXPIRED = "expired"     # Pickup window lapsed, passed to next
    CANCELLED = "cancelled" # User cancelled

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False, index=True)
    
    queue_position = Column(Integer, default=1, nullable=False)
    priority_score = Column(Float, default=1.0, nullable=False)
    status = Column(Enum(ReservationStatus), default=ReservationStatus.PENDING, nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ready_until = Column(DateTime, nullable=True) # 48hr pickup limit

    # Relationships
    user = relationship("User", back_populates="reservations")
    book = relationship("Book", back_populates="reservations")
