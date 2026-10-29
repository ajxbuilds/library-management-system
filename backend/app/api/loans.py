from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.loan import Loan, LoanStatus
from app.models.user import User, UserRole
from app.models.reservation import Reservation, ReservationStatus
from app.models.fine import Fine, FineStatus
from app.models.book import Book, BookCopy, CopyStatus
from app.algorithms.engine import dsa_engine
from app.seed.seeder import sync_dsa_engine
from app.core.cache import cache
from app.schemas.loan import LoanIssueRequest, LoanReturnRequest, LoanOut
from app.services.loan_service import LoanService
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/loans", tags=["Loans & Issue System"])

@router.post("/issue")
def issue_book(
    req: LoanIssueRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user_id = req.user_id
    loan_days = req.loan_days or 14

    # If student, ensure they can only issue books for themselves
    if current_user.role == UserRole.STUDENT:
        if target_user_id and target_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Students can only borrow books for themselves."
            )
        target_user_id = current_user.id
        loan_days = min(loan_days, 14)
    else:
        if not target_user_id:
            target_user_id = current_user.id

    loan = LoanService.issue_book(user_id=target_user_id, book_id=req.book_id, db=db, loan_days=loan_days)
    return {
        "success": True,
        "message": f"Book issued successfully. Due on {loan.due_date.strftime('%Y-%m-%d')}.",
        "loan_id": loan.id,
        "due_date": loan.due_date
    }

@router.post("/return")
def return_book(
    req: LoanReturnRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    loan_record = db.query(Loan).filter(Loan.id == req.loan_id).first()
    if not loan_record:
        raise HTTPException(status_code=404, detail="Loan record not found.")

    if current_user.role == UserRole.STUDENT and loan_record.user_id != current_user.id and not req.desk_mode:
        raise HTTPException(
            status_code=403,
            detail="Students can only return their own borrowed books."
        )

    loan, fine, res = LoanService.return_book(loan_id=req.loan_id, db=db)
    response = {
        "success": True,
        "message": "Book returned successfully and added to Recently Returned Stack.",
        "loan_id": loan.id,
        "fine_applied": fine.amount if fine else 0.0,
        "reservation_triggered": res is not None
    }
    if res:
        response["reservation_note"] = f"Held for next student (User #{res.user_id}) until {res.ready_until.strftime('%Y-%m-%d %H:%M')}"
    return response

@router.get("/active", response_model=List[LoanOut])
def get_active_loans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    loans = db.query(Loan).filter(Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.OVERDUE])).order_by(Loan.due_date.asc()).all()
    results = []
    for l in loans:
        results.append(LoanOut(
            id=l.id,
            user_id=l.user_id,
            book_id=l.book_id,
            book_copy_id=l.book_copy_id,
            issue_date=l.issue_date,
            due_date=l.due_date,
            return_date=l.return_date,
            status=l.status,
            renewal_count=l.renewal_count,
            book_title=l.book.title if l.book else "Unknown",
            user_name=l.user.full_name if l.user else "Unknown"
        ))
    return results


@router.get("/my", response_model=List[LoanOut])
def get_my_loans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    loans = db.query(Loan).filter(Loan.user_id == current_user.id).order_by(Loan.issue_date.desc()).all()
    results = []
    for l in loans:
        fine_amt = l.fine.amount if l.fine else 0.0
        results.append(LoanOut(
            id=l.id,
            user_id=l.user_id,
            book_id=l.book_id,
            book_copy_id=l.book_copy_id,
            issue_date=l.issue_date,
            due_date=l.due_date,
            return_date=l.return_date,
            status=l.status,
            renewal_count=l.renewal_count,
            book_title=l.book.title if l.book else "Unknown",
            user_name=current_user.full_name,
            fine_amount=fine_amt
        ))
    return results


