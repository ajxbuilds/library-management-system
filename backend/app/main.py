import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import engine, SessionLocal, Base
from app.seed.seeder import seed_database, sync_dsa_engine
from app.models.book import Book
from app.algorithms.engine import dsa_engine

# Import routers
from app.api.auth import router as auth_router
from app.api.books import router as books_router
from app.api.loans import router as loans_router
from app.api.reservations import router as reservations_router
from app.api.fines import router as fines_router
from app.api.recommendations import router as recommendations_router
from app.api.analytics import router as analytics_router
from app.api.algorithms import router as algorithms_router
from app.api.notifications import router as notifications_router
from app.api.audit import router as audit_router
from app.api.members import router as members_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure DB schema and DSA Engine sync
    logger.info("Initializing Smart Library System...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        book_count = db.query(Book).count()
        if book_count < 1000:
            logger.info(f"Database has {book_count} books (< 1000). Running complete realistic seeder...")
            seed_database()
        else:
            logger.info(f"Database contains {book_count} books. Hydrating DSA in-memory indices...")
            sync_dsa_engine(db)
    except Exception as e:
        logger.error(f"Error during database startup sync: {e}")
    finally:
        db.close()

    yield
    logger.info("Smart Library backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Advanced Smart Library Management System using Custom Data Structures and Intelligent Algorithms.",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under /api
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(books_router, prefix=settings.API_V1_STR)
app.include_router(loans_router, prefix=settings.API_V1_STR)
app.include_router(reservations_router, prefix=settings.API_V1_STR)
app.include_router(fines_router, prefix=settings.API_V1_STR)
app.include_router(recommendations_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(algorithms_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(members_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "title": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "status": "OPERATIONAL",
        "dsa_engine": "ONLINE",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "dsa_engine_initialized": dsa_engine.initialized,
        "data_structures": dsa_engine.get_stats()
    }
