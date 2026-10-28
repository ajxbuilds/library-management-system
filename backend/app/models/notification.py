import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database.session import Base

class NotificationType(str, enum.Enum):
    BOOK_ISSUED = "book_issued"
    BOOK_RETURNED = "book_returned"
    DUE_REMINDER = "due_reminder"
    OVERDUE_WARNING = "overdue_warning"
    RESERVATION_READY = "reservation_ready"
    RESERVATION_EXPIRED = "reservation_expired"
    FINE_GENERATED = "fine_generated"
    FINE_WAIVED = "fine_waived"
    SYSTEM_ALERT = "system_alert"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="notifications")
