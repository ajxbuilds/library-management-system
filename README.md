# 📚 Smart Library Management System
### Using Advanced Data Structures, Intelligent Search & Recommendation Algorithms

> A production-quality, full-stack library management platform that demonstrates how **7+ core Data Structures and Algorithms** solve real-world library problems — built as a **CSE DSA Minor Project**.

---

## 🖼️ Live Screenshots

| Admin Dashboard | Sorting Lab | Graph Visualizer |
|:---:|:---:|:---:|
| Real-time DSA telemetry | 6 sorting algorithms compared | BFS/DFS traversal playback |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│  React + Vite + TypeScript + TailwindCSS            │
│  Port: 5173 (dev) → proxies /api to backend        │
├─────────────────────────────────────────────────────┤
│                   BACKEND API                       │
│  Python FastAPI + SQLAlchemy + JWT Auth              │
│  Port: 8000                                         │
├─────────────────────────────────────────────────────┤
│              DSA ALGORITHM ENGINE                   │
│  Custom Hash Table │ Prefix Trie │ AVL Tree         │
│  Min-Heap │ FIFO Queue │ LIFO Stack │ Graph (BFS/DFS)│
├─────────────────────────────────────────────────────┤
│               DATA LAYER                            │
│  SQLite (default) │ Redis Cache (optional fallback) │
│  1,025 Books │ 512 Users │ 8 Categories │ Seeded    │
└─────────────────────────────────────────────────────┘
```

---

## 🧠 DSA Implementations & Where They're Used

| # | Data Structure | Implementation | Library Problem Solved | Complexity |
|---|---------------|----------------|----------------------|------------|
| 1 | **Custom Hash Table** | Separate chaining, dynamic resizing, polynomial hash | O(1) ISBN lookup, book/user indexing | O(1) avg lookup |
| 2 | **Prefix Trie** | DFS traversal, popularity-sorted results | Real-time autocomplete as you type | O(k) where k=prefix length |
| 3 | **AVL Tree** | LL/RR/LR/RL rotations, range queries | Publication year & rating range filters | O(log n + k) range query |
| 4 | **Min-Heap Priority Queue** | Binary heap with custom comparator | Overdue loan prioritization & fine ranking | O(log n) extract-min |
| 5 | **FIFO Queue** | Circular buffer implementation | Fair book reservation waiting list | O(1) enqueue/dequeue |
| 6 | **LIFO Stack** | Array-backed with command pattern | Undo operations (issue/return/delete) | O(1) push/pop |
| 7 | **Graph (Adjacency List)** | BFS (queue), DFS (stack), shortest path | Book-Author-Category knowledge graph & recommendations | O(V+E) traversal |
| 8 | **6 Sorting Algorithms** | Bubble, Selection, Insertion, Merge, Quick, Heap | Empirical benchmark lab with animated visualizer | Various |
| 9 | **3 Search Algorithms** | Linear, Binary, Hash Table | Complexity comparison lab (100 to 100K records) | O(n), O(log n), O(1) |

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+** (tested with 3.10.11)
- **Node.js 18+** (tested with v24.13.1)
- **npm 9+**

### 1. Clone & Setup Backend

```bash
# Navigate to project directory
cd "DSA Project 1"

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install Python dependencies
pip install -r backend/requirements.txt
```

### 2. Seed Database & Start Backend

```bash
# Start the FastAPI server (auto-seeds database on first run)
# Windows PowerShell:
$env:PYTHONPATH="backend"; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Linux/Mac:
PYTHONPATH=backend python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server will:
- Create `backend/library.db` (SQLite) automatically
- Seed **1,025 books**, **512 users**, **8 categories**, **15 authors**, **8 publishers**
- Generate ~400 past loans, ~120 active loans (some overdue with fines)
- Build in-memory DSA indices (Hash Table, Trie, AVL Trees, Graph)

### 3. Setup & Start Frontend

```bash
cd frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
```

### 4. Open in Browser

Visit **http://localhost:5173** — the app auto-logs in as Admin.

---

## 🔐 Demo Accounts

| Role | Username | Password | Access Level |
|------|----------|----------|-------------|
| **Admin** | `admin` | `admin123` | Full system access, audit logs, analytics |
| **Librarian** | `librarian` | `lib123` | Circulation desk, issue/return, fines |
| **Student** | `student` | `student123` | Personal dashboard, borrow, recommendations |

> **Tip:** Use the **Quick Role Switcher** buttons in the top navbar to instantly switch between roles during demo/viva.

---

