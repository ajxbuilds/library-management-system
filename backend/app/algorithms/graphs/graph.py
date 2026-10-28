from collections import deque
from typing import Dict, List, Set, Optional, Tuple, Any

class GraphNode:
    def __init__(self, node_id: str, label: str, node_type: str, metadata: Optional[Dict[str, Any]] = None):
        self.node_id = node_id # e.g. "book:12", "author:3", "category:5", "user:7"
        self.label = label
        self.node_type = node_type
        self.metadata = metadata or {}

    def to_dict(self) -> dict:
        return {
            "id": self.node_id,
            "label": self.label,
            "type": self.node_type,
            "metadata": self.metadata
        }

class GraphEdge:
    def __init__(self, source: str, target: str, relationship: str, weight: float = 1.0):
        self.source = source
        self.target = target
        self.relationship = relationship # e.g. "WRITTEN_BY", "IN_CATEGORY", "BORROWED_BY", "SIMILAR_TO"
        self.weight = weight

    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "target": self.target,
            "relationship": self.relationship,
            "weight": self.weight
        }

class LibraryKnowledgeGraph:
    """
    Heterogeneous Library Knowledge Graph.
    Nodes: Books, Authors, Categories, Members.
    Edges: Relationships (Written By, Belongs To, Borrowed By, Co-borrowed).
    Implements:
    - BFS (Breadth-First Search)
    - DFS (Depth-First Search)
    - Shortest Path (Degrees of separation)
    - Graph-based Recommendation Engine
    """
    def __init__(self):
        self.nodes: Dict[str, GraphNode] = {}
        self.adjacency: Dict[str, List[GraphEdge]] = {}

    def add_node(self, node_id: str, label: str, node_type: str, metadata: Optional[Dict[str, Any]] = None) -> GraphNode:
        if node_id not in self.nodes:
            node = GraphNode(node_id, label, node_type, metadata)
            self.nodes[node_id] = node
            self.adjacency[node_id] = []
        else:
            self.nodes[node_id].label = label
            if metadata:
                self.nodes[node_id].metadata.update(metadata)
        return self.nodes[node_id]

    def add_edge(self, source: str, target: str, relationship: str, weight: float = 1.0, bidirectional: bool = True) -> None:
        if source not in self.nodes or target not in self.nodes:
            return

        edge = GraphEdge(source, target, relationship, weight)
        self.adjacency[source].append(edge)

        if bidirectional:
            reverse_edge = GraphEdge(target, source, relationship, weight)
            self.adjacency[target].append(reverse_edge)

    def bfs(self, start_id: str, max_depth: int = 2, target_type: Optional[str] = None, max_steps: int = 24) -> Dict[str, Any]:
        """
        Breadth-First Search traversal.
        Explores neighbor by neighbor layer-by-layer using a FIFO Queue.
        Captures live queue snapshots and plain English step explanations.
        """
        if start_id not in self.nodes:
            return {"error": f"Node {start_id} not found", "steps": []}

        visited: Set[str] = {start_id}
        queue = deque([(start_id, 0, None)]) # (node_id, depth, parent_id)
        traversal_steps: List[Dict[str, Any]] = []
        nodes_at_depth: Dict[int, List[str]] = {0: [start_id]}
        branch_limit = 4

        while queue and len(traversal_steps) < max_steps:
            curr_id, depth, parent_id = queue.popleft()
            curr_node = self.nodes[curr_id]

            queue_snapshot = [
                {
                    "id": item[0],
                    "label": self.nodes[item[0]].label,
                    "type": self.nodes[item[0]].node_type
                }
                for item in queue
            ]

            parent_label = self.nodes[parent_id].label if parent_id and parent_id in self.nodes else None
            action_desc = (
                f"Origin vertex '{curr_node.label}' ({curr_node.node_type}) selected at depth 0."
                if depth == 0 else
                f"Dequeued '{curr_node.label}' ({curr_node.node_type}) at depth {depth} from FIFO Queue."
            )

            step_info = {
                "step": len(traversal_steps) + 1,
                "node_id": curr_id,
                "label": curr_node.label,
                "type": curr_node.node_type,
                "depth": depth,
                "parent_id": parent_id,
                "parent_label": parent_label,
                "action_description": action_desc,
                "queue_snapshot": queue_snapshot
            }
            traversal_steps.append(step_info)

            if depth < max_depth and len(traversal_steps) + len(queue) < max_steps + 6:
                edges = self.adjacency.get(curr_id, [])
                # Prioritize non-book nodes (categories & authors)
                sorted_edges = sorted(
                    edges,
                    key=lambda e: 0 if self.nodes.get(e.target, {}).node_type in ("category", "author") else 1
                )
                added = 0
                for edge in sorted_edges:
                    neighbor_id = edge.target
                    t_node = self.nodes.get(neighbor_id)
                    if t_node and t_node.node_type == "user" and not start_id.startswith("user:"):
                        continue
                    if neighbor_id not in visited and len(traversal_steps) + len(queue) < max_steps + 6:
                        visited.add(neighbor_id)
                        queue.append((neighbor_id, depth + 1, curr_id))
                        nodes_at_depth.setdefault(depth + 1, []).append(neighbor_id)
                        added += 1
                        if added >= branch_limit:
                            break

        matching_nodes = [
            self.nodes[nid].to_dict()
            for nid in visited
            if not target_type or self.nodes[nid].node_type == target_type
        ]

        return {
            "algorithm": "Breadth-First Search (BFS)",
            "start_node": self.nodes[start_id].to_dict(),
            "max_depth": max_depth,
            "total_visited": len(traversal_steps),
            "traversal_steps": traversal_steps,
            "steps": traversal_steps,
            "nodes_at_depth": nodes_at_depth,
            "matching_nodes": matching_nodes
        }

    def dfs(self, start_id: str, max_depth: int = 2, max_steps: int = 24) -> Dict[str, Any]:
        """
        Depth-First Search traversal.
        Explores down one branch as deep as possible before backtracking using a LIFO Stack.
        Captures live stack snapshots and plain English step explanations.
        """
        if start_id not in self.nodes:
            return {"error": f"Node {start_id} not found", "steps": []}

        visited: Set[str] = set()
        traversal_steps: List[Dict[str, Any]] = []
        stack_call: List[str] = []
        branch_limit = 4

        def _dfs_helper(curr_id: str, depth: int, parent_id: Optional[str] = None):
            if depth > max_depth or curr_id in visited or len(traversal_steps) >= max_steps:
                return
            visited.add(curr_id)
            curr_node = self.nodes[curr_id]
            stack_call.append(curr_id)

            stack_snapshot = [
                {
                    "id": nid,
                    "label": self.nodes[nid].label,
                    "type": self.nodes[nid].node_type
                }
                for nid in reversed(stack_call)
            ]

            parent_label = self.nodes[parent_id].label if parent_id and parent_id in self.nodes else None
            action_desc = (
                f"Starting DFS branch from '{curr_node.label}' ({curr_node.node_type}) at depth 0."
                if depth == 0 else
                f"Popped/Diving deeper into '{curr_node.label}' ({curr_node.node_type}) at depth {depth}."
            )

            traversal_steps.append({
                "step": len(traversal_steps) + 1,
                "node_id": curr_id,
                "label": curr_node.label,
                "type": curr_node.node_type,
                "depth": depth,
                "parent_id": parent_id,
                "parent_label": parent_label,
                "action_description": action_desc,
                "stack_snapshot": stack_snapshot
            })

            edges = self.adjacency.get(curr_id, [])
            sorted_edges = sorted(
                edges,
                key=lambda e: 0 if self.nodes.get(e.target, {}).node_type in ("category", "author") else 1
            )

            added = 0
            for edge in sorted_edges:
                target_id = edge.target
                t_node = self.nodes.get(target_id)
                if t_node and t_node.node_type == "user" and not start_id.startswith("user:"):
                    continue
                if target_id not in visited and len(traversal_steps) < max_steps:
                    _dfs_helper(target_id, depth + 1, curr_id)
                    added += 1
                    if added >= branch_limit:
                        break

            stack_call.pop()

        _dfs_helper(start_id, 0, None)

        return {
            "algorithm": "Depth-First Search (DFS)",
            "start_node": self.nodes[start_id].to_dict(),
            "max_depth": max_depth,
            "total_visited": len(traversal_steps),
            "traversal_steps": traversal_steps,
            "steps": traversal_steps
        }

    def find_shortest_path(self, start_id: str, target_id: str) -> Optional[List[Dict[str, Any]]]:
        """Finds shortest unweighted path using BFS queue."""
        if start_id not in self.nodes or target_id not in self.nodes:
            return None

        queue = deque([[start_id]])
        visited = {start_id}

        while queue:
            path = queue.popleft()
            node = path[-1]

            if node == target_id:
                return [self.nodes[nid].to_dict() for nid in path]

            for edge in self.adjacency.get(node, []):
                neighbor = edge.target
                if neighbor not in visited:
                    visited.add(neighbor)
                    new_path = list(path)
                    new_path.append(neighbor)
                    queue.append(new_path)
        return None

    def get_graph_recommendations(self, user_id: str, limit: int = 6) -> List[Dict[str, Any]]:
        """
        Graph-based recommendation:
        1. Find all books borrowed by user (degree 1)
        2. From those books, find connected categories, authors, and co-borrowing users (degree 2)
        3. From those, find candidate books not yet read by user (degree 3)
        4. Score by graph connectivity weight.
        """
        user_node_id = f"user:{user_id}" if not user_id.startswith("user:") else user_id
        if user_node_id not in self.nodes:
            return []

        borrowed_book_ids = set()
        for edge in self.adjacency.get(user_node_id, []):
            if edge.relationship == "BORROWED_BY" or self.nodes.get(edge.target, {}).node_type == "book":
                borrowed_book_ids.add(edge.target)

        # Traverse neighbors of borrowed books
        book_scores: Dict[str, float] = {}

        for b_id in borrowed_book_ids:
            for edge in self.adjacency.get(b_id, []):
                connector_id = edge.target # Category, Author, or another User
                connector_weight = edge.weight

                # From connector, find other books
                for second_edge in self.adjacency.get(connector_id, []):
                    candidate_id = second_edge.target
                    if candidate_id != b_id and candidate_id not in borrowed_book_ids:
                        candidate_node = self.nodes.get(candidate_id)
                        if candidate_node and candidate_node.node_type == "book":
                            score_increment = connector_weight * second_edge.weight
                            book_scores[candidate_id] = book_scores.get(candidate_id, 0.0) + score_increment

        sorted_books = sorted(book_scores.items(), key=lambda x: x[1], reverse=True)
        recommended = []
        for b_id, score in sorted_books[:limit]:
            node = self.nodes.get(b_id)
            if node:
                data = dict(node.metadata)
                data["recommendation_score"] = round(score, 2)
                data["reason"] = "Graph Discovery (shared categories/authors/co-borrowers)"
                recommended.append(data)
        return recommended

    def export_subgraph(self, center_id: Optional[str] = None, max_nodes: int = 10) -> Dict[str, Any]:
        """
        Exports a clean, focused, non-overlapping subgraph for visualization.
        For category centers, builds a textbook 3-tier tree (Category -> Curated Books -> Authors).
        """
        if not center_id or center_id not in self.nodes:
            center_id = "category:1"

        visited_nodes: Set[str] = {center_id}

        # If centered on category or a book in a major category, build a clean 3-tier tree
        if center_id.startswith("category:"):
            cat_books = [
                e.target for e in self.adjacency.get(center_id, [])
                if self.nodes.get(e.target, {}).node_type == "book"
            ]
            # Prioritize flagship curated books (id <= 15)
            curated_books = [b for b in cat_books if b.startswith("book:") and int(b.split(":")[1]) <= 15][:3]
            if len(curated_books) < 3:
                curated_books = cat_books[:3]

            for b in curated_books:
                visited_nodes.add(b)
                for e in self.adjacency.get(b, []):
                    t_node = self.nodes.get(e.target)
                    if t_node and t_node.node_type == "author":
                        visited_nodes.add(e.target)
        else:
            # Standard bounded expansion capped strictly at max_nodes
            queue = deque([center_id])
            while queue and len(visited_nodes) < max_nodes:
                curr = queue.popleft()
                for edge in self.adjacency.get(curr, []):
                    t_node = self.nodes.get(edge.target)
                    if t_node and t_node.node_type == "user":
                        continue
                    if edge.target not in visited_nodes and len(visited_nodes) < max_nodes:
                        visited_nodes.add(edge.target)
                        queue.append(edge.target)

        sub_nodes = [self.nodes[nid].to_dict() for nid in visited_nodes]
        sub_edges = []
        seen = set()

        for u in visited_nodes:
            for edge in self.adjacency.get(u, []):
                if edge.target in visited_nodes:
                    pair = tuple(sorted([u, edge.target]))
                    if pair not in seen:
                        seen.add(pair)
                        sub_edges.append(edge.to_dict())

        return {
            "center_id": center_id,
            "nodes": sub_nodes,
            "edges": sub_edges
        }
