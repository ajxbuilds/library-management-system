from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.services.recommendation_service import RecommendationService
from app.api.deps import get_current_user

router = APIRouter(prefix="/recommendations", tags=["Recommendation Engine"])

@router.get("")
def get_user_recommendations(
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns personalized book recommendations using:
    1. Content-based filtering (Category, author, topic affinity)
    2. User reading history
    3. Heterogeneous Knowledge Graph path ranking (degree 2 & 3 BFS walks)
    """
    recs = RecommendationService.get_recommendations_for_user(user_id=current_user.id, db=db, limit=limit)
    return {
        "user_id": current_user.id,
        "recommendations": recs,
        "algorithm": "Hybrid (Content-based + User History + Graph Neighborhood Scoring)",
        "total": len(recs)
    }
