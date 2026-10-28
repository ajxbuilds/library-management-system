from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class SearchComparisonRequest(BaseModel):
    dataset_size: int = 10000
    target_id: Optional[int] = None

class SearchComparisonResult(BaseModel):
    algorithm: str
    time_complexity: str
    space_complexity: str
    comparisons: int
    execution_time_us: float
    speedup_vs_linear: str
    found: bool

class SearchComparisonResponse(BaseModel):
    dataset_size: int
    target_id: int
    results: List[SearchComparisonResult]
    linear: Optional[Dict[str, Any]] = None
    binary: Optional[Dict[str, Any]] = None
    hash_table: Optional[Dict[str, Any]] = None

class SortComparisonRequest(BaseModel):
    record_count: int = 100
    field: str = "rating" # rating, year, borrow_count, id
    capture_frames: bool = False

class SortResultItem(BaseModel):
    algorithm: str
    time_complexity: str
    space_complexity: str
    comparisons: int
    swaps: int
    execution_time_us: float
    frames_count: int
    frames: Optional[List[Dict[str, Any]]] = None

class GraphTraversalRequest(BaseModel):
    start_node_id: str
    max_depth: int = 3
    algorithm: str = "BFS" # "BFS" or "DFS"

class UndoResponse(BaseModel):
    success: bool
    message: str
    restored_action: Optional[Dict[str, Any]] = None
