import random
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.database.session import engine, SessionLocal, Base
from app.models import (
    User, UserRole, MemberTier,
    Author, Category, Publisher,
    Book, BookCopy, CopyStatus,
    Loan, LoanStatus,
    Reservation, ReservationStatus,
    Fine, FineStatus,
    Notification, NotificationType,
    AuditLog, Review
)
from app.core.security import get_password_hash
from app.algorithms.engine import dsa_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seeder")

CATEGORIES_DATA = [
    ("Data Structures & Algorithms", "Core computer science fundamentals, algorithm design, complexity analysis, and optimization."),
    ("Artificial Intelligence & Machine Learning", "Neural networks, deep learning, statistical modeling, and intelligent agents."),
    ("Software Architecture & Engineering", "Design patterns, clean code, distributed systems, and modern paradigms."),
    ("Database Management Systems", "Relational calculus, indexing, B-trees, ACID transactions, and NoSQL."),
    ("Computer Networks & Cybersecurity", "Protocols, cryptography, penetration testing, and network topologies."),
    ("Operating Systems & Systems Programming", "Memory management, virtualization, concurrency, and Linux kernel internals."),
    ("Mathematics & Discrete Structures", "Combinatorics, graph theory, probability, linear algebra, and logic."),
    ("Cloud Computing & DevOps", "Kubernetes, Docker, microservices, CI/CD pipelines, and cloud native architectures.")
]

AUTHORS_DATA = [
    ("Thomas H. Cormen", "Co-author of Introduction to Algorithms (CLRS), professor emeritus of computer science at Dartmouth College."),
    ("Donald E. Knuth", "Legendary computer scientist, mathematician, author of The Art of Computer Programming."),
    ("Robert Sedgewick", "Professor of Computer Science at Princeton University, algorithms specialist."),
    ("Martin Fowler", "Software engineer and author specializing in object-oriented analysis, refactoring, and enterprise architecture."),
    ("Andrew Ng", "Co-founder of Coursera, pioneer in deep learning and machine learning education."),
    ("Stuart Russell", "Professor at UC Berkeley, co-author of Artificial Intelligence: A Modern Approach."),
    ("Ian Goodfellow", "Researcher known for inventing Generative Adversarial Networks (GANs)."),
    ("Abraham Silberschatz", "Author of Database System Concepts and Operating System Concepts."),
    ("Andrew S. Tanenbaum", "Professor emeritus of computer science at Vrije Universiteit Amsterdam, author of Modern Operating Systems."),
    ("Gayle Laakmann McDowell", "Author of Cracking the Coding Interview, software engineer and career coach."),
    ("Erich Gamma", "Software engineer and co-author of the seminal Design Patterns Gang of Four book."),
    ("Joshua Bloch", "Software engineer and author of Effective Java."),
    ("Robert C. Martin", "Uncle Bob, champion of Clean Code and agile software craft."),
    ("Richard Feynman", "Nobel laureate physicist, contributor to quantum computing theory."),
    ("Gilbert Strang", "Professor of Mathematics at MIT, author of Linear Algebra and Its Applications.")
]

PUBLISHERS_DATA = [
    "MIT Press",
    "Addison-Wesley Professional",
    "O'Reilly Media",
    "Prentice Hall",
    "Cambridge University Press",
    "Springer",
    "No Starch Press",
    "Manning Publications"
]

