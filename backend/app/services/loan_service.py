from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.book import Book, BookCopy, CopyStatus
from app.models.user import User
from app.models.loan import Loan, LoanStatus
from app.models.reservation import Reservation, ReservationStatus
from app.models.fine import Fine, FineStatus
from app.models.notification import Notification, NotificationType
from app.models.audit import AuditLog
from app.algorithms.engine import dsa_engine
from app.algorithms.stacks.stack import UndoCommand
from app.core.config import settings
from app.core.cache import cache

class LoanService:
    @staticmethod
    def issue_book(user_id: int, book_id: int, db: Session, loan_days: int = 14) -> Loan:
        # 1. Validate User
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=400, detail="Invalid or inactive user account.")

        # Check Active Borrow Limit
        active_loans_count = db.query(Loan).filter(
            Loan.user_id == user_id,
            Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.OVERDUE])
        ).count()
        if active_loans_count >= user.borrow_limit:
            raise HTTPException(
                status_code=400,
                detail=f"User has reached the borrowing limit of {user.borrow_limit} books."
            )

        # Check Duplicate active loan for same book
        existing_loan = db.query(Loan).filter(
            Loan.user_id == user_id,
            Loan.book_id == book_id,
            Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.OVERDUE])
        ).first()
        if existing_loan:
            raise HTTPException(status_code=400, detail="User already has an active loan for this book.")

        # 2. Check Book and Available Copies
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found.")

        # Check if the user has a reservation ready for this book
        ready_res = db.query(Reservation).filter(
            Reservation.user_id == user_id,
            Reservation.book_id == book_id,
            Reservation.status == ReservationStatus.READY
        ).first()

        if book.available_copies <= 0 and not ready_res:
            raise HTTPException(
                status_code=400,
                detail="No copies available for issue. Please join the reservation queue."
            )

        # 3. Find an available physical copy
        copy = db.query(BookCopy).filter(
            BookCopy.book_id == book_id,
            BookCopy.status == CopyStatus.AVAILABLE
        ).first()

        if not copy:
            # Fallback create a copy if inventory data was initialized simply
            copy = BookCopy(
                book_id=book.id,
                barcode=f"BC-{book.id}-{book.issued_copies + 1}",
                status=CopyStatus.AVAILABLE,
                shelf_location=f"Shelf-{book.category_id or 1}"
            )
            db.add(copy)
            db.flush()

        copy.status = CopyStatus.ISSUED
        if ready_res:
            book.reserved_copies = max(0, book.reserved_copies - 1)
            ready_res.status = ReservationStatus.COLLECTED
        else:
            book.available_copies = max(0, book.available_copies - 1)
            pending_res = db.query(Reservation).filter(
                Reservation.user_id == user_id,
                Reservation.book_id == book_id,
                Reservation.status == ReservationStatus.PENDING
            ).first()
            if pending_res:
                pending_res.status = ReservationStatus.COLLECTED

        book.issued_copies += 1
        book.borrow_count += 1

        due_date = datetime.utcnow() + timedelta(days=loan_days)
        loan = Loan(
            user_id=user_id,
            book_id=book_id,
            book_copy_id=copy.id,
            issue_date=datetime.utcnow(),
            due_date=due_date,
            status=LoanStatus.ACTIVE
        )
        db.add(loan)
        db.flush()

        # Update DSA Knowledge Graph and Cache
        dsa_engine.record_loan_in_graph(user_id, book_id)
        cache.delete(f"search:ranked:*")
        cache.delete(f"user:recs:{user_id}:*")

        # In-app Notification
        notif = Notification(
            user_id=user_id,
            type=NotificationType.BOOK_ISSUED,
            title="Book Issued Successfully",
            message=f"You have borrowed '{book.title}'. Due date is {due_date.strftime('%Y-%m-%d')}."
        )
        db.add(notif)

        # Audit Log
        audit = AuditLog(
            user_id=user_id,
            action="ISSUE_BOOK",
            entity="Loan",
            entity_id=loan.id,
            details=f"Issued book ID {book.id} to user ID {user.id}"
        )
        db.add(audit)

        # Push to Undo Stack
        dsa_engine.push_undo(UndoCommand(
            action_type="ISSUE_BOOK",
            entity="Loan",
            entity_id=loan.id,
            payload={"loan_id": loan.id, "book_id": book.id, "copy_id": copy.id, "user_id": user_id},
            description=f"Undo issuing '{book.title}' to {user.full_name}"
        ))

        db.commit()
        db.refresh(loan)
        return loan

    @staticmethod
    def return_book(loan_id: int, db: Session) -> Tuple[Loan, Optional[Fine], Optional[Reservation]]:
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan or loan.status == LoanStatus.RETURNED:
            raise HTTPException(status_code=400, detail="Invalid loan or book has already been returned.")

        book = db.query(Book).filter(Book.id == loan.book_id).first()
        copy = db.query(BookCopy).filter(BookCopy.id == loan.book_copy_id).first()

        now = datetime.utcnow()
        loan.return_date = now
        loan.status = LoanStatus.RETURNED

        if copy:
            copy.status = CopyStatus.AVAILABLE

        book.available_copies += 1
        book.issued_copies = max(0, book.issued_copies - 1)

        # 1. Check for Overdue Fine
        fine_record = None
        if now > loan.due_date:
            days_overdue = (now.date() - loan.due_date.date()).days
            if days_overdue > 0:
                fine_amount = round(days_overdue * settings.DAILY_FINE_RATE, 2)
                fine_record = db.query(Fine).filter(Fine.loan_id == loan.id).first()
                if fine_record:
                    fine_record.amount = fine_amount
                    fine_record.days_overdue = days_overdue
                    fine_record.status = FineStatus.PENDING
                else:
                    fine_record = Fine(
                        user_id=loan.user_id,
                        loan_id=loan.id,
                        amount=fine_amount,
                        days_overdue=days_overdue,
                        status=FineStatus.PENDING
                    )
                    db.add(fine_record)
                
                # Heap insertion for fine urgency
                dsa_engine.overdue_heap.push((-days_overdue, fine_amount), {
                    "loan_id": loan.id,
                    "user_id": loan.user_id,
                    "amount": fine_amount
                })

                # Notify user of fine
                db.add(Notification(
                    user_id=loan.user_id,
                    type=NotificationType.FINE_GENERATED,
                    title="Overdue Fine Applied",
                    message=f"Book '{book.title}' was returned {days_overdue} days late. Fine of ${fine_amount} applied."
                ))

        # 2. Push to Recently Returned Stack (DSA Stack feature)
        book_info = {
            "id": book.id,
            "title": book.title,
            "author": book.author.name if book.author else "",
            "returned_at": now.strftime("%Y-%m-%d %H:%M:%S")
        }
        dsa_engine.record_book_return(book_info)

        # 3. Smart FIFO Queue Reservation Processing
        allocated_reservation = None
        next_res = db.query(Reservation).filter(
            Reservation.book_id == book.id,
            Reservation.status == ReservationStatus.PENDING
        ).order_by(Reservation.priority_score.desc(), Reservation.created_at.asc()).first()

        if next_res:
            allocated_reservation = next_res
            next_res.status = ReservationStatus.READY
            next_res.ready_until = now + timedelta(hours=settings.RESERVATION_HOLD_HOURS)
            book.available_copies -= 1
            book.reserved_copies += 1

            # Dequeue from DSA FIFO queue
            book_q = dsa_engine.get_or_create_book_queue(book.id)
            book_q.dequeue()

            # Notify the reserving student
            db.add(Notification(
                user_id=next_res.user_id,
                type=NotificationType.RESERVATION_READY,
                title="Reserved Book Ready for Pickup!",
                message=f"'{book.title}' is now held for you until {next_res.ready_until.strftime('%Y-%m-%d %H:%M')}. Please collect it."
            ))

        # Audit Log
        db.add(AuditLog(
            user_id=loan.user_id,
            action="RETURN_BOOK",
            entity="Loan",
            entity_id=loan.id,
            details=f"Returned book '{book.title}' (Loan #{loan.id})"
        ))

        # Push to Undo Stack
        dsa_engine.push_undo(UndoCommand(
            action_type="RETURN_BOOK",
            entity="Loan",
            entity_id=loan.id,
            payload={"loan_id": loan.id, "book_id": book.id, "copy_id": copy.id if copy else None},
            description=f"Undo return of '{book.title}' by User #{loan.user_id}"
        ))

        db.commit()
        db.refresh(loan)
        return loan, fine_record, allocated_reservation
