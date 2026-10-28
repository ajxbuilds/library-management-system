import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.algorithms.hashing.hash_table import CustomHashMap
from app.algorithms.tries.trie import PrefixTrie
from app.algorithms.trees.avl_tree import AVLTree
from app.algorithms.heaps.priority_queue import MinHeapPriorityQueue
from app.algorithms.queues.fifo_queue import FIFOQueue
from app.algorithms.stacks.stack import Stack, UndoCommand
from app.algorithms.graphs.graph import LibraryKnowledgeGraph

logger = logging.getLogger("dsa_engine")

class DSAEngine:
    """
    Central DSA / Algorithm Engine.
    Maintains synchronized in-memory Data Structures for sub-millisecond lookups,
    autocomplete, range queries, queues, undo stacks, and graph traversals.
    """
    def __init__(self):
        # 1. Hash Tables: O(1) average lookups
        self.isbn_index = CustomHashMap(initial_capacity=128)
        self.book_id_index = CustomHashMap(initial_capacity=128)
        self.member_id_index = CustomHashMap(initial_capacity=128)
        self.email_index = CustomHashMap(initial_capacity=128)

        # 2. Trie: O(k) Autocomplete
        self.trie = PrefixTrie()

        # 3. AVL Trees: O(log n) indexing & range queries
        self.year_avl = AVLTree()
        self.rating_avl = AVLTree()

        # 4. Queues: FIFO queues for unavailable book reservations
        self.book_queues: Dict[int, FIFOQueue] = {}

        # 5. Heaps: Priority Queue for reservations & overdue ranking
        self.reservation_heap = MinHeapPriorityQueue()
        self.overdue_heap = MinHeapPriorityQueue()

        # 6. Stacks: Undo Stack & Recently Returned
        self.undo_stack = Stack(max_capacity=50)
        self.recently_returned = Stack(max_capacity=20)

        # 7. Knowledge Graph: BFS, DFS & Recommendation relations
        self.graph = LibraryKnowledgeGraph()

        self.initialized = False

    def index_book(self, book_data: Dict[str, Any]) -> None:
        """Indexes a single book across Hash Tables, Trie, AVL Trees, and Graph."""
        b_id = book_data["id"]
        isbn = book_data["isbn"]
        title = book_data["title"]
        author_name = book_data.get("author_name", "")
        category_name = book_data.get("category_name", "")
        year = book_data.get("publication_year", 2020)
        rating = book_data.get("average_rating", 4.0)

        # Hash Maps
        self.book_id_index.put(b_id, book_data)
        self.isbn_index.put(isbn, book_data)

        # Trie Autocomplete
        self.trie.insert(title, {
            "id": b_id,
            "type": "book",
            "title": title,
            "author": author_name,
            "category": category_name,
            "popularity": book_data.get("borrow_count", 0),
            "rating": rating
        })
        if author_name:
            self.trie.insert(author_name, {
                "id": book_data.get("author_id", 0),
                "type": "author",
                "title": author_name,
                "author": author_name,
                "category": "Author",
                "popularity": 5,
                "rating": 5.0
            })
        if category_name:
            self.trie.insert(category_name, {
                "id": book_data.get("category_id", 0),
                "type": "category",
                "title": category_name,
                "author": "Topic",
                "category": category_name,
                "popularity": 5,
                "rating": 5.0
            })

        # AVL Trees
        self.year_avl.insert(year, book_data)
        self.rating_avl.insert(round(rating, 1), book_data)

        # Knowledge Graph
        b_node_id = f"book:{b_id}"
        self.graph.add_node(b_node_id, title, "book", book_data)

        if author_name:
            a_node_id = f"author:{book_data.get('author_id')}"
            self.graph.add_node(a_node_id, author_name, "author")
            self.graph.add_edge(b_node_id, a_node_id, "WRITTEN_BY", weight=1.5)

        if category_name:
            c_node_id = f"category:{book_data.get('category_id')}"
            self.graph.add_node(c_node_id, category_name, "category")
            self.graph.add_edge(b_node_id, c_node_id, "BELONGS_TO", weight=1.2)

    def remove_book(self, book_id: int, isbn: Optional[str] = None) -> None:
        self.book_id_index.remove(book_id)
        if isbn:
            self.isbn_index.remove(isbn)

    def index_user(self, user_data: Dict[str, Any]) -> None:
        u_id = user_data["id"]
        email = user_data["email"]
        name = user_data.get("full_name", user_data.get("username", ""))

        self.member_id_index.put(u_id, user_data)
        self.email_index.put(email, user_data)

        u_node_id = f"user:{u_id}"
        self.graph.add_node(u_node_id, name, "user", user_data)

    def record_loan_in_graph(self, user_id: int, book_id: int) -> None:
        u_node_id = f"user:{user_id}"
        b_node_id = f"book:{book_id}"
        self.graph.add_edge(u_node_id, b_node_id, "BORROWED", weight=2.0)

    def get_or_create_book_queue(self, book_id: int) -> FIFOQueue:
        if book_id not in self.book_queues:
            self.book_queues[book_id] = FIFOQueue()
        return self.book_queues[book_id]

    def record_book_return(self, book_data: Dict[str, Any]) -> None:
        # Push to Recently Returned Stack (LIFO)
        self.recently_returned.push(book_data)

    def push_undo(self, command: UndoCommand) -> None:
        self.undo_stack.push(command)

    def pop_undo(self) -> Optional[UndoCommand]:
        return self.undo_stack.pop()

    def get_stats(self) -> Dict[str, Any]:
        return {
            "hash_map_isbn": self.isbn_index.get_metrics(),
            "hash_map_books": self.book_id_index.get_metrics(),
            "trie_total_words": self.trie.total_words,
            "year_avl": self.year_avl.get_stats(),
            "rating_avl": self.rating_avl.get_stats(),
            "active_book_queues": len([q for q in self.book_queues.values() if not q.is_empty()]),
            "undo_stack_size": self.undo_stack.size(),
            "recently_returned_count": self.recently_returned.size(),
            "graph_nodes_count": len(self.graph.nodes),
            "graph_edges_count": sum(len(edges) for edges in self.graph.adjacency.values()) // 2
        }

# Global Singleton Instance
dsa_engine = DSAEngine()
