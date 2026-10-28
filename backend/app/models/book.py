import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database.session import Base

class CopyStatus(str, enum.Enum):
    AVAILABLE = "available"
    ISSUED = "issued"
    RESERVED = "reserved"
    MAINTENANCE = "maintenance"
    LOST = "lost"

class Author(Base):
    __tablename__ = "authors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    bio = Column(Text, nullable=True)

    books = relationship("Book", back_populates="author")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)

    books = relationship("Book", back_populates="category")

class Publisher(Base):
    __tablename__ = "publishers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)

    books = relationship("Book", back_populates="publisher")

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    isbn = Column(String(32), unique=True, index=True, nullable=False)
    title = Column(String(255), index=True, nullable=False)
    author_id = Column(Integer, ForeignKey("authors.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    publisher_id = Column(Integer, ForeignKey("publishers.id"), nullable=True)
    publication_year = Column(Integer, index=True, nullable=False)
    edition = Column(String(50), nullable=True, default="1st")
    description = Column(Text, nullable=True)
    keywords = Column(String(500), nullable=True)  # comma separated
    cover_image = Column(String(500), nullable=True)

    # Inventory counts
    total_copies = Column(Integer, default=5, nullable=False)
    available_copies = Column(Integer, default=5, nullable=False)
    issued_copies = Column(Integer, default=0, nullable=False)
    reserved_copies = Column(Integer, default=0, nullable=False)
    damaged_copies = Column(Integer, default=0, nullable=False)
    lost_copies = Column(Integer, default=0, nullable=False)

    # Metrics
    borrow_count = Column(Integer, default=0, index=True)
    average_rating = Column(Float, default=4.5, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    author = relationship("Author", back_populates="books")
    category = relationship("Category", back_populates="books")
    publisher = relationship("Publisher", back_populates="books")
    copies = relationship("BookCopy", back_populates="book", cascade="all, delete-orphan")
    loans = relationship("Loan", back_populates="book", cascade="all, delete-orphan")
    reservations = relationship("Reservation", back_populates="book", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="book", cascade="all, delete-orphan")

class BookCopy(Base):
    __tablename__ = "book_copies"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False, index=True)
    barcode = Column(String(64), unique=True, index=True, nullable=False)
    status = Column(Enum(CopyStatus), default=CopyStatus.AVAILABLE, nullable=False)
    shelf_location = Column(String(50), nullable=True, default="Section A-1")

    book = relationship("Book", back_populates="copies")
    loans = relationship("Loan", back_populates="book_copy")
