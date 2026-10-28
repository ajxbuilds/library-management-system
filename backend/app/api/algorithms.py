import random
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.book import Book
from app.models.user import User, UserRole
from app.algorithms.engine import dsa_engine
from app.algorithms.searching.search_comparison import (
    run_comparative_benchmark,
    run_multi_size_benchmark,
    linear_search,
    binary_search,
    hash_search
)
from app.algorithms.sorting.sorting_lab import run_all_sorts
from app.schemas.algorithm import (
    SearchComparisonRequest,
    SearchComparisonResponse,
    SortComparisonRequest,
    GraphTraversalRequest,
    UndoResponse
)
from app.services.undo_service import UndoService
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/algorithms", tags=["DSA Performance Lab"])

@router.get("/stats")
def get_dsa_stats():
    """Returns comprehensive metrics for all in-memory data structures."""
    return {
        "engine_status": "ONLINE & SYNCHRONIZED",
        "data_structures": dsa_engine.get_stats()
    }

@router.post("/search/compare", response_model=SearchComparisonResponse)
def compare_search_algorithms(req: SearchComparisonRequest):
    """
    Benchmarks Linear Search vs Binary Search vs Hash Search
    for a chosen dataset size (100, 1000, 10000, 100000).
    Measures comparisons, execution time (μs), and Big-O efficiency.
    """
    size = max(10, min(100000, req.dataset_size))
    result = run_comparative_benchmark(dataset_size=size, target_id=req.target_id)
    return result

@router.get("/search/benchmark-suite")
def get_search_benchmark_suite():
    """Generates comparative multi-size benchmark data for pre-rendering chart comparisons."""
    return {
        "benchmark_suite": run_multi_size_benchmark()
    }

@router.post("/sort/compare")
def compare_sorting_algorithms(req: SortComparisonRequest, db: Session = Depends(get_db)):
    """
    Runs Bubble, Insertion, Selection, Merge, Quick, and Heap sort on library book dataset.
    Provides execution times, comparisons, swaps, and animation steps.
    """
    count = max(10, min(2000, req.record_count))
    field = req.field

    # Fetch books or synthesize
    books = db.query(Book).limit(count).all()
    if len(books) < count:
        # Synthesize items with realistic variations
        items = []
        for i in range(count):
            items.append({
                "id": i + 1,
                "title": f"Book #{i+1}",
                "publication_year": random.randint(1995, 2025),
                "rating": round(random.uniform(2.5, 5.0), 2),
                "borrow_count": random.randint(0, 500)
            })
    else:
        items = [{
            "id": b.id,
            "title": b.title,
            "publication_year": b.publication_year,
            "rating": b.average_rating or 4.0,
            "borrow_count": b.borrow_count or 0
        } for b in books]

    # Map field name
    field_map = {
        "year": "publication_year",
        "publication_year": "publication_year",
        "rating": "rating",
        "borrow_count": "borrow_count",
        "id": "id"
    }
    target_field = field_map.get(field, "rating")

    # If count is small (<= 30), capture animation frames for visual step-by-step playback
    capture_frames = req.capture_frames or count <= 30
    results = run_all_sorts(items, field=target_field, capture_frames=capture_frames)

    return {
        "record_count": count,
        "sorted_field": target_field,
        "results": results
    }

@router.post("/graph/traverse")
def traverse_knowledge_graph(req: GraphTraversalRequest):
    """
    Executes BFS or DFS traversal on the Library Knowledge Graph.
    Shows visited sequence, depth, node connections, and execution path.
    """
    start_id = req.start_node_id
    if not start_id or start_id not in dsa_engine.graph.nodes:
        # Default to first available node in graph
        if dsa_engine.graph.nodes:
            start_id = list(dsa_engine.graph.nodes.keys())[0]
        else:
            raise HTTPException(status_code=400, detail="Knowledge graph is empty. Seed data first.")

    if req.algorithm.upper() == "DFS":
        res = dsa_engine.graph.dfs(start_id, max_depth=req.max_depth)
    else:
        res = dsa_engine.graph.bfs(start_id, max_depth=req.max_depth)

    return res

@router.get("/graph/subgraph")
def get_graph_subgraph(
    center_id: Optional[str] = None,
    max_nodes: int = Query(35, ge=5, le=80)
):
    """Returns nodes and edges of the library knowledge graph for interactive canvas rendering."""
    return dsa_engine.graph.export_subgraph(center_id=center_id, max_nodes=max_nodes)

@router.post("/undo", response_model=UndoResponse)
def undo_last_action(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.LIBRARIAN]))
):
    """
    Pops the most recent reversible action from the LIFO Undo Stack and restores state.
    """
    res = UndoService.undo_last_operation(db=db, admin_user_id=current_user.id)
    return res

@router.get("/undo/stack")
def get_undo_stack(current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.LIBRARIAN]))):
    """Returns all reversible commands currently on the Undo Stack."""
    items = dsa_engine.undo_stack.to_list()
    cmd_list = [cmd.to_dict() for cmd in items]
    return {
        "stack_depth": len(items),
        "commands": cmd_list,
        "stack": cmd_list
    }

@router.get("/recently-returned")
def get_recently_returned_books():
    """Returns the LIFO Stack of books recently returned by users for shelf sorting."""
    return {
        "count": dsa_engine.recently_returned.size(),
        "books": dsa_engine.recently_returned.to_list()
    }