## 📖 Feature Walkthrough

### 🏠 Dashboards (3 role-specific views)
- **Admin Dashboard** — KPI cards (total books, members, active loans, fines), DSA telemetry (Hash Table load factor, AVL tree height, Graph density), quick launch pad
- **Librarian Desk** — Express checkout form, overdue priority heap table, LIFO return shelving stack preview, active loans
- **Student Portal** — My active loans with due dates, FIFO queue holds, outstanding fines with pay button, graph-based recommendations

### 📚 Catalog & Intelligent Search
- **Trie Autocomplete** — Type any prefix to get instant suggestions with μs latency display
- **Multi-Factor Ranked Search** — Weighted scoring (exact match, prefix, author, category, availability, popularity, rating)
- **Hash Table O(1) ISBN Lookup** — Direct bucket resolution widget with collision chain depth display
- **AVL Tree Range Filter** — Filter books by publication year range using balanced BST subtree walk
- **Category Filters & Sorting** — Filter by 8 categories, sort by title/rating/year/popularity

### 🔄 Circulation & Queue Management
- **Issue/Return** — With automatic fine calculation ($1.00/day overdue)
- **FIFO Reservation Queue** — Visual queue pipeline showing position, front indicator, auto-assignment on return
- **Overdue Priority Heap** — Ranked by days overdue using Min-Heap

### 💰 Fines & Penalties
- **Automated Accrual** — $1.00/day overdue rate
- **Pay/Waive Actions** — Staff can waive with reason (logged to audit)
- **Min-Heap Ranking** — Most urgent fines surface first

### 🤖 Recommendations Engine
- **3-Layer Hybrid Pipeline**: Graph 2-Hop BFS neighborhood → Content-based category affinity → Popularity/rating bias
- **Match Score Display** — Percentage match with reason tags (Graph Co-Citation, Author Affinity)

### 🧪 DSA Laboratory Pages

#### Search Complexity Lab
- Select dataset size (100 to 100,000 records)
- Run live benchmarks: Linear O(n) vs Binary O(log n) vs Hash Table O(1)
- Recharts bar charts showing execution latency (μs) and comparison counts

#### Sorting Algorithm Lab
- Compare 6 algorithms: Bubble, Selection, Insertion, Merge, Quick, Heap Sort
- Configurable record count (100–1,000) and sort field (rating, year, pages)
- **Live Animation Simulator** — Watch bubble sort swap elements in real-time
- Theoretical vs Empirical metrics matrix with complexity annotations

#### Knowledge Graph Visualizer
- Interactive SVG canvas rendering Books, Authors, Categories as colored vertices
- Edge relationships with dashed/solid styling
- **BFS/DFS Traversal Playback** — Step-by-step with play/pause/skip controls
- Click any node to center subgraph and inspect properties

### 📊 Analytics & Charts
- Monthly borrow vs return velocity (Area chart)
- Category distribution breakdown (Donut chart)
- Most demanded volumes (Horizontal bar chart)
- Inventory utilization ratio (Progress bars)

### 🔒 Audit Trail & Undo Stack
- **Immutable Audit Log** — All operations logged with user, timestamp, details
- **LIFO Undo Stack** — Visual stack state showing push order, TOP indicator
- **Pop & Undo** — Reverses last issue/return/delete with compensation handlers

### 🔔 Notifications
- Real-time polling (10s interval)
- Slide-over notification drawer
- Mark read / mark all read

### ⏪ Floating Undo Button
- Always-visible FAB showing current stack depth
- One-click undo with toast confirmation

---

## 🗂️ Project Structure

