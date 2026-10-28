from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.fine import Fine, FineStatus
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.models.notification import Notification, NotificationType
from app.schemas.fine import FineOut, FineWaiveRequest
from app.api.deps import get_current_user, require_role

from app.algorithms.engine import dsa_engine
from app.algorithms.heaps.priority_queue import MinHeapPriorityQueue

router = APIRouter(prefix="/fines", tags=["Fines & Penalties"])

@router.get("", response_model=List[FineOut])
def get_all_fines(
    sort_by_heap: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    all_fines = db.query(Fine).all()

    if sort_by_heap:
        # Priority ranking via Min-Heap: highest days overdue and largest amount surface first
        pending_fines = [f for f in all_fines if f.status == FineStatus.PENDING]
        other_fines = [f for f in all_fines if f.status != FineStatus.PENDING]
        other_fines.sort(key=lambda x: x.created_at, reverse=True)

        heap = MinHeapPriorityQueue()
        for f in pending_fines:
            heap.push((-f.days_overdue, -f.amount, f.id), f)
        sorted_pending = heap.to_sorted_list()
        fines = sorted_pending + other_fines
    else:
        fines = sorted(all_fines, key=lambda x: x.created_at, reverse=True)

    results = []
    for f in fines:
        results.append(FineOut(
            id=f.id,
            user_id=f.user_id,
            loan_id=f.loan_id,
            amount=f.amount,
            days_overdue=f.days_overdue,
            status=f.status,
            paid_at=f.paid_at,
            waived_by=f.waived_by,
            waived_reason=f.waived_reason,
            created_at=f.created_at,
            book_title=f.loan.book.title if f.loan and f.loan.book else "Unknown",
            user_name=f.user.full_name if f.user else "Unknown"
        ))
    return results

@router.get("/heap")
def get_fines_heap(db: Session = Depends(get_db)):
    """
    Returns real-time binary Min-Heap representation of overdue fines.
    Demonstrates O(log n) urgency ranking (most days overdue and highest penalty at root).
    """
    if dsa_engine.overdue_heap.is_empty():
        pending = db.query(Fine).filter(Fine.status == FineStatus.PENDING).all()
        for f in pending:
            dsa_engine.overdue_heap.push(
                (-f.days_overdue, -f.amount, f.id),
                {
                    "fine_id": f.id,
                    "user_id": f.user_id,
                    "loan_id": f.loan_id,
                    "amount": f.amount,
                    "days_overdue": f.days_overdue,
                    "status": f.status.value,
                    "created_at": f.created_at.isoformat() if f.created_at else None,
                    "user_name": f.user.full_name if f.user else f"User #{f.user_id}",
                    "book_title": f.loan.book.title if (f.loan and f.loan.book) else "Unknown"
                }
            )

    items = dsa_engine.overdue_heap.to_sorted_list()
    root = dsa_engine.overdue_heap.peek()
    return {
        "algorithm": "Binary Min-Heap Priority Queue",
        "complexity": {
            "insertion": "O(log n)",
            "extract_min": "O(log n)",
            "peek": "O(1)"
        },
        "heap_size": dsa_engine.overdue_heap.size(),
        "most_urgent_fine": root,
        "ranked_fines": items
    }

@router.get("/my", response_model=List[FineOut])
def get_my_fines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    fines = db.query(Fine).filter(Fine.user_id == current_user.id).order_by(Fine.created_at.desc()).all()
    results = []
    for f in fines:
        results.append(FineOut(
            id=f.id,
            user_id=f.user_id,
            loan_id=f.loan_id,
            amount=f.amount,
            days_overdue=f.days_overdue,
            status=f.status,
            paid_at=f.paid_at,
            waived_by=f.waived_by,
            waived_reason=f.waived_reason,
            created_at=f.created_at,
            book_title=f.loan.book.title if f.loan and f.loan.book else "Unknown",
            user_name=current_user.full_name
        ))
    return results

@router.post("/{fine_id}/pay")
def pay_fine(
    fine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    fine = db.query(Fine).filter(Fine.id == fine_id).first()
    if not fine or fine.status == FineStatus.PAID:
        raise HTTPException(status_code=400, detail="Fine not found or already paid")

    fine.status = FineStatus.PAID
    fine.paid_at = datetime.utcnow()

    db.add(AuditLog(
        user_id=current_user.id,
        action="FINE_PAID",
        entity="Fine",
        entity_id=fine.id,
        details=f"Fine of ${fine.amount} paid by {current_user.username}"
    ))
    db.commit()

    # Re-sync in-memory Min-Heap
    dsa_engine.overdue_heap.clear()
    for f in db.query(Fine).filter(Fine.status == FineStatus.PENDING).all():
        dsa_engine.overdue_heap.push(
            (-f.days_overdue, -f.amount, f.id),
            {
                "fine_id": f.id,
                "user_id": f.user_id,
                "loan_id": f.loan_id,
                "amount": f.amount,
                "days_overdue": f.days_overdue,
                "status": f.status.value,
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "user_name": f.user.full_name if f.user else f"User #{f.user_id}",
                "book_title": f.loan.book.title if (f.loan and f.loan.book) else "Unknown"
            }
        )

    return {"success": True, "message": f"Fine of ${fine.amount} settled successfully."}

@router.post("/waive")
def waive_fine(
    req: FineWaiveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.LIBRARIAN]))
):
    fine = db.query(Fine).filter(Fine.id == req.fine_id).first()
    if not fine or fine.status != FineStatus.PENDING:
        raise HTTPException(status_code=400, detail="Fine not found or not in pending status")

    fine.status = FineStatus.WAIVED
    fine.waived_by = current_user.username
    fine.waived_reason = req.reason

    db.add(Notification(
        user_id=fine.user_id,
        type=NotificationType.FINE_WAIVED,
        title="Fine Waived",
        message=f"Your overdue fine of ${fine.amount} has been waived by {current_user.username}. Reason: {req.reason}"
    ))

    db.add(AuditLog(
        user_id=current_user.id,
        action="FINE_WAIVED",
        entity="Fine",
        entity_id=fine.id,
        details=f"Fine #{fine.id} of ${fine.amount} waived. Reason: {req.reason}"
    ))
    db.commit()

    # Re-sync in-memory Min-Heap
    dsa_engine.overdue_heap.clear()
    for f in db.query(Fine).filter(Fine.status == FineStatus.PENDING).all():
        dsa_engine.overdue_heap.push(
            (-f.days_overdue, -f.amount, f.id),
            {
                "fine_id": f.id,
                "user_id": f.user_id,
                "loan_id": f.loan_id,
                "amount": f.amount,
                "days_overdue": f.days_overdue,
                "status": f.status.value,
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "user_name": f.user.full_name if f.user else f"User #{f.user_id}",
                "book_title": f.loan.book.title if (f.loan and f.loan.book) else "Unknown"
            }
        )

    return {"success": True, "message": f"Fine #{fine.id} waived successfully."}
