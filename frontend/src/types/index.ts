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

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  can_view_all_tasks: boolean;
  avatar: string | null;
  status: UserStatus;
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
