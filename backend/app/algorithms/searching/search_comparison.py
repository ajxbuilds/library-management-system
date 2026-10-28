import time
import random
from typing import List, Dict, Any, Tuple, Optional
from app.algorithms.hashing.hash_table import CustomHashMap

def linear_search(items: List[Dict[str, Any]], key: str, target: Any) -> Tuple[Optional[Dict[str, Any]], int, float]:
    """
    Linear Search: O(n)
    Iterates sequentially through items until match found.
    Returns: (found_item, comparisons, time_microseconds)
    """
    start = time.perf_counter_ns()
    comparisons = 0
    found = None
    for item in items:
        comparisons += 1
        if item.get(key) == target:
            found = item
            break
    elapsed_us = (time.perf_counter_ns() - start) / 1000.0
    return found, comparisons, elapsed_us

def binary_search(sorted_items: List[Dict[str, Any]], key: str, target: Any) -> Tuple[Optional[Dict[str, Any]], int, float]:
    """
    Binary Search: O(log n)
    Requires sorted array. Halves search space each comparison.
    Returns: (found_item, comparisons, time_microseconds)
    """
    start = time.perf_counter_ns()
    low = 0
    high = len(sorted_items) - 1
    comparisons = 0
    found = None

    while low <= high:
        comparisons += 1
        mid = (low + high) // 2
        mid_val = sorted_items[mid].get(key)

        if mid_val == target:
            found = sorted_items[mid]
            break
        elif mid_val < target:
            low = mid + 1
        else:
            high = mid - 1

    elapsed_us = (time.perf_counter_ns() - start) / 1000.0
    return found, comparisons, elapsed_us

def hash_search(hash_map: CustomHashMap, target: Any) -> Tuple[Optional[Any], int, float]:
    """
    Hash Search: O(1) average
    Direct bucket index computation via hash function.
    Returns: (found_item, comparisons, time_microseconds)
    """
    return hash_map.get_with_metrics(target)

def run_comparative_benchmark(dataset_size: int = 10000, target_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Runs an empirical benchmark comparing Linear Search, Binary Search, and Hash Search
    for a given dataset size (e.g. 100, 1000, 10000, 100000).
    """
    # 1. Synthesize dataset
    data = []
    hash_map = CustomHashMap(initial_capacity=max(64, dataset_size * 2))

    for i in range(1, dataset_size + 1):
        item = {
            "id": i,
            "title": f"Algorithmic Book Volume {i}",
            "isbn": f"978-0-{i:06d}-1",
            "year": 2000 + (i % 25)
        }
        data.append(item)
        hash_map.put(i, item)

    # Choose target near the 90th percentile to show realistic worst-case search distance
    if target_id is None:
        target_id = int(dataset_size * 0.92)

    # Sorted dataset for binary search (already sorted by id)
    sorted_data = data

    # 2. Execute Linear Search
    lin_res, lin_comp, lin_time = linear_search(data, "id", target_id)

    # 3. Execute Binary Search
    bin_res, bin_comp, bin_time = binary_search(sorted_data, "id", target_id)

    # 4. Execute Hash Search
    hash_res, hash_comp, hash_time = hash_search(hash_map, target_id)

    return {
        "dataset_size": dataset_size,
        "target_id": target_id,
        "linear": {
            "time_microseconds": round(lin_time, 3),
            "execution_time_us": round(lin_time, 3),
            "comparisons": lin_comp,
            "found": lin_res is not None
        },
        "binary": {
            "time_microseconds": round(bin_time, 3),
            "execution_time_us": round(bin_time, 3),
            "comparisons": bin_comp,
            "found": bin_res is not None
        },
        "hash_table": {
            "time_microseconds": round(hash_time, 3),
            "execution_time_us": round(hash_time, 3),
            "comparisons": hash_comp,
            "found": hash_res is not None
        },
        "results": [
            {
                "algorithm": "Linear Search",
                "time_complexity": "O(n)",
                "space_complexity": "O(1)",
                "comparisons": lin_comp,
                "execution_time_us": round(lin_time, 3),
                "speedup_vs_linear": "1.0x (Baseline)",
                "found": lin_res is not None
            },
            {
                "algorithm": "Binary Search",
                "time_complexity": "O(log n)",
                "space_complexity": "O(1)",
                "comparisons": bin_comp,
                "execution_time_us": round(bin_time, 3),
                "speedup_vs_linear": f"{round(lin_time / bin_time, 1)}x" if bin_time > 0 else ">100x",
                "found": bin_res is not None
            },
            {
                "algorithm": "Hash Search",
                "time_complexity": "O(1) average",
                "space_complexity": "O(n)",
                "comparisons": hash_comp,
                "execution_time_us": round(hash_time, 3),
                "speedup_vs_linear": f"{round(lin_time / hash_time, 1)}x" if hash_time > 0 else ">500x",
                "found": hash_res is not None
            }
        ]
    }

def run_multi_size_benchmark() -> List[Dict[str, Any]]:
    """Runs benchmark across 100, 1K, 10K, and 100K dataset sizes."""
    sizes = [100, 1000, 10000, 100000]
    suite = []
    for sz in sizes:
        suite.append(run_comparative_benchmark(sz))
    return suite