@router.get("/user/{user_id}", response_model=List[LoanOut])
def get_user_loans(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.LIBRARIAN]))
):
    loans = db.query(Loan).filter(Loan.user_id == user_id).order_by(Loan.issue_date.desc()).all()
    results = []
    for l in loans:
        fine_amt = l.fine.amount if l.fine else 0.0
        results.append(LoanOut(
            id=l.id,
            user_id=l.user_id,
            book_id=l.book_id,
            book_copy_id=l.book_copy_id,
            issue_date=l.issue_date,
            due_date=l.due_date,
            return_date=l.return_date,
            status=l.status,
            renewal_count=l.renewal_count,
            book_title=l.book.title if l.book else "Unknown",
            user_name=l.user.full_name if l.user else "Unknown",
            fine_amount=fine_amt
        ))
    return results


@router.post("/demo-seed")
def seed_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Seeds a rich, realistic demonstration state for professor presentations:
    1. Active loans across student and faculty members.
    2. Overdue loans with pending fines to populate the Overdue Min-Heap.
    3. Multi-person FIFO waiting queue on Book #5 (Clean Code) and Book #1 (CLRS).
    4. Synchronizes in-memory DSA engines (FIFO queues, Priority Min-Heap, Hash tables).
    """
    db.query(Fine).delete()
    db.query(Reservation).delete()
    db.query(Loan).delete()

    books = db.query(Book).all()
    for b in books:
        b.issued_copies = 0
        b.reserved_copies = 0
        b.available_copies = b.total_copies
    db.query(BookCopy).update({'status': CopyStatus.AVAILABLE})
    db.commit()

    dsa_engine.book_queues.clear()
    dsa_engine.overdue_heap.clear()
    dsa_engine.undo_stack.clear()
    dsa_engine.recently_returned.clear()

    now = datetime.utcnow()

    # 1. Create Active Loans (Users 4, 5, 6, 7 so demo student User 3 can freely borrow Book 2)
    active_configs = [
        (4, 3, now - timedelta(days=2), now + timedelta(days=12)),
        (5, 4, now - timedelta(days=5), now + timedelta(days=9)),
        (6, 7, now - timedelta(days=1), now + timedelta(days=13)),
        (7, 8, now - timedelta(days=3), now + timedelta(days=11)),
    ]

    for uid, bid, iss_d, due_d in active_configs:
        book = db.query(Book).filter(Book.id == bid).first()
        copy = db.query(BookCopy).filter(BookCopy.book_id == bid, BookCopy.status == CopyStatus.AVAILABLE).first()
        if book and copy:
            copy.status = CopyStatus.ISSUED
            book.issued_copies += 1
            book.available_copies = max(0, book.available_copies - 1)
            loan = Loan(
                user_id=uid,
                book_id=bid,
                book_copy_id=copy.id,
                issue_date=iss_d,
                due_date=due_d,
                status=LoanStatus.ACTIVE
            )
            db.add(loan)

    # 2. Create Overdue Loans with Fines (Populates Binary Min-Heap Priority Queue)
    overdue_configs = [
        (8, 1, now - timedelta(days=26), now - timedelta(days=12), 12.0, 12),
        (9, 6, now - timedelta(days=19), now - timedelta(days=5), 5.0, 5),
    ]

    for uid, bid, iss_d, due_d, fine_amt, days_od in overdue_configs:
        book = db.query(Book).filter(Book.id == bid).first()
        copy = db.query(BookCopy).filter(BookCopy.book_id == bid, BookCopy.status == CopyStatus.AVAILABLE).first()
        if book and copy:
            copy.status = CopyStatus.ISSUED
            book.issued_copies += 1
            book.available_copies = max(0, book.available_copies - 1)
            loan = Loan(
                user_id=uid,
                book_id=bid,
                book_copy_id=copy.id,
                issue_date=iss_d,
                due_date=due_d,
                status=LoanStatus.OVERDUE
            )
            db.add(loan)
            db.flush()

            fine = Fine(
                loan_id=loan.id,
                user_id=uid,
                amount=fine_amt,
                days_overdue=days_od,
                status=FineStatus.PENDING
            )
            db.add(fine)
            db.flush()

            user_obj = db.query(User).filter(User.id == uid).first()
            dsa_engine.overdue_heap.push(
                priority=(-days_od, -fine_amt),
                data={
                    "fine_id": fine.id,
                    "loan_id": loan.id,
                    "user_id": uid,
                    "user_name": user_obj.full_name if user_obj else f"User #{uid}",
                    "book_id": bid,
                    "book_title": book.title,
                    "days_overdue": days_od,
                    "amount": fine_amt,
                    "status": "pending",
                    "due_date": due_d.isoformat()
                }
            )

    # 3. Create FIFO Waiting Queue Holds on Book #5 ("Clean Code")
    clean_code = db.query(Book).filter(Book.id == 5).first()
    if clean_code:
        clean_code.available_copies = 0
        clean_code.reserved_copies = 3

        queue_users = [
            (3, "Demo Scholar", now - timedelta(hours=3)),
            (4, "Haruto Gupta", now - timedelta(hours=2)),
            (5, "Chloe Johnson", now - timedelta(hours=1))
        ]
        q = dsa_engine.get_or_create_book_queue(5)
        for pos, (uid, uname, r_time) in enumerate(queue_users, start=1):
            res = Reservation(
                user_id=uid,
                book_id=5,
                queue_position=pos,
                priority_score=1.0,
                status=ReservationStatus.PENDING,
                created_at=r_time
            )
            db.add(res)
            db.flush()
            q.enqueue({
                "reservation_id": res.id,
                "user_id": uid,
                "user_name": uname,
                "book_id": 5,
                "book_title": clean_code.title,
                "created_at": r_time.isoformat(),
                "reserved_at": r_time.isoformat(),
                "queue_position": pos
            })

    # Queue hold on Book #1
    clrs_book = db.query(Book).filter(Book.id == 1).first()
    if clrs_book:
        q1 = dsa_engine.get_or_create_book_queue(1)
        res1 = Reservation(
            user_id=4,
            book_id=1,
            queue_position=1,
            priority_score=1.0,
            status=ReservationStatus.PENDING,
            created_at=now - timedelta(hours=1)
        )
        db.add(res1)
        db.flush()
        q1.enqueue({
            "reservation_id": res1.id,
            "user_id": 4,
            "user_name": "Haruto Gupta",
            "book_id": 1,
            "book_title": clrs_book.title,
            "created_at": (now - timedelta(hours=1)).isoformat(),
            "reserved_at": (now - timedelta(hours=1)).isoformat(),
            "queue_position": 1
        })

    db.commit()
    sync_dsa_engine(db)
    cache.flush()

    return {
        "success": True,
        "message": "Demo circulation dataset loaded! 4 Active Loans, 2 Overdue Fines in Min-Heap, and FIFO Waiting Queues active.",
        "active_loans": db.query(Loan).filter(Loan.status == LoanStatus.ACTIVE).count(),
        "overdue_loans": db.query(Loan).filter(Loan.status == LoanStatus.OVERDUE).count(),
        "pending_fines": db.query(Fine).filter(Fine.status == FineStatus.PENDING).count(),
        "active_queues": len(dsa_engine.book_queues)
    }


@router.post("/demo-clear")
def clear_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clears all circulation loans, reservations, fines and resets copies to full available."""
    db.query(Fine).delete()
    db.query(Reservation).delete()
    db.query(Loan).delete()

    books = db.query(Book).all()
    for b in books:
        b.issued_copies = 0
        b.reserved_copies = 0
        b.available_copies = b.total_copies
    db.query(BookCopy).update({'status': CopyStatus.AVAILABLE})
    db.commit()

    dsa_engine.book_queues.clear()
    dsa_engine.overdue_heap.clear()
    dsa_engine.undo_stack.clear()
    dsa_engine.recently_returned.clear()
    sync_dsa_engine(db)
    cache.flush()

    return {
        "success": True,
        "message": "All circulation data, queues, and fines have been cleared successfully."
    }
