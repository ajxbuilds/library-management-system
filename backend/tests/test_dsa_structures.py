import pytest
from app.algorithms.hashing.hash_table import CustomHashMap
from app.algorithms.tries.trie import PrefixTrie
from app.algorithms.trees.avl_tree import AVLTree
from app.algorithms.heaps.priority_queue import MinHeapPriorityQueue
from app.algorithms.queues.fifo_queue import FIFOQueue
from app.algorithms.stacks.stack import Stack, UndoCommand
from app.algorithms.graphs.graph import LibraryKnowledgeGraph

def test_custom_hash_table():
    ht = CustomHashMap(initial_capacity=8)
    ht.put("978-01", {"title": "Book 1"})
    ht.put("978-02", {"title": "Book 2"})
    ht.put("978-03", {"title": "Book 3"})

    val, comps, elapsed = ht.get_with_metrics("978-02")
    assert val is not None
    assert val["title"] == "Book 2"
    assert comps >= 1
    assert elapsed >= 0.0

    # Test key removal
    assert ht.remove("978-02") is True
    assert ht.get("978-02") is None
    assert ht.size == 2

def test_prefix_trie():
    trie = PrefixTrie()
    trie.insert("Computer Networks", {"id": 1, "type": "book", "popularity": 10})
    trie.insert("Computer Architecture", {"id": 2, "type": "book", "popularity": 8})
    trie.insert("Compiler Design", {"id": 3, "type": "book", "popularity": 15})
    trie.insert("Competitive Programming", {"id": 4, "type": "book", "popularity": 20})

    # Prefix 'comp'
    results, elapsed = trie.search_prefix("comp", limit=5)
    assert len(results) == 4
    # Highest popularity first
    assert results[0]["id"] == 4 # Competitive Programming has popularity 20

    # Prefix 'compiler'
    res_compiler, _ = trie.search_prefix("compiler", limit=5)
    assert len(res_compiler) == 1
    assert res_compiler[0]["id"] == 3

    # Non-existent prefix
    res_none, _ = trie.search_prefix("xyz", limit=5)
    assert len(res_none) == 0

def test_avl_tree_balance_and_range():
    tree = AVLTree()
    # Insert in order to test rotations
    tree.insert(2015, {"id": 1, "title": "Book 2015"})
    tree.insert(2018, {"id": 2, "title": "Book 2018"})
    tree.insert(2020, {"id": 3, "title": "Book 2020"})
    tree.insert(2022, {"id": 4, "title": "Book 2022"})
    tree.insert(2024, {"id": 5, "title": "Book 2024"})

    # Check height is balanced (height should be <= 3 for 5 nodes)
    stats = tree.get_stats()
    assert stats["tree_height"] <= 4
    assert stats["rotations_performed"] >= 1

    # Range query: 2018 to 2022
    range_res, comps, elapsed = tree.range_query(2018, 2022)
    assert len(range_res) == 3
    found_years = [r["id"] for r in range_res]
    assert 2 in found_years
    assert 3 in found_years
    assert 4 in found_years

def test_priority_queue():
    pq = MinHeapPriorityQueue()
    # Priority tuple: (negative_tier, timestamp) -> higher tier first
    pq.push((-3.0, 100), "Faculty User")
    pq.push((-1.0, 105), "Standard User A")
    pq.push((-2.0, 102), "Premium User")
    pq.push((-1.0, 101), "Standard User B") # Earlier timestamp than A

    # Extraction order
    assert pq.pop() == "Faculty User"
    assert pq.pop() == "Premium User"
    assert pq.pop() == "Standard User B"
    assert pq.pop() == "Standard User A"
    assert pq.is_empty() is True

def test_fifo_queue():
    fq = FIFOQueue()
    pos1 = fq.enqueue("Student A")
    pos2 = fq.enqueue("Student B")
    pos3 = fq.enqueue("Student C")

    assert pos1 == 1
    assert pos2 == 2
    assert pos3 == 3
    assert fq.size() == 3

    assert fq.dequeue() == "Student A"
    assert fq.peek() == "Student B"
    assert fq.dequeue() == "Student B"
    assert fq.dequeue() == "Student C"
    assert fq.dequeue() is None

def test_undo_stack():
    stack = Stack(max_capacity=10)
    cmd1 = UndoCommand("ADD_BOOK", "Book", 1, {}, "Add Book 1")
    cmd2 = UndoCommand("ISSUE_BOOK", "Loan", 2, {}, "Issue Book 1")

    stack.push(cmd1)
    stack.push(cmd2)
    assert stack.size() == 2

    popped = stack.pop()
    assert popped.action_type == "ISSUE_BOOK"
    assert stack.size() == 1

def test_knowledge_graph_traversal():
    graph = LibraryKnowledgeGraph()
    graph.add_node("book:1", "CLRS", "book")
    graph.add_node("author:1", "Cormen", "author")
    graph.add_node("category:1", "Algorithms", "category")
    graph.add_node("user:1", "Alice", "user")

    graph.add_edge("book:1", "author:1", "WRITTEN_BY")
    graph.add_edge("book:1", "category:1", "BELONGS_TO")
    graph.add_edge("user:1", "book:1", "BORROWED")

    bfs_res = graph.bfs("user:1", max_depth=2)
    assert bfs_res["total_visited"] == 4
    assert len(bfs_res["traversal_steps"]) == 4

    dfs_res = graph.dfs("user:1", max_depth=2)
    assert dfs_res["total_visited"] == 4

    path = graph.find_shortest_path("user:1", "author:1")
    assert path is not None
    assert len(path) == 3 # user:1 -> book:1 -> author:1