BOOK_TEMPLATES = [
    ("Introduction to Algorithms (CLRS)", 1, 1, 2022, "4th", "Comprehensive foundational guide to algorithms, asymptotics, dynamic programming, and graph theory.", "dsa, algorithms, clrs, dynamic programming, graph theory"),
    ("The Art of Computer Programming, Vol 1: Fundamental Algorithms", 2, 1, 2019, "3rd", "Masterwork on data structures, linear lists, trees, and algorithmic analysis.", "knuth, taocp, algorithms, trees, fundamental"),
    ("The Art of Computer Programming, Vol 3: Sorting and Searching", 2, 1, 2021, "2nd", "Definitive volume covering sorting networks, binary search, and hashing techniques.", "sorting, searching, hashing, binary search, knuth"),
    ("Algorithms, Part I: Graphs and Search", 3, 1, 2020, "4th", "Essential algorithms and data structures implemented in modern object-oriented languages.", "sedgewick, algorithms, graphs, search, priority queues"),
    ("Clean Code: A Handbook of Agile Software Craftsmanship", 13, 3, 2020, "1st", "Best practices for writing readable, maintainable, and elegant software systems.", "clean code, refactoring, agile, best practices"),
    ("Design Patterns: Elements of Reusable Object-Oriented Software", 11, 3, 2021, "2nd", "The classic catalog of 23 creational, structural, and behavioral patterns.", "design patterns, gang of four, gof, architecture"),
    ("Refactoring: Improving the Design of Existing Code", 4, 3, 2019, "2nd", "Step-by-step principles for refactoring code smells and improving maintainability.", "fowler, refactoring, clean architecture, testing"),
    ("Artificial Intelligence: A Modern Approach", 6, 2, 2021, "4th", "The standard textbook in artificial intelligence covering probabilistic reasoning, search, and neural networks.", "ai, modern approach, search, heuristics, russell"),
    ("Deep Learning", 7, 2, 2020, "1st", "Mathematical foundations and applied deep learning from pioneers Goodfellow, Bengio, and Courville.", "deep learning, neural networks, goodfellow, backprop"),
    ("Machine Learning Yearning", 5, 2, 2019, "1st", "Technical strategy and direction for machine learning and AI system deployments.", "andrew ng, machine learning, ml strategy, errors"),
    ("Database System Concepts", 8, 4, 2020, "7th", "Core textbook covering relational models, SQL, indexing, transaction processing, and concurrency.", "database, sql, b-tree, transactions, acid, silberschatz"),
    ("Modern Operating Systems", 9, 6, 2021, "5th", "In-depth treatment of process scheduling, virtualization, memory paging, and storage.", "operating systems, tanenbaum, kernel, paging, concurrency"),
    ("Computer Networks: A Systems Approach", 9, 5, 2022, "6th", "Comprehensive analysis of TCP/IP, OSI layers, routing algorithms, and socket programming.", "networks, tcp, ip, sockets, protocols, tanenbaum"),
    ("Cracking the Coding Interview", 10, 1, 2020, "6th", "189 programming questions and solutions covering trees, heaps, graphs, bit manipulation, and big-O.", "interview, leetcode, coding interview, dsa, mcdowell"),
    ("Effective Java", 12, 3, 2021, "3rd", "Definitive guide to best programming practices, generics, concurrency, and immutability.", "java, effective java, bloch, best practices, collections"),
    ("Introduction to Linear Algebra", 15, 7, 2023, "6th", "Clear explanation of matrix theory, eigenvalues, singular value decomposition (SVD), and vector spaces.", "linear algebra, strang, mit, matrices, eigenvalues")
]

FIRST_NAMES = ["Aarav", "Alex", "Ananya", "Brian", "Chloe", "David", "Elena", "Farhan", "Grace", "Haruto", "Isha", "James", "Kavya", "Liam", "Mei", "Noah", "Olivia", "Priya", "Quinn", "Rahul", "Sophia", "Tariq", "Uma", "Victor", "William", "Xiomara", "Yusuf", "Zoe"]
LAST_NAMES = ["Sharma", "Smith", "Patel", "Johnson", "Verma", "Williams", "Gupta", "Brown", "Rao", "Jones", "Miller", "Davis", "Chen", "Tanaka", "Iyer", "Garcia", "Rodriguez", "Wilson", "Nair", "Taylor", "Anderson", "Thomas", "Kumar", "Lee", "Singh"]

