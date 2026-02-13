export type UserStatus = 'working' | 'busy' | 'in_meeting' | 'vacation' | 'offline';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  can_view_all_tasks: boolean;
  avatar: string | null;
  status: UserStatus;
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: number | null;
  created_by: number;
  start_date: string | null;
  end_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  assignee?: User | null;
  creator?: User;
  comments?: Comment[];
  attachments?: Attachment[];
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'complete';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  body: string;
  created_at: string;
  updated_at: string;
  user?: User;
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
  task?: { id: number; title: string; status: string } | null;
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
