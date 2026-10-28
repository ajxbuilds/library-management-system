import time
from typing import Dict, List, Optional, Any, Tuple

class TrieNode:
    def __init__(self):
        self.children: Dict[str, TrieNode] = {}
        self.is_end_of_word: bool = False
        # Store metadata for direct suggestion payload
        self.payloads: List[Dict[str, Any]] = []

class PrefixTrie:
    """
    Trie (Prefix Tree) implementation for O(k) prefix matching and autocomplete.
    Supports autocomplete across titles, authors, and categories.
    """
    def __init__(self):
        self.root = TrieNode()
        self.total_words = 0

    def insert(self, word: str, payload: Dict[str, Any]) -> None:
        if not word:
            return
        node = self.root
        clean_word = word.strip().lower()
        for char in clean_word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]

        node.is_end_of_word = True
        # Avoid duplicate payloads
        if not any(p.get("id") == payload.get("id") and p.get("type") == payload.get("type") for p in node.payloads):
            node.payloads.append(payload)
            self.total_words += 1

    def search_prefix(self, prefix: str, limit: int = 8) -> Tuple[List[Dict[str, Any]], float]:
        """
        Searches for all words matching the prefix.
        Returns: (results_list, elapsed_microseconds)
        Complexity: O(k + m) where k is prefix length, m is number of matching nodes.
        """
        start_time = time.perf_counter_ns()
        if not prefix:
            return [], 0.0

        clean_prefix = prefix.strip().lower()
        node = self.root

        # Step 1: Traverse prefix in O(k)
        for char in clean_prefix:
            if char not in node.children:
                elapsed_us = (time.perf_counter_ns() - start_time) / 1000.0
                return [], elapsed_us
            node = node.children[char]

        # Step 2: DFS traversal to gather completions
        results: List[Dict[str, Any]] = []
        visited_ids = set()

        def _dfs(curr: TrieNode):
            if len(results) >= limit * 2:
                return
            if curr.is_end_of_word:
                for item in curr.payloads:
                    unique_key = f"{item.get('type')}:{item.get('id')}"
                    if unique_key not in visited_ids:
                        visited_ids.add(unique_key)
                        results.append(item)
            # Traverse children alphabetically
            for char in sorted(curr.children.keys()):
                _dfs(curr.children[char])

        _dfs(node)

        # Sort completions by popularity / rating
        results.sort(key=lambda x: (x.get("popularity", 0), x.get("rating", 0.0)), reverse=True)
        final_results = results[:limit]
        elapsed_us = (time.perf_counter_ns() - start_time) / 1000.0
        return final_results, elapsed_us
