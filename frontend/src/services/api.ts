const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  
  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const err = await response.json();
      errorDetail = err.detail || JSON.stringify(err);
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

export const api = {
  // Auth
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<any>('/auth/me'),

  // Books & Search Engine
  getBooks: (params: { skip?: number; limit?: number; category_id?: number; sort_by?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.skip !== undefined) q.append('skip', String(params.skip));
    if (params.limit !== undefined) q.append('limit', String(params.limit));
    if (params.category_id !== undefined) q.append('category_id', String(params.category_id));
    if (params.sort_by) q.append('sort_by', params.sort_by);
    return request<any[]>(`/books?${q.toString()}`);
  },
  searchBooks: (query: string, limit: number = 20) => request<any>(`/books/search?q=${encodeURIComponent(query)}&limit=${limit}`),
  autocomplete: (prefix: string, limit: number = 8) => request<any>(`/books/autocomplete?prefix=${encodeURIComponent(prefix)}&limit=${limit}`),
  avlRangeQuery: (field: string, minVal: number, maxVal: number) => 
    request<any>(`/books/avl/range?field=${field}&min_val=${minVal}&max_val=${maxVal}`),
  hashLookup: (params: { isbn?: string; book_id?: number }) => {
    const q = new URLSearchParams();
    if (params.isbn) q.append('isbn', params.isbn);
    if (params.book_id) q.append('book_id', String(params.book_id));
    return request<any>(`/books/lookup/hash?${q.toString()}`);
  },
  getBookById: (id: number) => request<any>(`/books/${id}`),
  createBook: (data: any) => request<any>('/books', { method: 'POST', body: JSON.stringify(data) }),
  deleteBook: (id: number) => request<any>(`/books/${id}`, { method: 'DELETE' }),
  getAuthors: () => request<any[]>('/books/meta/authors'),
  getCategories: () => request<any[]>('/books/meta/categories'),

  // Loans
  issueBook: (userId: number, bookId: number, loanDays: number = 14) =>
    request<any>('/loans/issue', { method: 'POST', body: JSON.stringify({ user_id: userId, book_id: bookId, loan_days: loanDays }) }),
  returnBook: (loanId: number) =>
    request<any>('/loans/return', { method: 'POST', body: JSON.stringify({ loan_id: loanId }) }),
  getActiveLoans: () => request<any[]>('/loans/active'),
  getMyLoans: () => request<any[]>('/loans/my'),
  getUserLoans: (userId: number) => request<any[]>(`/loans/user/${userId}`),
  seedDemoCirculation: () => request<any>('/loans/demo-seed', { method: 'POST' }),
  clearDemoCirculation: () => request<any>('/loans/demo-clear', { method: 'POST' }),

  // Reservations
  reserveBook: (userId: number, bookId: number) =>
    request<any>('/reservations', { method: 'POST', body: JSON.stringify({ user_id: userId, book_id: bookId }) }),
  getMyReservations: (activeOnly: boolean = true) => request<any[]>(`/reservations/my?active_only=${activeOnly}`),
  getBookQueue: (bookId: number) => request<any>(`/reservations/book/${bookId}/queue`),
  getActiveQueues: () => request<any[]>('/reservations/active-queues'),
  cancelReservation: (id: number) => request<any>(`/reservations/${id}`, { method: 'DELETE' }),
  resetMyReservations: () => request<any>('/reservations/reset-my', { method: 'POST' }),

  // Fines
  getAllFines: (sortByHeap: boolean = true) => request<any[]>(`/fines?sort_by_heap=${sortByHeap}`),
  getMyFines: () => request<any[]>('/fines/my'),
  getFinesHeap: () => request<any>('/fines/heap'),
  payFine: (id: number) => request<any>(`/fines/${id}/pay`, { method: 'POST' }),
  waiveFine: (id: number, reason: string) =>
    request<any>('/fines/waive', { method: 'POST', body: JSON.stringify({ fine_id: id, reason }) }),

  // Recommendations
  getRecommendations: (limit: number = 8) => request<any>(`/recommendations?limit=${limit}`),

  // DSA Performance Lab
  getDSAStats: () => request<any>('/algorithms/stats'),
  compareSearch: (datasetSize: number, targetId?: number) =>
    request<any>('/algorithms/search/compare', { method: 'POST', body: JSON.stringify({ dataset_size: datasetSize, target_id: targetId }) }),
  getSearchBenchmarkSuite: () => request<any>('/algorithms/search/benchmark-suite'),
  compareSort: (recordCount: number, field: string = 'rating', captureFrames: boolean = true) =>
    request<any>('/algorithms/sort/compare', { method: 'POST', body: JSON.stringify({ record_count: recordCount, field, capture_frames: captureFrames }) }),
  traverseGraph: (startNodeId: string, algorithm: string = 'BFS', maxDepth: number = 2) =>
    request<any>('/algorithms/graph/traverse', { method: 'POST', body: JSON.stringify({ start_node_id: startNodeId, algorithm, max_depth: maxDepth }) }),
  getGraphSubgraph: (centerId?: string, maxNodes: number = 35) => {
    const q = new URLSearchParams();
    if (centerId) q.append('center_id', centerId);
    q.append('max_nodes', String(maxNodes));
    return request<any>(`/algorithms/graph/subgraph?${q.toString()}`);
  },
  undoLastAction: () => request<any>('/algorithms/undo', { method: 'POST' }),
  getUndoStack: () => request<any>('/algorithms/undo/stack'),
  getRecentlyReturned: () => request<any>('/algorithms/recently-returned'),

  // Analytics
  getDashboardSummary: () => request<any>('/analytics/dashboard-summary'),
  getChartsData: () => request<any>('/analytics/charts'),

  // Notifications
  getNotifications: () => request<any>('/notifications'),
  markNotificationRead: (id: number) => request<any>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request<any>('/notifications/read-all', { method: 'POST' }),

  // Audit
  getAuditLogs: (skip: number = 0, limit: number = 50) => request<any>(`/audit?skip=${skip}&limit=${limit}`),

  // Members
  getMembers: (role?: string) => {
    const q = new URLSearchParams();
    if (role) q.append('role', role);
    return request<any[]>(`/members?${q.toString()}`);
  }
};
