export type UserStatus = 'working' | 'busy' | 'in_meeting' | 'vacation' | 'offline';

export interface Education {
  id: number;
  user_id: number;
  level: string;
  institution: string;
  passing_year: string | null;
  result: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserCurrentLeave {
  id: number;
  type: string;
  slug: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  can_view_all_tasks: boolean;
  avatar: string | null;
  status: UserStatus;
  is_on_leave?: boolean;
  current_leave?: UserCurrentLeave | null;
  phone?: string | null;
  phone2?: string | null;
  department?: string | null;
  location?: string | null;
  present_village?: string | null;
  present_city?: string | null;
  present_thana?: string | null;
  present_post_office?: string | null;
  present_division?: string | null;
  present_country?: string | null;
  permanent_village?: string | null;
  permanent_city?: string | null;
  permanent_thana?: string | null;
  permanent_post_office?: string | null;
  permanent_division?: string | null;
  permanent_country?: string | null;
  same_as_permanent?: boolean;
  password_changed?: boolean;
  cv_path?: string | null;
  skills?: string[] | null;
  profile_completed?: boolean;
  profile_completion?: number;
  educations?: Education[];
  created_at: string;
  updated_at?: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: number;
  name: string;
  color: string;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_by: number;
  start_date: string | null;
  end_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  assignees?: User[];
  creator?: User;
  comments?: Comment[];
  attachments?: Attachment[];
  subtasks?: Subtask[];
  labels?: Label[];
  dependencies?: { id: number; title: string; status: string }[];
  dependents?: { id: number; title: string; status: string }[];
}

export type TaskStatus = string;

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CommentReaction {
  id: number;
  comment_id: number;
  user_id: number;
  emoji: string;
  user?: { id: number; name: string };
}

export interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  body: string;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  reactions?: CommentReaction[];
}

export interface Attachment {
  id: number;
  task_id: number;
  user_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  user?: User;
}

export interface Notification {
  id: number;
  user_id: number;
  task_id: number | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  deleted_at?: string | null;
  task?: { id: number; title: string; status: string } | null;
}

export interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  subject: string;
  body: string;
  attachment_path: string | null;
  attachment_name: string | null;
  is_read: boolean;
  deleted_by_sender: boolean;
  deleted_by_recipient: boolean;
  created_at: string;
  updated_at: string;
  sender?: User;
  recipient?: User;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  task_id: number | null;
  action: string;
  description: string;
  created_at: string;
  user?: User;
  task?: { id: number; title: string };
}

export interface TimeEntry {
  id: number;
  task_id: number;
  user_id: number;
  description: string | null;
  started_at: string;
  stopped_at: string | null;
  duration_minutes: number | null;
  calculated_duration?: number;
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface RecurringTask {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: TaskPriority;
  created_by: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string;
  next_run: string;
  is_active: boolean;
  assignee_ids: number[];
  label_ids: number[];
  creator?: User;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplate {
  id: number;
  name: string;
  title_pattern: string | null;
  description: string | null;
  priority: TaskPriority;
  created_by: number;
  creator?: User;
  created_at: string;
  updated_at: string;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveType {
  id: number;
  name: string;
  slug: string;
  max_days: number;
  is_paid: boolean;
  carry_forward: boolean;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day: boolean;
  half_day_period: 'first_half' | 'second_half' | null;
  reason: string;
  status: LeaveStatus;
  attachment: string | null;
  admin_comment: string | null;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  leave_type?: LeaveType;
  approver?: User;
}

export interface LeaveBalance {
  id: number;
  user_id: number;
  leave_type_id: number;
  year: number;
  total_days: number;
  used_days: number;
  carried_forward: number;
  remaining_days: number;
  leave_type?: LeaveType;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export const LEAVE_STATUSES: { value: LeaveStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: '#f59e0b' },
  { value: 'approved', label: 'Approved', color: '#10b981' },
  { value: 'rejected', label: 'Rejected', color: '#ef4444' },
  { value: 'cancelled', label: 'Cancelled', color: '#6b7280' },
];

// Invoice System Types
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'unpaid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_banking';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Client {
  id: number;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_by: number | null;
  invoices_count?: number;
  creator?: User;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  name: string;
  description: string | null;
  quantity: number;
  rate: number;
  tax: number;
  discount: number;
  subtotal: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  created_by: number | null;
  total_paid?: number;
  balance_due?: number;
  client?: Client;
  items?: InvoiceItem[];
  payments?: Payment[];
  creator?: User;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  invoice_id: number;
  payment_method: PaymentMethod;
  payment_date: string;
  transaction_id: string | null;
  amount: number;
  status: PaymentStatus;
  invoice?: Invoice;
  created_at: string;
  updated_at: string;
}

export interface InvoiceSetting {
  id: number;
  company_name: string | null;
  company_logo: string | null;
  currency: string;
  tax_percentage: number;
  invoice_prefix: string;
  footer_note: string | null;
}

export interface InvoiceDashboardStats {
  total_invoices: number;
  paid_invoices: number;
  unpaid_invoices: number;
  overdue_invoices: number;
  draft_invoices: number;
  total_revenue: number;
  total_outstanding: number;
  monthly_revenue: Record<number, number>;
  yearly_revenue: { year: number; revenue: number }[];
  recent_invoices: Invoice[];
}

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: '#6b7280' },
  { value: 'sent', label: 'Sent', color: '#3b82f6' },
  { value: 'paid', label: 'Paid', color: '#10b981' },
  { value: 'unpaid', label: 'Unpaid', color: '#f59e0b' },
  { value: 'overdue', label: 'Overdue', color: '#ef4444' },
  { value: 'cancelled', label: 'Cancelled', color: '#6b7280' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_banking', label: 'Mobile Banking' },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: '#f59e0b' },
  { value: 'paid', label: 'Paid', color: '#10b981' },
  { value: 'failed', label: 'Failed', color: '#ef4444' },
  { value: 'refunded', label: 'Refunded', color: '#8b5cf6' },
];

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export const TASK_STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: '#6b7280' },
  { value: 'todo', label: 'To Do', color: '#3b82f6' },
  { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { value: 'review', label: 'Review', color: '#8b5cf6' },
  { value: 'complete', label: 'Complete', color: '#10b981' },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const USER_STATUSES: { value: UserStatus; label: string; color: string }[] = [
  { value: 'working', label: 'Working', color: '#10b981' },
  { value: 'busy', label: 'Busy', color: '#ef4444' },
  { value: 'in_meeting', label: 'In Meeting', color: '#f59e0b' },
  { value: 'vacation', label: 'Vacation', color: '#8b5cf6' },
  { value: 'offline', label: 'Offline', color: '#6b7280' },
];
