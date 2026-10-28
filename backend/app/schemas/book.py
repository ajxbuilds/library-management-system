from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class AuthorOut(BaseModel):
    id: int
    name: str
    bio: Optional[str] = None

    class Config:
        from_attributes = True

class CategoryOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class BookBase(BaseModel):
    isbn: str
    title: str
    author_id: int
    category_id: int
    publisher_id: Optional[int] = None
    publication_year: int
    edition: Optional[str] = "1st"
    description: Optional[str] = None
    keywords: Optional[str] = None
    cover_image: Optional[str] = None
    total_copies: int = 5

class BookCreate(BookBase):
    pass

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author_id: Optional[int] = None
    category_id: Optional[int] = None
    publication_year: Optional[int] = None
    description: Optional[str] = None
    keywords: Optional[str] = None
    total_copies: Optional[int] = None

class BookOut(BookBase):
    id: int
    available_copies: int
    issued_copies: int
    reserved_copies: int
    borrow_count: int
    average_rating: float
    created_at: datetime
    author_name: Optional[str] = None
    category_name: Optional[str] = None
    publisher_name: Optional[str] = None

    class Config:
        from_attributes = True

class SearchResultItem(BookOut):
    relevance_score: float = 0.0
    match_reasons: List[str] = []
    search_strategy: str = "Multi-factor Ranked Search"