def seed_database():
    """Generates 1,000+ books, 500+ users, authors, categories, loans, reviews, and syncs DSA engine."""
    logger.info("Dropping existing tables and recreating schema...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        if db.query(Book).count() >= 1000:
            logger.info("Database already seeded with 1,000+ books. Syncing in-memory DSA Engine...")
            sync_dsa_engine(db)
            return

        logger.info("Starting fresh seed generation...")

        # 1. Categories
        cat_entities = []
        for name, desc in CATEGORIES_DATA:
            cat = Category(name=name, description=desc)
            db.add(cat)
            cat_entities.append(cat)
        db.flush()

        # 2. Authors
        author_entities = []
        for name, bio in AUTHORS_DATA:
            auth = Author(name=name, bio=bio)
            db.add(auth)
            author_entities.append(auth)
        db.flush()

        # 3. Publishers
        pub_entities = []
        for name in PUBLISHERS_DATA:
            pub = Publisher(name=name)
            db.add(pub)
            pub_entities.append(pub)
        db.flush()

        # 4. Standard Accounts (Admin, Librarian, Demo Student)
        admin_pass = get_password_hash("admin123")
        librarian_pass = get_password_hash("lib123")
        student_pass = get_password_hash("student123")

        admin_user = User(
            email="admin@library.edu",
            username="admin",
            full_name="Chief Administrator",
            hashed_password=admin_pass,
            role=UserRole.ADMIN,
            member_tier=MemberTier.FACULTY,
            borrow_limit=10
        )
        librarian_user = User(
            email="librarian@library.edu",
            username="librarian",
            full_name="Lead Librarian",
            hashed_password=librarian_pass,
            role=UserRole.LIBRARIAN,
            member_tier=MemberTier.FACULTY,
            borrow_limit=8
        )
        demo_student = User(
            email="student@library.edu",
            username="student",
            full_name="Demo Scholar",
            hashed_password=student_pass,
            role=UserRole.STUDENT,
            member_tier=MemberTier.PREMIUM,
            borrow_limit=5
        )
        db.add_all([admin_user, librarian_user, demo_student])
        db.flush()

        user_entities = [admin_user, librarian_user, demo_student]

        # 5. Generate 500+ Realistic Users
        logger.info("Generating 500+ diverse users...")
        used_usernames = {"admin", "librarian", "student"}
        used_emails = {"admin@library.edu", "librarian@library.edu", "student@library.edu"}

        for i in range(1, 510):
            fn = random.choice(FIRST_NAMES)
            ln = random.choice(LAST_NAMES)
            uname = f"{fn.lower()}.{ln.lower()}{i}"
            email = f"{uname}@university.edu"

            tier = random.choices(
                [MemberTier.STANDARD, MemberTier.PREMIUM, MemberTier.FACULTY],
                weights=[0.70, 0.22, 0.08]
            )[0]
            limit = 4 if tier == MemberTier.STANDARD else (6 if tier == MemberTier.PREMIUM else 8)

            user = User(
                email=email,
                username=uname,
                full_name=f"{fn} {ln}",
                hashed_password=student_pass,
                role=UserRole.STUDENT,
                member_tier=tier,
                borrow_limit=limit
            )
            db.add(user)
            user_entities.append(user)

        db.flush()

        # 6. Generate 1,000+ Realistic Books
        logger.info("Generating 1,000+ catalog books with inventory copies...")
        book_entities = []
        isbn_counter = 100000

        # Sub-topics to synthesize 1000+ realistic book titles
        tech_prefixes = [
            "Advanced", "Mastering", "Practical", "Modern", "Comprehensive",
            "Foundational", "Applied", "High-Performance", "Scalable", "Essential",
            "Hands-On", "Algorithmic", "The Definitive Guide to", "Principles of",
            "Deep Dive into", "Designing", "Optimizing", "Understanding", "Full-Stack"
        ]
        tech_topics = [
            ("Data Structures and Algorithms", 1, "dsa, algorithms, time complexity, trees, graphs, heaps"),
            ("Graph Algorithms & Network Flows", 1, "graphs, network flow, shortest path, dijkstra, bfs, dfs"),
            ("Competitive Programming Handbook", 1, "competitive programming, dynamic programming, segment trees"),
            ("Deep Learning Architectures", 2, "deep learning, neural networks, backpropagation, transformers"),
            ("Computer Vision with PyTorch", 2, "computer vision, opencv, cnn, image segmentation"),
            ("Natural Language Processing with Transformers", 2, "nlp, transformers, llm, bert, attention mechanism"),
            ("Reinforcement Learning in Practice", 2, "reinforcement learning, q-learning, policy gradients, markov"),
            ("Microservices Architecture Patterns", 3, "microservices, distributed systems, event-driven, kafka"),
            ("Domain-Driven Design and Clean Architecture", 3, "domain driven design, ddd, clean architecture, patterns"),
            ("Database Internals: Storage Engines & Distributed Consensus", 4, "storage engines, b-trees, lsm trees, raft, paxos"),
            ("Distributed SQL Systems", 4, "distributed sql, spanner, cockroachdb, isolation levels, acid"),
            ("Network Security & Cryptographic Protocols", 5, "cryptography, rsa, aes, tls, zero trust, security"),
            ("Linux Kernel Architecture and Device Drivers", 6, "linux kernel, operating systems, memory management, drivers"),
            ("Concurrency and Parallel Programming", 6, "concurrency, multithreading, race conditions, semaphores"),
            ("Discrete Mathematics for Computer Science", 7, "discrete math, combinatorics, graph theory, proofs"),
            ("Probability and Statistics for Engineers", 7, "probability, bayesian inference, statistics, hypothesis testing"),
            ("Kubernetes and Container Orchestration", 8, "kubernetes, docker, containers, devops, helm, cloud"),
            ("Site Reliability Engineering Principles", 8, "sre, reliability, observability, metrics, prometheus")
        ]

        # Insert curated template books first
        for title, a_id, c_id, yr, ed, desc, kw in BOOK_TEMPLATES:
            isbn = f"978-0-{isbn_counter:06d}-1"
            isbn_counter += 1
            copies = random.randint(4, 12)
            book = Book(
                isbn=isbn,
                title=title,
                author_id=a_id,
                category_id=c_id,
                publisher_id=random.randint(1, len(pub_entities)),
                publication_year=yr,
                edition=ed,
                description=desc,
                keywords=kw,
                cover_image=f"https://images.unsplash.com/photo-1532012164546-f432f2e37932?w=400&auto=format&fit=crop&q=80",
                total_copies=copies,
                available_copies=copies,
                issued_copies=0,
                reserved_copies=0,
                borrow_count=random.randint(15, 120),
                average_rating=round(random.uniform(4.2, 4.9), 1)
            )
            db.add(book)
            book_entities.append(book)

        # Generate synthetic titles up to 1,020 books
        target_total = 1025
        while len(book_entities) < target_total:
            pfx = random.choice(tech_prefixes)
            topic_tuple = random.choice(tech_topics)
            topic_name, cat_id, base_kw = topic_tuple
            title = f"{pfx} {topic_name}"
            
            # Check unique title
            if any(b.title == title for b in book_entities):
                title = f"{title} (Vol. {random.randint(2, 5)})"

            isbn = f"978-0-{isbn_counter:06d}-1"
            isbn_counter += 1
            yr = random.randint(2012, 2024)
            copies = random.randint(3, 10)
            rating = round(random.uniform(3.5, 4.9), 1)
            borrow_count = random.randint(2, 85)

            book = Book(
                isbn=isbn,
                title=title,
                author_id=random.randint(1, len(author_entities)),
                category_id=cat_id,
                publisher_id=random.randint(1, len(pub_entities)),
                publication_year=yr,
                edition=f"{random.randint(1, 4)}th",
                description=f"In-depth textbook on {topic_name}. Covers architectural foundations, formal proofs, optimization strategies, and real-world implementations.",
                keywords=f"{base_kw}, {pfx.lower()}, textbook",
                cover_image=f"https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
                total_copies=copies,
                available_copies=copies,
                issued_copies=0,
                reserved_copies=0,
                borrow_count=borrow_count,
                average_rating=rating
            )
            db.add(book)
            book_entities.append(book)

        db.flush()

        # 7. Create physical copies for books
        logger.info("Generating physical barcodes and shelf locations for book inventory...")
        for book in book_entities:
            for c_idx in range(book.total_copies):
                copy = BookCopy(
                    book_id=book.id,
                    barcode=f"BC-{book.id}-{c_idx+1:02d}",
                    status=CopyStatus.AVAILABLE,
                    shelf_location=f"Aisle {book.category_id}-Bay {c_idx+1}"
                )
                db.add(copy)
        db.flush()

        # 8. Create Realistic Past and Active Loans
        logger.info("Simulating borrowing history, active loans, and overdue fines...")
        now = datetime.utcnow()

        # A) Past returned loans
        for i in range(1, 400):
            u = random.choice(user_entities)
            b = random.choice(book_entities)
            days_ago = random.randint(15, 180)
            loan_days = random.randint(7, 21)

            issue_dt = now - timedelta(days=days_ago)
            due_dt = issue_dt + timedelta(days=14)
            return_dt = issue_dt + timedelta(days=loan_days)

            loan = Loan(
                user_id=u.id,
                book_id=b.id,
                book_copy_id=b.copies[0].id if b.copies else 1,
                issue_date=issue_dt,
                due_date=due_dt,
                return_date=return_dt,
                status=LoanStatus.RETURNED,
                renewal_count=random.randint(0, 1)
            )
            db.add(loan)

        # B) Active loans (some overdue)
        for i in range(1, 120):
            u = random.choice(user_entities)
            b = random.choice(book_entities)
            if b.available_copies > 1 and len(u.loans) < u.borrow_limit:
                is_overdue = (i % 4 == 0)
                if is_overdue:
                    issue_dt = now - timedelta(days=25)
                    due_dt = now - timedelta(days=random.randint(2, 11))
                else:
                    issue_dt = now - timedelta(days=random.randint(1, 10))
                    due_dt = issue_dt + timedelta(days=14)

                # Update copy status
                copy = b.copies[0]
                copy.status = CopyStatus.ISSUED
                b.available_copies -= 1
                b.issued_copies += 1

                loan = Loan(
                    user_id=u.id,
                    book_id=b.id,
                    book_copy_id=copy.id,
                    issue_date=issue_dt,
                    due_date=due_dt,
                    status=LoanStatus.OVERDUE if is_overdue else LoanStatus.ACTIVE,
                    renewal_count=0
                )
                db.add(loan)
                db.flush()

                if is_overdue:
                    days_over = (now.date() - due_dt.date()).days
                    fine_amt = round(days_over * 2.0, 2)
                    fine = Fine(
                        user_id=u.id,
                        loan_id=loan.id,
                        amount=fine_amt,
                        days_overdue=days_over,
                        status=FineStatus.PENDING
                    )
                    db.add(fine)

        # C) Demo Student Loans & Notifications
        demo_book1 = book_entities[0] # CLRS
        demo_book2 = book_entities[3] # Sedgewick
        demo_loan = Loan(
            user_id=demo_student.id,
            book_id=demo_book1.id,
            book_copy_id=demo_book1.copies[1].id,
            issue_date=now - timedelta(days=3),
            due_date=now + timedelta(days=11),
            status=LoanStatus.ACTIVE,
            renewal_count=0
        )
        demo_book1.available_copies -= 1
        demo_book1.issued_copies += 1
        db.add(demo_loan)

        db.add(Notification(
            user_id=demo_student.id,
            type=NotificationType.BOOK_ISSUED,
            title="Book Issued: CLRS",
            message=f"You borrowed '{demo_book1.title}'. Due date is {(now + timedelta(days=11)).strftime('%Y-%m-%d')}."
        ))
        db.add(Notification(
            user_id=demo_student.id,
            type=NotificationType.SYSTEM_ALERT,
            title="Welcome to Smart Library",
            message="Explore our multi-level search engine and algorithm laboratory."
        ))

        # 9. Book Reservations Queue Demonstration
        # Pick a popular book, mark all copies issued, and queue up 3 students
        hot_book = book_entities[4] # Clean Code
        hot_book.available_copies = 0
        hot_book.issued_copies = hot_book.total_copies

        student_a = user_entities[5]
        student_b = user_entities[6]
        student_c = user_entities[7]

        res1 = Reservation(
            user_id=student_a.id,
            book_id=hot_book.id,
            queue_position=1,
            priority_score=3.0,
            status=ReservationStatus.PENDING
        )
        res2 = Reservation(
            user_id=student_b.id,
            book_id=hot_book.id,
            queue_position=2,
            priority_score=2.0,
            status=ReservationStatus.PENDING
        )
        res3 = Reservation(
            user_id=student_c.id,
            book_id=hot_book.id,
            queue_position=3,
            priority_score=1.0,
            status=ReservationStatus.PENDING
        )
        db.add_all([res1, res2, res3])

        # 10. Reviews
        logger.info("Generating realistic reader reviews and ratings...")
        sample_comments = [
            "Essential reading for any computer science student. The chapter on dynamic programming is world-class.",
            "Crystal clear explanations with rigorous proofs. Highly recommend to everyone preparing for technical interviews.",
            "Remarkable clarity and modern examples. Changed the way I design distributed systems.",
            "The balance between mathematical rigor and engineering intuition is exceptional.",
            "A must-read. The algorithmic techniques covered are directly applicable to production systems."
        ]
        for b in book_entities[:50]:
            for _ in range(random.randint(1, 4)):
                rev = Review(
                    user_id=random.choice(user_entities).id,
                    book_id=b.id,
                    rating=round(random.choice([4.0, 4.5, 5.0]), 1),
                    comment=random.choice(sample_comments)
                )
                db.add(rev)

        # 11. Initial Audit Logs
        db.add(AuditLog(
            user_id=admin_user.id,
            action="SYSTEM_INIT",
            entity="Database",
            details="Seeded 1,025 books, 510 users, loans, and reservations into Smart Library."
        ))

        db.commit()
        logger.info(f"Database seeded successfully with {len(book_entities)} books and {len(user_entities)} users!")

        # 12. Synchronize DSA In-Memory Engine
        logger.info("Indexing dataset into DSA Engine...")
        sync_dsa_engine(db)

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

def sync_dsa_engine(db: Session):
    """Hydrates Hash Tables, Trie, AVL Trees, Queues, Heaps, and Knowledge Graph from DB."""
    books = db.query(Book).all()
    users = db.query(User).all()
    loans = db.query(Loan).all()
    reservations = db.query(Reservation).filter(Reservation.status == ReservationStatus.PENDING).all()

    # Index users
    for u in users:
        dsa_engine.index_user({
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role.value
        })

    # Index books
    for b in books:
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

    # Index loan relationships into graph
    for l in loans:
        dsa_engine.record_loan_in_graph(l.user_id, l.book_id)

    # Hydrate book reservation queues
    for r in reservations:
        q = dsa_engine.get_or_create_book_queue(r.book_id)
        q.enqueue({
            "reservation_id": r.id,
            "user_id": r.user_id,
            "user_name": r.user.full_name if r.user else f"User #{r.user_id}",
            "created_at": r.created_at.isoformat()
        })
        dsa_engine.reservation_heap.push((-r.priority_score, r.created_at.timestamp()), {
            "reservation_id": r.id,
            "user_id": r.user_id,
            "book_id": r.book_id
        })

    # Hydrate overdue fines into Min-Heap Priority Queue
    dsa_engine.overdue_heap.clear()
    pending_fines = db.query(Fine).filter(Fine.status == FineStatus.PENDING).all()
    for f in pending_fines:
        dsa_engine.overdue_heap.push(
            (-f.days_overdue, -f.amount, f.id),
            {
                "fine_id": f.id,
                "user_id": f.user_id,
                "loan_id": f.loan_id,
                "amount": f.amount,
                "days_overdue": f.days_overdue,
                "status": f.status.value,
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "user_name": f.user.full_name if f.user else f"User #{f.user_id}",
                "book_title": f.loan.book.title if (f.loan and f.loan.book) else "Unknown"
            }
        )

    dsa_engine.initialized = True
    logger.info("DSA Engine synchronization complete! All data structures ready.")

if __name__ == "__main__":
    seed_database()
