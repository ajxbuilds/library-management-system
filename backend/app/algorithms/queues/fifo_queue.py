from collections import deque
from typing import Any, List, Optional

class FIFOQueue:
    """
    First-In First-Out (FIFO) Reservation Queue.
    Maintains the line when books are unavailable:
    User A -> User B -> User C
    Average complexity: O(1) enqueue, O(1) dequeue.
    """
    def __init__(self):
        self._queue = deque()

    def enqueue(self, item: Any) -> int:
        self._queue.append(item)
        return len(self._queue) # Return position

    def dequeue(self) -> Optional[Any]:
        if not self._queue:
            return None
        return self._queue.popleft()

    def peek(self) -> Optional[Any]:
        if not self._queue:
            return None
        return self._queue[0]

    def remove_item(self, match_fn) -> bool:
        """Removes an item matching condition (e.g. cancellation)"""
        for item in self._queue:
            if match_fn(item):
                self._queue.remove(item)
                return True
        return False

    def get_position(self, match_fn) -> int:
        for idx, item in enumerate(self._queue):
            if match_fn(item):
                return idx + 1
        return -1

    def is_empty(self) -> bool:
        return len(self._queue) == 0

    def size(self) -> int:
        return len(self._queue)

    def to_list(self) -> List[Any]:
        return list(self._queue)
