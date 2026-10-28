from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.book import Book
from app.models.loan import Loan
from app.algorithms.engine import dsa_engine
from app.core.cache import cache

class RecommendationService:
    @staticmethod
    def get_recommendations_for_user(user_id: int, db: Session, limit: int = 8) -> List[Dict[str, Any]]:
        cache_key = f"user:recs:{user_id}:{limit}"
        cached = cache.get_json(cache_key)
        if cached:
            return cached

        # 1. Fetch user's borrowing history
        user_loans = db.query(Loan).filter(Loan.user_id == user_id).all()
        borrowed_book_ids = {loan.book_id for loan in user_loans}

        # 2. Graph-based recommendations
        graph_recs = dsa_engine.graph.get_graph_recommendations(str(user_id), limit=limit)
        graph_rec_map = {r["id"]: r for r in graph_recs}

        # 3. Content-based and category affinity
        favorite_categories = {}
        favorite_authors = {}
        for loan in user_loans:
            if loan.book:
                cat_id = loan.book.category_id
                auth_id = loan.book.author_id
                favorite_categories[cat_id] = favorite_categories.get(cat_id, 0) + 1
                favorite_authors[auth_id] = favorite_authors.get(auth_id, 0) + 1

        all_books = db.query(Book).all()
        scored_books = []

        for b in all_books:
            if b.id in borrowed_book_ids:
                continue

            score = 0.0
            reasons = []

            # Graph contribution
            if b.id in graph_rec_map:
                g_score = graph_rec_map[b.id].get("recommendation_score", 0.0)
                score += g_score * 1.5
                reasons.append(f"Knowledge Graph Path (+{round(g_score * 1.5, 1)})")

            # Category affinity
            cat_affinity = favorite_categories.get(b.category_id, 0)
            if cat_affinity > 0:
                score += cat_affinity * 10.0
                reasons.append(f"Frequent Category: {b.category.name if b.category else ''}")

            # Author affinity
            auth_affinity = favorite_authors.get(b.author_id, 0)
            if auth_affinity > 0:
                score += auth_affinity * 12.0
                reasons.append(f"Favorite Author: {b.author.name if b.author else ''}")

            # Baseline popularity & rating
            score += (b.borrow_count or 0) * 0.5 + (b.average_rating or 4.0) * 2.0

            if score > 0:
                scored_books.append({
                    "id": b.id,
                    "isbn": b.isbn,
                    "title": b.title,
                    "author_name": b.author.name if b.author else "Unknown",
                    "category_name": b.category.name if b.category else "General",
                    "publication_year": b.publication_year,
                    "available_copies": b.available_copies,
                    "average_rating": b.average_rating,
                    "borrow_count": b.borrow_count,
                    "cover_image": b.cover_image,
                    "recommendation_score": round(score, 1),
                    "reasons": reasons or ["Popular Community Read"]
                })

        # Sort by final score
        scored_books.sort(key=lambda x: x["recommendation_score"], reverse=True)
        final_recs = scored_books[:limit]

        cache.set_json(cache_key, final_recs, ex=120)
        return final_recs
