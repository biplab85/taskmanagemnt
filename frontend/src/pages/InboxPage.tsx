import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/api/axios';
import type { Notification, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskDrawer } from '@/components/kanban/TaskDrawer';
import {
  Inbox,
  CheckCheck,
  Trash2,
  Bell,
  UserPlus,
  MessageSquare,
  ArrowRightLeft,
  Pencil,
  Info,
  Eye,
  EyeOff,
  X,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

const NOTIFICATION_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'task_created', label: 'Created' },
  { value: 'task_assigned', label: 'Assigned' },
  { value: 'task_status_changed', label: 'Status Changed' },
  { value: 'task_updated', label: 'Updated' },
  { value: 'comment', label: 'Comments' },
];

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  task_created: { icon: Plus, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-950/50' },
  task_assigned: { icon: UserPlus, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950/50' },
  task_status_changed: { icon: ArrowRightLeft, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/50' },
  task_updated: { icon: Pencil, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-950/50' },
  comment: { icon: MessageSquare, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/50' },
  info: { icon: Info, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.info;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function getDateGroup(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (notifDate.getTime() === today.getTime()) return 'Today';
  if (notifDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return 'Earlier';
}

type FilterTab = 'all' | 'unread' | 'read';

export function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // TaskDrawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<number | null>(null);

  const fetchNotifications = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const params: Record<string, string> = {};
      if (filter !== 'all') params.filter = filter;
      if (typeFilter !== 'all') params.type = typeFilter;

      const [notifRes, countRes] = await Promise.all([
        api.get<Notification[]>('/notifications', { params }),
        api.get<{ count: number }>('/notifications/unread-count'),
      ]);
      setNotifications(notifRes.data);
      setUnreadCount(countRes.data.count);
    } catch {
      if (showRefresh) toast.error('Failed to refresh');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, typeFilter]);

  useEffect(() => {
    setLoading(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh every 15s
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchNotifications(), 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  // Fetch users for TaskDrawer (uses /users-list for all roles)
  useEffect(() => {
    api.get<User[]>('/users-list').then((res) => setUsers(res.data)).catch(() => {});
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAsUnread = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/unread`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
      setUnreadCount((c) => c + 1);
    } catch {
      toast.error('Failed to mark as unread');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      const removed = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (removed && !removed.is_read) setUnreadCount((c) => Math.max(0, c - 1));
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleClearRead = async () => {
    try {
      await api.delete('/notifications/clear-read');
      setNotifications((prev) => prev.filter((n) => !n.is_read));
      toast.success('Read notifications cleared');
    } catch {
      toast.error('Failed to clear');
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      await handleMarkAsRead(n.id);
    }
    if (n.task_id) {
      setDrawerTaskId(n.task_id);
      setDrawerOpen(true);
    }
  };

  // Group notifications by date
  const grouped: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const group = getDateGroup(n.created_at);
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(n);
  }
  const groupOrder = ['Today', 'Yesterday', 'Earlier'];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-950/40">
            <Inbox className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Inbox</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="gap-1.5 text-xs"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearRead}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear read
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tab filters */}
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
          {(['all', 'unread', 'read'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                filter === tab
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'unread' && unreadCount > 0 && (
                <span className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTIFICATION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-xs">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 py-20">
          <p className="mb-3 text-4xl">&#127881;</p>
          <h3 className="text-lg font-semibold">Inbox Zero</h3>
          <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">
            Congratulations! You cleared your important notifications.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupOrder.map((group) => {
            const items = grouped[group];
            if (!items || items.length === 0) return null;
            return (
              <div key={group}>
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group}
                </h2>
                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                  {items.map((n, idx) => {
                    const config = getTypeConfig(n.type);
                    const Icon = config.icon;
                    return (
                      <div
                        key={n.id}
                        className={`group flex items-start gap-3 px-4 py-3 transition-colors duration-150 ${
                          !n.is_read
                            ? 'bg-brand-50/60 dark:bg-brand-950/20'
                            : 'hover:bg-muted/30'
                        } ${idx !== items.length - 1 ? 'border-b' : ''}`}
                      >
                        {/* Type icon */}
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}
                        >
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>

                        {/* Content - clickable */}
                        <button
                          onClick={() => handleNotificationClick(n)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium text-foreground/80'}`}
                            >
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600 animate-blink" />
                            )}
                            {n.task?.title && (
                              <Badge variant="secondary" className="max-w-[200px] truncate text-[10px]">
                                {n.task.title}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {n.message}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground/50">
                            {formatRelativeTime(n.created_at)}
                          </p>
                        </button>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          {n.is_read ? (
                            <button
                              onClick={() => handleMarkAsUnread(n.id)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Mark as unread"
                            >
                              <EyeOff className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Mark as read"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(n.id)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/40"
                            title="Delete"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TaskDrawer */}
      <TaskDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        taskId={drawerTaskId}
        users={users}
        onTaskUpdated={() => fetchNotifications()}
      />
    </div>
  );
}
