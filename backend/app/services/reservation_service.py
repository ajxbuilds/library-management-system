from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.reservation import Reservation, ReservationStatus
from app.models.book import Book
from app.models.user import User, MemberTier
from app.models.notification import Notification, NotificationType
from app.algorithms.engine import dsa_engine
from app.core.config import settings

class ReservationService:
    @staticmethod
    def create_reservation(user_id: int, book_id: int, db: Session) -> Reservation:
        user = db.query(User).filter(User.id == user_id).first()
        book = db.query(Book).filter(Book.id == book_id).first()

        if not user or not book:
            raise HTTPException(status_code=404, detail="User or Book not found.")

        # Check existing active reservation
        existing = db.query(Reservation).filter(
            Reservation.user_id == user_id,
            Reservation.book_id == book_id,
            Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.READY])
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="User already has an active reservation for this book.")

        # Calculate Priority Score based on Tier
        tier_weights = {
            MemberTier.FACULTY: 3.0,
            MemberTier.PREMIUM: 2.0,
            MemberTier.STANDARD: 1.0
        }
        base_priority = tier_weights.get(user.member_tier, 1.0)

        # Count current queue length
        q = dsa_engine.get_or_create_book_queue(book_id)
        current_queue_len = q.size()
        queue_pos = current_queue_len + 1

        reservation = Reservation(
            user_id=user_id,
            book_id=book_id,
            queue_position=queue_pos,
            priority_score=base_priority,
            status=ReservationStatus.PENDING
        )
        db.add(reservation)
        db.flush()

        # Enqueue in DSA FIFO Queue
        q.enqueue({
            "reservation_id": reservation.id,
            "user_id": user_id,
            "user_name": user.full_name,
            "created_at": reservation.created_at.isoformat()
        })

        # Push to DSA Min/Max Heap
        dsa_engine.reservation_heap.push((-base_priority, reservation.created_at.timestamp()), {
            "reservation_id": reservation.id,
            "user_id": user_id,
            "book_id": book_id
        })

        # Send notification
        db.add(Notification(
            user_id=user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Book Reserved",
            message=f"You are #{queue_pos} in line for '{book.title}'."
        ))

        db.commit()
        db.refresh(reservation)
        return reservation

    @staticmethod
    def process_expired_reservations(db: Session) -> List[int]:
        """
        Processes expired reservations (>48h window).
        Reallocates the copy to the next student in the FIFO queue!
        """
        now = datetime.utcnow()
        expired = db.query(Reservation).filter(
            Reservation.status == ReservationStatus.READY,
            Reservation.ready_until < now
        ).all()

        reallocated_book_ids = []
        for res in expired:
            res.status = ReservationStatus.EXPIRED
            book = db.query(Book).filter(Book.id == res.book_id).first()
            if book:
                book.reserved_copies = max(0, book.reserved_copies - 1)
                book.available_copies += 1

                # Notify expired student
                db.add(Notification(
                    user_id=res.user_id,
                    type=NotificationType.RESERVATION_EXPIRED,
                    title="Reservation Expired",
                    message=f"Pickup window for '{book.title}' expired. Reservation passed to next student."
                ))

                # Check if someone else is in queue
                next_in_line = db.query(Reservation).filter(
                    Reservation.book_id == book.id,
                    Reservation.status == ReservationStatus.PENDING
                ).order_by(Reservation.priority_score.desc(), Reservation.created_at.asc()).first()

                if next_in_line:
                    next_in_line.status = ReservationStatus.READY
                    next_in_line.ready_until = now + timedelta(hours=settings.RESERVATION_HOLD_HOURS)
                    book.available_copies -= 1
                    book.reserved_copies += 1
                    reallocated_book_ids.append(book.id)

                    db.add(Notification(
                        user_id=next_in_line.user_id,
                        type=NotificationType.RESERVATION_READY,
                        title="Reserved Book Ready for Pickup!",
                        message=f"'{book.title}' is now ready for you! Collect before {next_in_line.ready_until.strftime('%Y-%m-%d %H:%M')}."
                    ))

        db.commit()
        return reallocated_book_ids
