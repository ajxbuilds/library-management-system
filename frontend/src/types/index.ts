export type UserRole = 'admin' | 'librarian' | 'student';
export type MemberTier = 'standard' | 'premium' | 'faculty';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  member_tier: MemberTier;
  borrow_limit: number;
  is_active: boolean;
  created_at: string;
}

export interface Book {
  id: number;
  isbn: string;
  title: string;
  author_id: number;
  author_name?: string;
  category_id: number;
  category_name?: string;
  publisher_name?: string;
  publication_year: number;
  edition?: string;
  description?: string;
  keywords?: string;
  cover_image?: string;
  total_copies: number;
  available_copies: number;
  issued_copies: number;
  reserved_copies: number;
  borrow_count: number;
  average_rating: number;
  created_at: string;
  relevance_score?: number;
  match_reasons?: string[];
}

export interface Author {
  id: number;
  name: string;
  bio?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Loan {
  id: number;
  user_id: number;
  book_id: number;
  book_copy_id: number;
  issue_date: string;
  due_date: string;
  return_date?: string;
  status: 'active' | 'returned' | 'overdue';
  renewal_count: number;
  book_title?: string;
  user_name?: string;
  fine_amount?: number;
}

export interface Reservation {
  id: number;
  user_id: number;
  book_id: number;
  queue_position: number;
  priority_score: number;
  status: 'pending' | 'ready' | 'collected' | 'expired' | 'cancelled';
  created_at: string;
  ready_until?: string;
  book_title?: string;
  user_name?: string;
}

export interface Fine {
  id: number;
  user_id: number;
  loan_id: number;
  amount: number;
  days_overdue: number;
  status: 'pending' | 'paid' | 'waived';
  paid_at?: string;
  waived_by?: string;
  waived_reason?: string;
  created_at: string;
  book_title?: string;
  user_name?: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  user_id?: number;
  username?: string;
  action: string;
  entity: string;
  entity_id?: number;
  details?: string;
  timestamp: string;
}

export interface AutocompleteSuggestion {
  id: number;
  type: 'book' | 'author' | 'category';
  title: string;
  author?: string;
  category?: string;
  popularity?: number;
  rating?: number;
}

export interface SearchComparisonResult {
  algorithm: string;
  time_complexity: string;
  space_complexity: string;
  comparisons: number;
  execution_time_us: number;
  speedup_vs_linear: string;
  found: boolean;
}

export interface SortMetricItem {
  algorithm: string;
  time_complexity: string;
  space_complexity: string;
  comparisons: number;
  swaps: number;
  execution_time_us: number;
  frames_count: number;
  frames?: Array<{ arr: number[]; active: number[] }>;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  metadata?: Record<string, any>;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export interface GraphTraversalStep {
  step: number;
  node_id: string;
  label: string;
  type: string;
  depth: number;
}
