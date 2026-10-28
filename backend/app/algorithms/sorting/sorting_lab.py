import time
from typing import List, Dict, Any, Tuple

class SortingMetrics:
    def __init__(self, name: str, complexity_time: str, complexity_space: str):
        self.name = name
        self.complexity_time = complexity_time
        self.complexity_space = complexity_space
        self.comparisons = 0
        self.swaps = 0
        self.execution_time_us = 0.0
        self.frames = [] # For visual step-by-step replay

    def to_dict(self) -> dict:
        return {
            "algorithm": self.name,
            "time_complexity": self.complexity_time,
            "space_complexity": self.complexity_space,
            "comparisons": self.comparisons,
            "swaps": self.swaps,
            "execution_time_us": round(self.execution_time_us, 3),
            "time_microseconds": round(self.execution_time_us, 3),
            "time_ms": round(self.execution_time_us / 1000.0, 4),
            "frames_count": len(self.frames)
        }

def _get_val(item: Any, field: str) -> Any:
    if isinstance(item, dict):
        return item.get(field, 0)
    return getattr(item, field, 0)

# 1. Bubble Sort
def bubble_sort(arr: List[Any], field: str = "val", capture_frames: bool = False) -> Tuple[List[Any], SortingMetrics]:
    metrics = SortingMetrics("Bubble Sort", "O(n²)", "O(1)")
    a = list(arr)
    n = len(a)
    start = time.perf_counter_ns()

    if capture_frames:
        metrics.frames.append({"arr": [_get_val(x, field) for x in a], "active": []})

    for i in range(n):
        swapped = False
        for j in range(0, n - i - 1):
            metrics.comparisons += 1
            if _get_val(a[j], field) > _get_val(a[j + 1], field):
                a[j], a[j + 1] = a[j + 1], a[j]
                metrics.swaps += 1
                swapped = True
                if capture_frames and len(metrics.frames) < 100:
                    metrics.frames.append({"arr": [_get_val(x, field) for x in a], "active": [j, j + 1]})
        if not swapped:
            break

    metrics.execution_time_us = (time.perf_counter_ns() - start) / 1000.0
    return a, metrics

# 2. Insertion Sort
def insertion_sort(arr: List[Any], field: str = "val", capture_frames: bool = False) -> Tuple[List[Any], SortingMetrics]:
    metrics = SortingMetrics("Insertion Sort", "O(n²)", "O(1)")
    a = list(arr)
    start = time.perf_counter_ns()

    for i in range(1, len(a)):
        key_item = a[i]
        key_val = _get_val(key_item, field)
        j = i - 1
        while j >= 0:
            metrics.comparisons += 1
            if _get_val(a[j], field) > key_val:
                a[j + 1] = a[j]
                metrics.swaps += 1
                j -= 1
                if capture_frames and len(metrics.frames) < 100:
                    metrics.frames.append({"arr": [_get_val(x, field) for x in a], "active": [j + 1]})
            else:
                break
        a[j + 1] = key_item

    metrics.execution_time_us = (time.perf_counter_ns() - start) / 1000.0
    return a, metrics

# 3. Selection Sort
def selection_sort(arr: List[Any], field: str = "val", capture_frames: bool = False) -> Tuple[List[Any], SortingMetrics]:
    metrics = SortingMetrics("Selection Sort", "O(n²)", "O(1)")
    a = list(arr)
    n = len(a)
    start = time.perf_counter_ns()

    for i in range(n):
        min_idx = i
        for j in range(i + 1, n):
            metrics.comparisons += 1
            if _get_val(a[j], field) < _get_val(a[min_idx], field):
                min_idx = j
        if min_idx != i:
            a[i], a[min_idx] = a[min_idx], a[i]
            metrics.swaps += 1
            if capture_frames and len(metrics.frames) < 100:
                metrics.frames.append({"arr": [_get_val(x, field) for x in a], "active": [i, min_idx]})

    metrics.execution_time_us = (time.perf_counter_ns() - start) / 1000.0
    return a, metrics

