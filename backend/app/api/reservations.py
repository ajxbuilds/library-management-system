from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.reservation import Reservation, ReservationStatus
from app.models.user import User, UserRole
from app.models.book import Book
from app.schemas.reservation import ReservationCreate, ReservationOut
from app.services.reservation_service import ReservationService
from app.algorithms.engine import dsa_engine
from app.api.deps import get_current_user

router = APIRouter(prefix="/reservations", tags=["Reservations Queue"])

@router.post("", response_model=ReservationOut)
def reserve_book(
    req: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ensure students can only reserve for themselves unless librarian/admin
    target_user_id = req.user_id
    if current_user.role == UserRole.STUDENT and current_user.id != target_user_id:
        target_user_id = current_user.id

    res = ReservationService.create_reservation(user_id=target_user_id, book_id=req.book_id, db=db)
    return ReservationOut(
        id=res.id,
        user_id=res.user_id,
        book_id=res.book_id,
        queue_position=res.queue_position,
        priority_score=res.priority_score,
        status=res.status,
        created_at=res.created_at,
        ready_until=res.ready_until,
        book_title=res.book.title if res.book else "Unknown",
        user_name=res.user.full_name if res.user else "Unknown"
    )

@router.get("/my", response_model=List[ReservationOut])
def get_my_reservations(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Reservation).filter(Reservation.user_id == current_user.id)
    if active_only:
        q = q.filter(Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.READY]))
    reservations = q.order_by(Reservation.created_at.desc()).all()

    results = []
    for r in reservations:
        results.append(ReservationOut(
            id=r.id,
            user_id=r.user_id,
            book_id=r.book_id,
            queue_position=r.queue_position,
            priority_score=r.priority_score,
            status=r.status,
            created_at=r.created_at,
            ready_until=r.ready_until,
            book_title=r.book.title if r.book else "Unknown",
            user_name=current_user.full_name
        ))
    return results

@router.post("/reset-my")
def reset_my_reservations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reservations = db.query(Reservation).filter(
        Reservation.user_id == current_user.id,
        Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.READY])
    ).all()
    count = 0
    for r in reservations:
        r.status = ReservationStatus.CANCELLED
        q = dsa_engine.get_or_create_book_queue(r.book_id)
        q.remove_item(lambda item: item.get("reservation_id") == r.id)
        count += 1
    db.commit()
    return {"success": True, "message": f"Successfully reset {count} hold reservations."}

@router.get("/active-queues")
def get_active_queues(db: Session = Depends(get_db)):
    """Returns list of books with active FIFO queues for quick selection."""
    active_book_ids = db.query(Reservation.book_id).filter(
        Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.READY])
    ).distinct().all()
    results = []
    for (b_id,) in active_book_ids:
        b = db.query(Book).filter(Book.id == b_id).first()
        q = dsa_engine.get_or_create_book_queue(b_id)
        if b:
            results.append({
                "book_id": b.id,
                "title": b.title,
                "author": b.author.name if b.author else "",
                "queue_length": q.size()
            })
    return results

@router.get("/book/{book_id}/queue")
def get_book_reservation_queue(book_id: int, db: Session = Depends(get_db)):
    """Returns real-time in-memory FIFO queue representation for a book."""
    q = dsa_engine.get_or_create_book_queue(book_id)
    items = q.to_list()
    formatted = []
    for it in items:
        d = dict(it)
        if "created_at" in d and "reserved_at" not in d:
            d["reserved_at"] = d["created_at"]
        formatted.append(d)

    book = db.query(Book).filter(Book.id == book_id).first()
    book_title = book.title if book else f"Book #{book_id}"

    return {
        "book_id": book_id,
        "book_title": book_title,
        "queue_length": q.size(),
        "fifo_queue_items": formatted,
        "queue_items": formatted,
        "data_structure": "FIFO Queue + Priority Min-Heap"
    }

@router.delete("/{reservation_id}")
def cancel_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if current_user.role == UserRole.STUDENT and res.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")

    res.status = ReservationStatus.CANCELLED
    # Remove from in-memory queue
    q = dsa_engine.get_or_create_book_queue(res.book_id)
    q.remove_item(lambda item: item.get("reservation_id") == res.id)

    db.commit()
    return {"success": True, "message": "Reservation cancelled successfully"}

@router.post("/book/{book_id}/clear")
def clear_book_queue(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clears all pending reservations for this book from DB and in-memory FIFO queue."""
    pending = db.query(Reservation).filter(
        Reservation.book_id == book_id,
        Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.READY])
    ).all()
    count = len(pending)
    for r in pending:
        r.status = ReservationStatus.CANCELLED
    q = dsa_engine.get_or_create_book_queue(book_id)
    while not q.is_empty():
        q.dequeue()
    db.commit()
    return {"success": True, "message": f"Successfully cleared {count} reservations from Book #{book_id} queue."}
