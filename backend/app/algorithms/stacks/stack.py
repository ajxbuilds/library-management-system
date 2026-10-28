import time
from typing import Any, List, Optional, Dict

class Stack:
    """
    LIFO (Last-In First-Out) Stack.
    O(1) push, O(1) pop, O(1) peek.
    Used for Undo operations and recently returned books.
    """
    def __init__(self, max_capacity: int = 100):
        self._items: List[Any] = []
        self.max_capacity = max_capacity

    def push(self, item: Any) -> None:
        if len(self._items) >= self.max_capacity:
            self._items.pop(0) # Evict oldest if capacity exceeded
        self._items.append(item)

    def pop(self) -> Optional[Any]:
        if not self._items:
            return None
        return self._items.pop()

    def peek(self) -> Optional[Any]:
        if not self._items:
            return None
        return self._items[-1]

    def is_empty(self) -> bool:
        return len(self._items) == 0

    def size(self) -> int:
        return len(self._items)

    def to_list(self) -> List[Any]:
        # Return newest first
        return list(reversed(self._items))

    def clear(self) -> None:
        self._items.clear()

class UndoCommand:
    def __init__(self, action_type: str, entity: str, entity_id: int, payload: Dict[str, Any], description: str):
        self.id = int(time.time() * 1000)
        self.action_type = action_type # e.g. "DELETE_BOOK", "ADD_BOOK", "ISSUE_BOOK", "RETURN_BOOK"
        self.entity = entity
        self.entity_id = entity_id
        self.payload = payload
        self.description = description
        self.timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "action_type": self.action_type,
            "entity": self.entity,
            "entity_id": self.entity_id,
            "description": self.description,
            "timestamp": self.timestamp
        }
