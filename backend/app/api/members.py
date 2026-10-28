from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User, UserRole, MemberTier
from app.schemas.user import UserOut
from app.algorithms.engine import dsa_engine
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/members", tags=["Members Management"])

@router.get("", response_model=List[UserOut])
def get_members(
    skip: int = 0,
    limit: int = 50,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.LIBRARIAN]))
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.offset(skip).limit(limit).all()

@router.get("/{member_id}")
def get_member_by_id(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.LIBRARIAN]))
):
    # O(1) hash lookup check
    cached = dsa_engine.member_id_index.get(member_id)
    if cached:
        return cached

    user = db.query(User).filter(User.id == member_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")
    return UserOut.from_orm(user)