# 4. Merge Sort
def merge_sort(arr: List[Any], field: str = "val", capture_frames: bool = False) -> Tuple[List[Any], SortingMetrics]:
    metrics = SortingMetrics("Merge Sort", "O(n log n)", "O(n)")
    start = time.perf_counter_ns()

    def _merge_sort_rec(sub: List[Any]) -> List[Any]:
        if len(sub) <= 1:
            return sub
        mid = len(sub) // 2
        left = _merge_sort_rec(sub[:mid])
        right = _merge_sort_rec(sub[mid:])

        merged = []
        i = j = 0
        while i < len(left) and j < len(right):
            metrics.comparisons += 1
            if _get_val(left[i], field) <= _get_val(right[j], field):
                merged.append(left[i])
                i += 1
            else:
                merged.append(right[j])
                j += 1
                metrics.swaps += 1

        merged.extend(left[i:])
        merged.extend(right[j:])
        return merged

    sorted_arr = _merge_sort_rec(list(arr))
    metrics.execution_time_us = (time.perf_counter_ns() - start) / 1000.0
    return sorted_arr, metrics

# 5. Quick Sort
def quick_sort(arr: List[Any], field: str = "val", capture_frames: bool = False) -> Tuple[List[Any], SortingMetrics]:
    metrics = SortingMetrics("Quick Sort", "O(n log n)", "O(log n)")
    a = list(arr)
    start = time.perf_counter_ns()

    def _quick_sort_rec(low: int, high: int):
        if low < high:
            pivot = _get_val(a[high], field)
            i = low - 1
            for j in range(low, high):
                metrics.comparisons += 1
                if _get_val(a[j], field) <= pivot:
                    i += 1
                    a[i], a[j] = a[j], a[i]
                    metrics.swaps += 1
                    if capture_frames and len(metrics.frames) < 100:
                        metrics.frames.append({"arr": [_get_val(x, field) for x in a], "active": [i, j]})
            a[i + 1], a[high] = a[high], a[i + 1]
            metrics.swaps += 1
            pi = i + 1

            _quick_sort_rec(low, pi - 1)
            _quick_sort_rec(pi + 1, high)

    _quick_sort_rec(0, len(a) - 1)
    metrics.execution_time_us = (time.perf_counter_ns() - start) / 1000.0
    return a, metrics

# 6. Heap Sort
def heap_sort(arr: List[Any], field: str = "val", capture_frames: bool = False) -> Tuple[List[Any], SortingMetrics]:
    metrics = SortingMetrics("Heap Sort", "O(n log n)", "O(1)")
    a = list(arr)
    n = len(a)
    start = time.perf_counter_ns()

    def _heapify(sz: int, i: int):
        largest = i
        l = 2 * i + 1
        r = 2 * i + 2

        if l < sz:
            metrics.comparisons += 1
            if _get_val(a[l], field) > _get_val(a[largest], field):
                largest = l

        if r < sz:
            metrics.comparisons += 1
            if _get_val(a[r], field) > _get_val(a[largest], field):
                largest = r

        if largest != i:
            a[i], a[largest] = a[largest], a[i]
            metrics.swaps += 1
            if capture_frames and len(metrics.frames) < 100:
                metrics.frames.append({"arr": [_get_val(x, field) for x in a], "active": [i, largest]})
            _heapify(sz, largest)

    for i in range(n // 2 - 1, -1, -1):
        _heapify(n, i)

    for i in range(n - 1, 0, -1):
        a[i], a[0] = a[0], a[i]
        metrics.swaps += 1
        _heapify(i, 0)

    metrics.execution_time_us = (time.perf_counter_ns() - start) / 1000.0
    return a, metrics

def run_all_sorts(items: List[Any], field: str = "val", capture_frames: bool = False) -> List[Dict[str, Any]]:
    results = []
    algorithms = [
        ("Bubble Sort", bubble_sort, "O(n)", "O(n²)", "O(n²)", "O(1)", True),
        ("Insertion Sort", insertion_sort, "O(n)", "O(n²)", "O(n²)", "O(1)", True),
        ("Selection Sort", selection_sort, "O(n²)", "O(n²)", "O(n²)", "O(1)", False),
        ("Merge Sort", merge_sort, "O(n log n)", "O(n log n)", "O(n log n)", "O(n)", True),
        ("Quick Sort", quick_sort, "O(n log n)", "O(n log n)", "O(n²)", "O(log n)", False),
        ("Heap Sort", heap_sort, "O(n log n)", "O(n log n)", "O(n log n)", "O(1)", False),
    ]
    for name, sort_fn, c_best, c_avg, c_worst, s_comp, stable in algorithms:
        _, m = sort_fn(items, field=field, capture_frames=capture_frames)
        d = m.to_dict()
        d["complexity_best"] = c_best
        d["complexity_avg"] = c_avg
        d["complexity_worst"] = c_worst
        d["space_complexity"] = s_comp
        d["is_stable"] = stable
        if capture_frames:
            d["frames"] = m.frames
        results.append(d)
    return results
