import time
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.book import Book
from app.algorithms.engine import dsa_engine
from app.core.cache import cache

class SearchService:
    """
    Intelligent Multi-Level Ranked Search Engine.
    Ranking Factors:
    1. Exact title match (100)
    2. Prefix match via Trie (60)
    3. Author match (40)
    4. Category match (30)
    5. Keyword/description match (20)
    6. Availability boost (+15)
    7. Popularity score (borrow_count * 2)
    8. User rating (rating * 5)
    """

    @staticmethod
    def search_books(query: str, db: Session, limit: int = 20) -> Dict[str, Any]:
        start_time = time.perf_counter_ns()
        clean_q = query.strip().lower()

        if not clean_q:
            return {"query": query, "total_results": 0, "results": [], "time_ms": 0.0, "source": "empty"}

        # 1. Check Redis / In-memory cache
        cache_key = f"search:ranked:{clean_q}:{limit}"
        cached = cache.get_json(cache_key)
        if cached:
            elapsed_ms = (time.perf_counter_ns() - start_time) / 1_000_000.0
            cached["time_ms"] = round(elapsed_ms, 2)
            cached["source"] = f"Cache Hit ({cache.get_info().get('type')})"
            return cached

        # 2. Check O(1) ISBN lookup if query resembles ISBN
        isbn_book = dsa_engine.isbn_index.get(clean_q.upper()) or dsa_engine.isbn_index.get(clean_q)
        if isbn_book:
            elapsed_ms = (time.perf_counter_ns() - start_time) / 1_000_000.0
            item = dict(isbn_book)
            item["relevance_score"] = 100.0
            item["match_reasons"] = ["O(1) Exact ISBN Match"]
            return {
                "query": query,
                "total_results": 1,
                "results": [item],
                "time_ms": round(elapsed_ms, 3),
                "source": "O(1) Hash Table Lookup"
            }

        # 3. Trie Autocomplete for prefix boost
        trie_matches, _ = dsa_engine.trie.search_prefix(clean_q, limit=50)
        trie_book_ids = {m["id"] for m in trie_matches if m.get("type") == "book"}

        # 4. Fetch candidate books from DB or AVL
        books = db.query(Book).all()
        scored_results: List[Dict[str, Any]] = []

        for b in books:
            score = 0.0
            reasons = []

            title_l = b.title.lower()
            author_l = (b.author.name.lower()) if b.author else ""
            cat_l = (b.category.name.lower()) if b.category else ""
            desc_l = (b.description.lower()) if b.description else ""
            kw_l = (b.keywords.lower()) if b.keywords else ""

            # Exact title match
            if clean_q == title_l:
                score += 100.0
                reasons.append("Exact Title Match (+100)")
            elif title_l.startswith(clean_q):
                score += 70.0
                reasons.append("Title Prefix Match (+70)")
            elif clean_q in title_l:
                score += 50.0
                reasons.append("Title Substring Match (+50)")

            # Trie prefix match
            if b.id in trie_book_ids and "Title Prefix Match (+70)" not in reasons:
                score += 40.0
                reasons.append("Trie Index Match (+40)")

            # Author match
            if clean_q in author_l:
                score += 45.0
                reasons.append("Author Match (+45)")

            # Category match
            if clean_q in cat_l:
                score += 35.0
                reasons.append("Category Match (+35)")

            # Keyword / Description match
            if clean_q in kw_l:
                score += 25.0
                reasons.append("Keyword Match (+25)")
            elif clean_q in desc_l:
                score += 15.0
                reasons.append("Description Match (+15)")

            # Only include if there is any text relevance
            if score > 0:
                # Availability boost
                if b.available_copies > 0:
                    score += 15.0
                    reasons.append(f"In Stock ({b.available_copies} avail) (+15)")

                # Popularity and rating boosts
                pop_boost = min(20.0, (b.borrow_count or 0) * 1.5)
                rating_boost = (b.average_rating or 4.0) * 3.0
                score += pop_boost + rating_boost

                b_dict = {
                    "id": b.id,
                    "isbn": b.isbn,
                    "title": b.title,
                    "author_id": b.author_id,
                    "author_name": b.author.name if b.author else "Unknown",
                    "category_id": b.category_id,
                    "category_name": b.category.name if b.category else "General",
                    "publisher_name": b.publisher.name if b.publisher else None,
                    "publication_year": b.publication_year,
                    "edition": b.edition,
                    "description": b.description,
                    "cover_image": b.cover_image,
                    "total_copies": b.total_copies,
                    "available_copies": b.available_copies,
                    "issued_copies": b.issued_copies,
                    "reserved_copies": b.reserved_copies,
                    "borrow_count": b.borrow_count,
                    "average_rating": b.average_rating,
                    "created_at": b.created_at.isoformat() if b.created_at else None,
                    "relevance_score": round(score, 1),
                    "match_reasons": reasons
                }
                scored_results.append(b_dict)

        scored_results.sort(key=lambda x: x["relevance_score"], reverse=True)
        top_results = scored_results[:limit]
        elapsed_ms = (time.perf_counter_ns() - start_time) / 1_000_000.0

        response = {
            "query": query,
            "total_results": len(scored_results),
            "results": top_results,
            "time_ms": round(elapsed_ms, 2),
            "source": "DSA Multi-Factor Engine"
        }

        # Cache query for 60 seconds
        cache.set_json(cache_key, response, ex=60)
        return response
