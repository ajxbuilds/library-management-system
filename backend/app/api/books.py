import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.book import Book, Author, Category, Publisher, BookCopy, CopyStatus
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.schemas.book import BookOut, BookCreate, BookUpdate, AuthorOut, CategoryOut
from app.services.search_service import SearchService
from app.algorithms.engine import dsa_engine
from app.algorithms.stacks.stack import UndoCommand
from app.api.deps import get_current_user, require_role
from app.core.cache import cache

router = APIRouter(prefix="/books", tags=["Books & Search Engine"])

@router.get("", response_model=List[BookOut])
def get_books(
    skip: int = 0,
    limit: int = 24,
    category_id: Optional[int] = None,
    sort_by: Optional[str] = "id",
    db: Session = Depends(get_db)
):
    query = db.query(Book)
    if category_id:
        query = query.filter(Book.category_id == category_id)

    if sort_by == "rating":
        query = query.order_by(Book.average_rating.desc())
    elif sort_by == "popular":
        query = query.order_by(Book.borrow_count.desc())
    elif sort_by == "year":
        query = query.order_by(Book.publication_year.desc())
    else:
        query = query.order_by(Book.id.asc())

    books = query.offset(skip).limit(limit).all()
    # Populate author_name and category_name
    results = []
    for b in books:
        b_dict = {
            "id": b.id,
            "isbn": b.isbn,
            "title": b.title,
            "author_id": b.author_id,
            "author_name": b.author.name if b.author else "Unknown",
            "category_id": b.category_id,
            "category_name": b.category.name if b.category else "General",
            "publisher_id": b.publisher_id,
            "publisher_name": b.publisher.name if b.publisher else None,
            "publication_year": b.publication_year,
            "edition": b.edition,
            "description": b.description,
            "keywords": b.keywords,
            "cover_image": b.cover_image,
            "total_copies": b.total_copies,
            "available_copies": b.available_copies,
            "issued_copies": b.issued_copies,
            "reserved_copies": b.reserved_copies,
            "borrow_count": b.borrow_count,
            "average_rating": b.average_rating,
            "created_at": b.created_at
        }
        results.append(BookOut(**b_dict))
    return results

