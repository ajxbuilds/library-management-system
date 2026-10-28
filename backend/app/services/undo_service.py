from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.algorithms.engine import dsa_engine
from app.models.book import Book, BookCopy, CopyStatus
from app.models.loan import Loan, LoanStatus
from app.models.fine import Fine, FineStatus
from app.models.audit import AuditLog

class UndoService:
    @staticmethod
    def undo_last_operation(db: Session, admin_user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Pops the last reversible operation from the LIFO Undo Stack and restores previous state.
        Demonstrates practical use of DSA Stack for system state rollback.
        """
        command = dsa_engine.pop_undo()
        if not command:
            raise HTTPException(status_code=400, detail="Undo stack is empty. No operations to revert.")

        action = command.action_type
        payload = command.payload
        reverted_description = command.description

        if action == "ISSUE_BOOK":
            loan_id = payload.get("loan_id")
            book_id = payload.get("book_id")
            copy_id = payload.get("copy_id")

            loan = db.query(Loan).filter(Loan.id == loan_id).first()
            book = db.query(Book).filter(Book.id == book_id).first()
            copy = db.query(BookCopy).filter(BookCopy.id == copy_id).first() if copy_id else None

            if loan:
                db.delete(loan)
            if copy:
                copy.status = CopyStatus.AVAILABLE
            if book:
                book.available_copies += 1
                book.issued_copies = max(0, book.issued_copies - 1)
                book.borrow_count = max(0, book.borrow_count - 1)

        elif action == "RETURN_BOOK":
            loan_id = payload.get("loan_id")
            book_id = payload.get("book_id")
            copy_id = payload.get("copy_id")

            loan = db.query(Loan).filter(Loan.id == loan_id).first()
            book = db.query(Book).filter(Book.id == book_id).first()
            copy = db.query(BookCopy).filter(BookCopy.id == copy_id).first() if copy_id else None

            if loan:
                loan.status = LoanStatus.ACTIVE
                loan.return_date = None
            if copy:
                copy.status = CopyStatus.ISSUED
            if book:
                book.available_copies = max(0, book.available_copies - 1)
                book.issued_copies += 1

        elif action == "DELETE_BOOK":
            book_dict = payload.get("book_dict")
            if book_dict:
                restored = Book(**book_dict)
                db.add(restored)
                db.flush()
                dsa_engine.index_book(book_dict)

        # Record undo in Audit Log
        db.add(AuditLog(
            user_id=admin_user_id,
            action="UNDO_OPERATION",
            entity=command.entity,
            entity_id=command.entity_id,
            details=f"Reverted operation: {command.description}"
        ))

        db.commit()

        return {
            "success": True,
            "reverted_command_id": command.id,
            "action_type": action,
            "message": f"Successfully reverted: {reverted_description}",
            "remaining_stack_size": dsa_engine.undo_stack.size()
        }
