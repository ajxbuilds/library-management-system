import heapq
from typing import Any, List, Optional, Tuple

class PriorityItem:
    def __init__(self, priority: Tuple, data: Any):
        self.priority = priority # e.g. (-tier_weight, timestamp, urgency)
        self.data = data

    def __lt__(self, other: "PriorityItem") -> bool:
        return self.priority < other.priority

class MinHeapPriorityQueue:
    """
    Binary Min-Heap Priority Queue.
    O(log n) insertion, O(log n) extraction, O(1) peek.
    Used for:
    - Smart reservation allocation
    - Overdue urgency ranking
    - Fine recovery prioritization
    """
    def __init__(self):
        self._heap: List[PriorityItem] = []

    def push(self, priority: Tuple, data: Any) -> None:
        item = PriorityItem(priority, data)
        heapq.heappush(self._heap, item)

    def pop(self) -> Optional[Any]:
        if not self._heap:
            return None
        return heapq.heappop(self._heap).data

    def peek(self) -> Optional[Any]:
        if not self._heap:
            return None
        return self._heap[0].data

    def is_empty(self) -> bool:
        return len(self._heap) == 0

    def size(self) -> int:
        return len(self._heap)

    def to_sorted_list(self) -> List[Any]:
        # Return items in priority order without mutating original heap
        temp_copy = list(self._heap)
        sorted_items = []
        while temp_copy:
            sorted_items.append(heapq.heappop(temp_copy).data)
        return sorted_items

    def clear(self) -> None:
        self._heap.clear()
