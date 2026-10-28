import time
from typing import Any, List, Optional, Tuple

class AVLNode:
    def __init__(self, key: Any, value: Any):
        self.key = key
        self.values: List[Any] = [value] # Support multiple items with identical key (e.g. publication year)
        self.height: int = 1
        self.left: Optional[AVLNode] = None
        self.right: Optional[AVLNode] = None

class AVLTree:
    """
    AVL Tree: Self-Balancing Binary Search Tree.
    Guarantees O(log n) search, insertion, deletion, and efficient range queries.
    Maintains height balance factor in {-1, 0, 1} through LL, RR, LR, RL rotations.
    """
    def __init__(self):
        self.root: Optional[AVLNode] = None
        self.node_count = 0
        self.rotation_count = 0

    def _get_height(self, node: Optional[AVLNode]) -> int:
        return node.height if node else 0

    def _get_balance(self, node: Optional[AVLNode]) -> int:
        return self._get_height(node.left) - self._get_height(node.right) if node else 0

    def _update_height(self, node: AVLNode) -> None:
        node.height = 1 + max(self._get_height(node.left), self._get_height(node.right))

    def _rotate_right(self, y: AVLNode) -> AVLNode:
        x = y.left
        T2 = x.right

        # Perform rotation
        x.right = y
        y.left = T2

        # Update heights
        self._update_height(y)
        self._update_height(x)
        self.rotation_count += 1
        return x

    def _rotate_left(self, x: AVLNode) -> AVLNode:
        y = x.right
        T2 = y.left

        # Perform rotation
        y.left = x
        x.right = T2

        # Update heights
        self._update_height(x)
        self._update_height(y)
        self.rotation_count += 1
        return y

    def insert(self, key: Any, value: Any) -> None:
        self.root = self._insert_node(self.root, key, value)

    def _insert_node(self, node: Optional[AVLNode], key: Any, value: Any) -> AVLNode:
        # Standard BST insertion
        if not node:
            self.node_count += 1
            return AVLNode(key, value)

        if key == node.key:
            node.values.append(value)
            return node
        elif key < node.key:
            node.left = self._insert_node(node.left, key, value)
        else:
            node.right = self._insert_node(node.right, key, value)

        # Update height
        self._update_height(node)
        balance = self._get_balance(node)

        # 4 Balance cases:
        # Case 1: Left-Left
        if balance > 1 and key < node.left.key:
            return self._rotate_right(node)

        # Case 2: Right-Right
        if balance < -1 and key > node.right.key:
            return self._rotate_left(node)

        # Case 3: Left-Right
        if balance > 1 and key > node.left.key:
            node.left = self._rotate_left(node.left)
            return self._rotate_right(node)

        # Case 4: Right-Left
        if balance < -1 and key < node.right.key:
            node.right = self._rotate_right(node.right)
            return self._rotate_left(node)

        return node

    def search_with_metrics(self, key: Any) -> Tuple[List[Any], int, float]:
        """Returns (values, comparisons, elapsed_microseconds)"""
        start_time = time.perf_counter_ns()
        curr = self.root
        comparisons = 0

        while curr:
            comparisons += 1
            if key == curr.key:
                elapsed_us = (time.perf_counter_ns() - start_time) / 1000.0
                return curr.values, comparisons, elapsed_us
            elif key < curr.key:
                curr = curr.left
            else:
                curr = curr.right

        elapsed_us = (time.perf_counter_ns() - start_time) / 1000.0
        return [], comparisons, elapsed_us

    def range_query(self, min_key: Any, max_key: Any) -> Tuple[List[Any], int, float]:
        """
        Performs range query in O(log n + k) time.
        Example: Find all books published between 2018 and 2024.
        """
        start_time = time.perf_counter_ns()
        results: List[Any] = []
        comparisons = [0]

        def _range_helper(node: Optional[AVLNode]):
            if not node:
                return
            comparisons[0] += 1
            if min_key <= node.key:
                _range_helper(node.left)
            if min_key <= node.key <= max_key:
                results.extend(node.values)
            if node.key <= max_key:
                _range_helper(node.right)

        _range_helper(self.root)
        elapsed_us = (time.perf_counter_ns() - start_time) / 1000.0
        return results, comparisons[0], elapsed_us

    def in_order_traversal(self) -> List[Tuple[Any, List[Any]]]:
        result = []
        def _in_order(node: Optional[AVLNode]):
            if node:
                _in_order(node.left)
                result.append((node.key, node.values))
                _in_order(node.right)
        _in_order(self.root)
        return result

    def get_stats(self) -> dict:
        return {
            "node_count": self.node_count,
            "tree_height": self._get_height(self.root),
            "rotations_performed": self.rotation_count,
            "root_balance": self._get_balance(self.root),
            "complexity": "O(log n) search/insert/delete"
        }