```
DSA Project 1/
├── backend/
│   ├── app/
│   │   ├── algorithms/           # ← CUSTOM DSA IMPLEMENTATIONS
│   │   │   ├── engine.py         # Central DSAEngine singleton
│   │   │   ├── hashing/hash_table.py      # Separate-chaining HashMap
│   │   │   ├── tries/trie.py              # Prefix Trie autocomplete
│   │   │   ├── trees/avl_tree.py          # AVL with rotations
│   │   │   ├── heaps/priority_queue.py    # Min-Heap priority queue
│   │   │   ├── queues/fifo_queue.py       # FIFO reservation queue
│   │   │   ├── stacks/stack.py            # LIFO undo stack
│   │   │   ├── graphs/graph.py            # Knowledge graph (BFS/DFS)
│   │   │   ├── searching/search_comparison.py  # Linear vs Binary vs Hash
│   │   │   └── sorting/sorting_lab.py     # 6 sorting algorithms + metrics
│   │   ├── api/                  # FastAPI route handlers
│   │   ├── core/                 # Config, security, cache
│   │   ├── models/               # SQLAlchemy ORM models (14 tables)
│   │   ├── services/             # Business logic layer
│   │   ├── seed/seeder.py        # 1,025 books + 512 users seed
│   │   └── main.py               # FastAPI application entry
│   ├── tests/                    # 14 passing tests (DSA + API)
│   ├── requirements.txt
│   └── library.db                # SQLite database (auto-created)
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── Navbar.tsx        # Top bar with Trie search & role switcher
│   │   │   ├── Sidebar.tsx       # Navigation with DSA badges
│   │   │   ├── TrieAutocomplete.tsx  # Live prefix autocomplete
│   │   │   ├── BookDetailModal.tsx    # Book detail + issue/reserve
│   │   │   ├── NotificationDrawer.tsx # Slide-over notifications
│   │   │   └── UndoFloatingButton.tsx # Floating undo FAB
│   │   ├── pages/                # Page-level components
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── LibrarianDashboard.tsx
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── CatalogPage.tsx
│   │   │   ├── CirculationPage.tsx
│   │   │   ├── FinesPage.tsx
│   │   │   ├── RecommendationsPage.tsx
│   │   │   ├── SearchLabPage.tsx
│   │   │   ├── SortingLabPage.tsx
│   │   │   ├── GraphLabPage.tsx
│   │   │   ├── AnalyticsPage.tsx
│   │   │   └── AuditLogPage.tsx
│   │   ├── context/              # React Context providers
│   │   ├── services/api.ts       # REST API client
│   │   ├── types/index.ts        # TypeScript interfaces
│   │   └── App.tsx               # Root component
│   ├── tailwind.config.js
│   ├── vite.config.ts            # Vite config with /api proxy
│   └── package.json
└── README.md
```

---

## 🧪 Running Tests

```bash
# Activate virtual environment first
$env:PYTHONPATH="backend"; python -m pytest backend/tests/ -v
```

**14 tests** covering:
- All 7 custom DSA data structures (unit tests)
- API endpoints: search, autocomplete, AVL range query, sorting lab, graph traversal, auth

---

## 📝 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript + Vite 8 | SPA with HMR |
| Styling | TailwindCSS 3 | Utility-first CSS with dark theme |
| Charts | Recharts | Area, Bar, Pie, Donut charts |
| Icons | Lucide React | 200+ consistent SVG icons |
| Backend | Python FastAPI | Async REST API |
| ORM | SQLAlchemy 2 | Database abstraction |
| Database | SQLite (PostgreSQL-ready) | Zero-config persistence |
| Cache | Redis (with in-memory fallback) | Works without Redis installed |
| Auth | JWT (PyJWT + bcrypt) | Stateless token authentication |

---

## 📜 License

This project is developed for academic purposes as a CSE Data Structures & Algorithms minor project.

---

## 👨‍💻 Demo Flow (Viva Presentation Order)

1. **Login** as Admin → Show Dashboard with live DSA telemetry
2. **Trie Autocomplete** → Type "Alg" → See instant suggestions with μs timing
3. **Full Search** → Search "Data Structures" → Show ranked multi-factor results
4. **Hash Table Lookup** → Enter ISBN → Show O(1) bucket resolution
5. **AVL Range Query** → Filter books 2015–2020 → Show balanced tree walk
6. **Catalog Browse** → Filter by category, sort by rating
7. **Book Detail** → Click any book → Show copies, issue/reserve actions
8. **Issue Book** → Switch to Librarian → Issue book via Express Checkout
9. **Undo** → Click floating Undo button → Reverse the issue operation
10. **Return Book** → Return an overdue book → See auto-generated fine
11. **FIFO Queue** → Inspect reservation queue for a popular book
12. **Fines Page** → Pay or waive a fine with staff override
13. **Recommendations** → Switch to Student → See graph-based recommendations
14. **Search Lab** → Run benchmark at N=100,000 → Compare O(n) vs O(log n) vs O(1)
15. **Sorting Lab** → Compare 6 algorithms → Watch animation simulator
16. **Graph Lab** → Visualize knowledge graph → Run BFS/DFS step-by-step
17. **Analytics** → Show circulation trends, category breakdown charts
18. **Audit Logs** → Show LIFO undo stack state + immutable audit trail
19. **Role Switching** → Quick-switch Admin → Librarian → Student
20. **Notifications** → Open drawer → Show real-time alerts