@router.get("/search")
def search_books(
    q: str = Query(..., min_length=1),
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Multi-factor Ranked Search utilizing Trie, Hash indexing, and multi-factor ranking."""
    return SearchService.search_books(query=q, db=db, limit=limit)

@router.get("/autocomplete")
def autocomplete(
    prefix: str = Query(..., min_length=1),
    limit: int = 8
):
    """
    Trie-based Autocomplete for Book Titles, Authors, and Categories.
    Demonstrates O(k) prefix tree traversal.
    """
    suggestions, elapsed_us = dsa_engine.trie.search_prefix(prefix, limit=limit)
    return {
        "prefix": prefix,
        "suggestions": suggestions,
        "elapsed_microseconds": round(elapsed_us, 2),
        "complexity": "O(k) where k = prefix length"
    }

@router.get("/avl/range")
def avl_range_query(
    field: str = Query("year", pattern="^(year|rating)$"),
    min_val: float = Query(...),
    max_val: float = Query(...)
):
    """
    AVL Tree Range Query.
    Finds books in range in O(log n + count) time without full table scans.
    """
    if field == "year":
        results, comparisons, elapsed_us = dsa_engine.year_avl.range_query(int(min_val), int(max_val))
    else:
        results, comparisons, elapsed_us = dsa_engine.rating_avl.range_query(float(min_val), float(max_val))

    return {
        "field": field,
        "range": [min_val, max_val],
        "count": len(results),
        "total_found": len(results),
        "comparisons": comparisons,
        "elapsed_microseconds": round(elapsed_us, 2),
        "complexity": "O(log n + k) range query via AVL Tree Subtree Walk",
        "results": results[:60],
        "books": results[:60]
    }

@router.get("/lookup/hash")
def hash_lookup(
    isbn: Optional[str] = None,
    book_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Direct O(1) Hash Table Lookup by ISBN or Book ID.
    Returns comparison metrics and microsecond execution time.
    """
    bucket_idx = None
    capacity = None
    chain_depth = 0

    if isbn:
        clean_isbn = isbn.strip()
        book, comp, elapsed_us = dsa_engine.isbn_index.get_with_metrics(clean_isbn)
        key_used = f"ISBN: {clean_isbn}"
        bucket_idx = dsa_engine.isbn_index._hash(clean_isbn)
        capacity = dsa_engine.isbn_index.capacity
        chain_depth = comp

        if not book:
            normalized = clean_isbn.replace("-", "")
            all_books = db.query(Book).all()
            for b in all_books:
                if b.isbn == clean_isbn or b.isbn.replace("-", "") == normalized:
                    b_dict = {
                        "id": b.id,
                        "isbn": b.isbn,
                        "title": b.title,
                        "author_id": b.author_id,
                        "author_name": b.author.name if b.author else "",
                        "category_id": b.category_id,
                        "category_name": b.category.name if b.category else "",
                        "publication_year": b.publication_year,
                        "available_copies": b.available_copies,
                        "total_copies": b.total_copies,
                        "borrow_count": b.borrow_count,
                        "average_rating": b.average_rating
                    }
                    dsa_engine.index_book(b_dict)
                    book, comp, elapsed_us = dsa_engine.isbn_index.get_with_metrics(b.isbn)
                    key_used = f"ISBN: {b.isbn}"
                    bucket_idx = dsa_engine.isbn_index._hash(b.isbn)
                    chain_depth = comp
                    break

    elif book_id:
        book, comp, elapsed_us = dsa_engine.book_id_index.get_with_metrics(book_id)
        key_used = f"Book ID: {book_id}"
        bucket_idx = dsa_engine.book_id_index._hash(book_id)
        capacity = dsa_engine.book_id_index.capacity
        chain_depth = comp
    else:
        raise HTTPException(status_code=400, detail="Provide either 'isbn' or 'book_id'")

    return {
        "key": key_used,
        "found": book is not None,
        "book": book,
        "bucket_index": bucket_idx,
        "capacity": capacity,
        "chain_depth": chain_depth,
        "comparisons": comp,
        "elapsed_microseconds": round(elapsed_us, 3),
        "complexity": "O(1) average hash lookup via Polynomial Hash + Separate Chaining"
    }

@router.get("/{book_id}")
def get_book_by_id(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    return {
        "id": book.id,
        "isbn": book.isbn,
        "title": book.title,
        "author_id": book.author_id,
        "author_name": book.author.name if book.author else "Unknown",
        "category_id": book.category_id,
        "category_name": book.category.name if book.category else "General",
        "publisher_name": book.publisher.name if book.publisher else None,
        "publication_year": book.publication_year,
        "edition": book.edition or "1st",
        "description": book.description or "Comprehensive academic reference covering foundational concepts and modern applications.",
        "cover_image": book.cover_image,
        "total_copies": book.total_copies,
        "available_copies": book.available_copies,
        "issued_copies": book.issued_copies,
        "reserved_copies": book.reserved_copies,
        "borrow_count": book.borrow_count,
        "average_rating": book.average_rating,
        "created_at": book.created_at
    }

@router.post("", response_model=BookOut)
def create_book(
    book_in: BookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.LIBRARIAN]))
):
    if db.query(Book).filter(Book.isbn == book_in.isbn).first():
        raise HTTPException(status_code=400, detail="Book with this ISBN already exists")

    book = Book(
        isbn=book_in.isbn,
        title=book_in.title,
        author_id=book_in.author_id,
        category_id=book_in.category_id,
        publisher_id=book_in.publisher_id,
        publication_year=book_in.publication_year,
        edition=book_in.edition,
        description=book_in.description,
        keywords=book_in.keywords,
        cover_image=book_in.cover_image,
        total_copies=book_in.total_copies,
        available_copies=book_in.total_copies,
        issued_copies=0,
        reserved_copies=0
    )
    db.add(book)
    db.commit()
    db.refresh(book)

    # Create physical copies
    for i in range(book.total_copies):
        copy = BookCopy(
            book_id=book.id,
            barcode=f"BC-{book.id}-{i+1:02d}",
            status=CopyStatus.AVAILABLE,
            shelf_location=f"Section {book.category_id or 1}-Shelf {i+1}"
        )
        db.add(copy)
    db.commit()

    # Index into DSA Engine
    book_dict = {
        "id": book.id,
        "isbn": book.isbn,
        "title": book.title,
        "author_id": book.author_id,
        "author_name": book.author.name if book.author else "",
        "category_id": book.category_id,
        "category_name": book.category.name if book.category else "",
        "publication_year": book.publication_year,
        "available_copies": book.available_copies,
        "total_copies": book.total_copies,
        "average_rating": book.average_rating,
        "borrow_count": 0
    }
    dsa_engine.index_book(book_dict)

    # Push to Undo Stack
    dsa_engine.push_undo(UndoCommand(
        action_type="ADD_BOOK",
        entity="Book",
        entity_id=book.id,
        payload={"book_id": book.id},
        description=f"Undo adding book '{book.title}'"
    ))

    # Audit Log
    db.add(AuditLog(
        user_id=current_user.id,
        action="ADD_BOOK",
        entity="Book",
        entity_id=book.id,
        details=f"Book '{book.title}' added by {current_user.username}"
    ))
    db.commit()

    cache.flush()
    return BookOut(**book_dict, created_at=book.created_at)

@router.delete("/{book_id}")
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    book_dict = {
        "id": book.id,
        "isbn": book.isbn,
        "title": book.title,
        "author_id": book.author_id,
        "category_id": book.category_id,
        "publication_year": book.publication_year,
        "total_copies": book.total_copies,
        "available_copies": book.available_copies,
        "borrow_count": book.borrow_count,
        "average_rating": book.average_rating
    }

    # Push to Undo Stack before deleting!
    dsa_engine.push_undo(UndoCommand(
        action_type="DELETE_BOOK",
        entity="Book",
        entity_id=book.id,
        payload={"book_dict": book_dict},
        description=f"Undo deletion of '{book.title}'"
    ))

    # Remove from DSA indices
    dsa_engine.remove_book(book.id, book.isbn)

    db.delete(book)
    db.add(AuditLog(
        user_id=current_user.id,
        action="DELETE_BOOK",
        entity="Book",
        entity_id=book_id,
        details=f"Deleted book '{book_dict['title']}'"
    ))
    db.commit()
    cache.flush()

    return {"success": True, "message": f"Book '{book_dict['title']}' deleted. You can undo this operation."}

@router.get("/meta/authors", response_model=List[AuthorOut])
def get_authors(db: Session = Depends(get_db)):
    return db.query(Author).all()

@router.get("/meta/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()
