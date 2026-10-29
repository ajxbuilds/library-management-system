import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    # Lifespan startup triggers and synchronizes DSA Engine with DB
    with TestClient(app) as c:
        yield c

def test_health_and_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["dsa_engine"] == "ONLINE"

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"
    assert "data_structures" in health.json()

def test_login_flow(client):
    resp = client.post("/api/auth/login", json={
        "username_or_email": "admin",
        "password": "admin123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

def test_search_and_autocomplete(client):
    # Trie Autocomplete
    ac_resp = client.get("/api/books/autocomplete?prefix=algo")
    assert ac_resp.status_code == 200
    ac_data = ac_resp.json()
    assert "suggestions" in ac_data
    assert "elapsed_microseconds" in ac_data

    # Multi-factor ranked search
    search_resp = client.get("/api/books/search?q=algorithms")
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert search_data["total_results"] > 0
    assert "results" in search_data
    assert "relevance_score" in search_data["results"][0]

def test_avl_range_query(client):
    range_resp = client.get("/api/books/avl/range?field=year&min_val=2018&max_val=2024")
    assert range_resp.status_code == 200
    range_data = range_resp.json()
    assert range_data["count"] > 0
    assert range_data["comparisons"] > 0

def test_algorithm_search_comparison(client):
    resp = client.post("/api/algorithms/search/compare", json={
        "dataset_size": 1000
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 3
    algorithms = [r["algorithm"] for r in data["results"]]
    assert "Linear Search" in algorithms
    assert "Binary Search" in algorithms
    assert "Hash Search" in algorithms

def test_algorithm_sort_comparison(client):
    resp = client.post("/api/algorithms/sort/compare", json={
        "record_count": 25,
        "field": "rating",
        "capture_frames": True
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 6
    for item in data["results"]:
        assert item["comparisons"] >= 0
        assert item["execution_time_us"] >= 0.0

def test_graph_traversal(client):
    resp = client.post("/api/algorithms/graph/traverse", json={
        "start_node_id": "book:1",
        "max_depth": 2,
        "algorithm": "BFS"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "traversal_steps" in data
    assert data["total_visited"] > 0

def test_student_issue_and_return_flow(client):
    # 1. Login as student
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "student",
        "password": "student123"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    student_id = login_resp.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Ensure student has borrowing quota available and book 2 is clean
    my_loans = client.get("/api/loans/my", headers=headers).json()
    for l in my_loans:
        if (l["book_id"] == 2 or len(my_loans) >= 4) and l["status"] == "active":
            client.post("/api/loans/return", json={"loan_id": l["id"]}, headers=headers)

    # 2. Student cannot issue a book on behalf of another user
    forbidden_resp = client.post("/api/loans/issue", json={
        "user_id": 1,
        "book_id": 2
    }, headers=headers)
    assert forbidden_resp.status_code == 403

    # 3. Student issues book 2 for themselves
    issue_resp = client.post("/api/loans/issue", json={
        "book_id": 2,
        "loan_days": 14
    }, headers=headers)
    assert issue_resp.status_code == 200
    loan_data = issue_resp.json()
    assert loan_data["success"] is True
    loan_id = loan_data["loan_id"]

    # 4. Check active loans in my loans
    my_loans = client.get("/api/loans/my", headers=headers)
    assert my_loans.status_code == 200
    my_loan_ids = [l["id"] for l in my_loans.json()]
    assert loan_id in my_loan_ids

    # 5. Student cannot return another user's loan
    admin_login = client.post("/api/auth/login", json={
        "username_or_email": "admin",
        "password": "admin123"
    })
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    admin_issue = client.post("/api/loans/issue", json={
        "user_id": 1,
        "book_id": 3,
        "loan_days": 14
    }, headers=admin_headers)
    admin_loan_id = admin_issue.json()["loan_id"]

    forbidden_return = client.post("/api/loans/return", json={
        "loan_id": admin_loan_id
    }, headers=headers)
    assert forbidden_return.status_code == 403

    # Clean up admin loan
    client.post("/api/loans/return", json={"loan_id": admin_loan_id}, headers=admin_headers)

    # 6. Student returns their own loan
    return_resp = client.post("/api/loans/return", json={
        "loan_id": loan_id
    }, headers=headers)
    assert return_resp.status_code == 200
    assert return_resp.json()["success"] is True
