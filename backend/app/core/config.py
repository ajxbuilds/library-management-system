import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

# Absolute path to project root where library.db lives
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
DEFAULT_DB_FILE = (ROOT_DIR / "library.db").as_posix()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Library Management System (DSA Engine)"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Secret Key for JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-dsa-library-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database: Always resolve to project root library.db
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_FILE}")

    # Redis URL: override via REDIS_URL. If unreachable, gracefully fall back to In-Memory thread-safe cache
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Library Business Rules
    MAX_BORROW_LIMIT_STUDENT: int = 4
    MAX_BORROW_LIMIT_FACULTY: int = 8
    DEFAULT_LOAN_DAYS: int = 14
    DAILY_FINE_RATE: float = 2.0  # $2 or ₹2 per day
    RESERVATION_HOLD_HOURS: int = 48  # Time for first in queue to collect

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
