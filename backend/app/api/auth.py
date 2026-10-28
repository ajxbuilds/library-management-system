from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.schemas.user import UserCreate, UserLogin, Token, UserOut
from app.api.deps import get_current_user
from app.algorithms.engine import dsa_engine

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check duplicate email
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role or UserRole.STUDENT,
        member_tier=user_in.member_tier,
        borrow_limit=user_in.borrow_limit or 4
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Index into DSA Hash Tables & Knowledge Graph
    dsa_engine.index_user({
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role.value
    })

    db.add(AuditLog(
        user_id=user.id,
        action="USER_REGISTERED",
        entity="User",
        entity_id=user.id,
        details=f"User {user.username} registered with role {user.role.value}"
    ))
    db.commit()

    return user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    # Try DSA Hash Table lookup first for O(1) user identification!
    user_dict = dsa_engine.email_index.get(login_data.username_or_email)
    if user_dict:
        user = db.query(User).filter(User.id == user_dict["id"]).first()
    else:
        user = db.query(User).filter(
            (User.username == login_data.username_or_email) | (User.email == login_data.username_or_email)
        ).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive account")

    token = create_access_token(subject=user.id, role=user.role.value)

    db.add(AuditLog(
        user_id=user.id,
        action="LOGIN",
        entity="User",
        entity_id=user.id,
        details=f"User {user.username} logged in"
    ))
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
