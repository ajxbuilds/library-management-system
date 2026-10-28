import time
from typing import Any, Optional, List, Tuple

class HashEntry:
    def __init__(self, key: Any, value: Any):
        self.key = key
        self.value = value
        self.next = None

class CustomHashMap:
    """
    Custom Hash Table with Separate Chaining and Dynamic Resizing.
    Demonstrates O(1) average lookup, load factor tracking, and collision handling.
    """
    def __init__(self, initial_capacity: int = 64, load_factor_threshold: float = 0.75):
        self.capacity = initial_capacity
        self.load_factor_threshold = load_factor_threshold
        self.size = 0
        self.buckets: List[Optional[HashEntry]] = [None] * self.capacity
        self.collision_count = 0
        self.comparison_count = 0

    def _hash(self, key: Any) -> int:
        # Polynomial rolling hash for strings or standard hash for numbers
        if isinstance(key, str):
            h = 0
            prime = 31
            for char in key:
                h = (h * prime + ord(char)) & 0xFFFFFFFF
            return h % self.capacity
        return abs(hash(key)) % self.capacity

    def put(self, key: Any, value: Any) -> None:
        if (self.size + 1) / self.capacity >= self.load_factor_threshold:
            self._resize(self.capacity * 2)

        index = self._hash(key)
        head = self.buckets[index]

        if head is None:
            self.buckets[index] = HashEntry(key, value)
            self.size += 1
            return

        # Collision occurred; traverse chain
        self.collision_count += 1
        curr = head
        while curr:
            if curr.key == key:
                curr.value = value
                return
            if curr.next is None:
                break
            curr = curr.next

        curr.next = HashEntry(key, value)
        self.size += 1

    def get_with_metrics(self, key: Any) -> Tuple[Optional[Any], int, float]:
        """Returns (value, comparisons, elapsed_microseconds)"""
        start_time = time.perf_counter_ns()
        index = self._hash(key)
        curr = self.buckets[index]
        comparisons = 0

        while curr:
            comparisons += 1
            if curr.key == key:
                elapsed_us = (time.perf_counter_ns() - start_time) / 1000.0
                return curr.value, comparisons, elapsed_us
            curr = curr.next

        elapsed_us = (time.perf_counter_ns() - start_time) / 1000.0
        return None, comparisons, elapsed_us

    def get(self, key: Any) -> Optional[Any]:
        val, _, _ = self.get_with_metrics(key)
        return val

    def remove(self, key: Any) -> bool:
        index = self._hash(key)
        curr = self.buckets[index]
        prev = None

        while curr:
            if curr.key == key:
                if prev:
                    prev.next = curr.next
                else:
                    self.buckets[index] = curr.next
                self.size -= 1
                return True
            prev = curr
            curr = curr.next
        return False

    def _resize(self, new_capacity: int) -> None:
        old_buckets = self.buckets
        self.capacity = new_capacity
        self.buckets = [None] * new_capacity
        self.size = 0
        self.collision_count = 0

        for head in old_buckets:
            curr = head
            while curr:
                self.put(curr.key, curr.value)
                curr = curr.next

    def get_metrics(self) -> dict:
        occupied_buckets = sum(1 for b in self.buckets if b is not None)
        return {
            "capacity": self.capacity,
            "size": self.size,
            "load_factor": round(self.size / self.capacity, 4),
            "occupied_buckets": occupied_buckets,
            "empty_buckets": self.capacity - occupied_buckets,
            "collision_count": self.collision_count,
            "complexity": "O(1) average, O(n) worst case"
        }
