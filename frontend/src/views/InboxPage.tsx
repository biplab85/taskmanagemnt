import { useState, useEffect, useMemo } from 'react';
import api from '@/api/axios';
import type { User, Notification, Message } from '@/types';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TaskDrawer } from '@/components/kanban/TaskDrawer';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { MultiUserSelect } from '@/components/shared/MultiUserSelect';
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
  Send,
  Mail,
  MailOpen,
  RotateCcw,
  Paperclip,
  Download,
  SendHorizonal,
} from 'lucide-react';
import { toast } from 'sonner';

// ------- Constants & Helpers -------

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

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

const GROUP_ORDER = ['Today', 'Yesterday', 'Earlier'];

type NotifFilterTab = 'all' | 'unread' | 'read';

// ------- Reusable Checkbox -------
function Checkbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        checked || indeterminate
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-muted-foreground/40 hover:border-brand-600'
      }`}
    >
      {checked && (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
      {indeterminate && !checked && (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none"><path d="M3 6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      )}
    </button>
  );
}

// ------- Empty State -------
function EmptyState({ icon: Icon, title, description }: { icon: typeof Inbox; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 py-16">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// ------- Bulk Action Bar -------
function BulkActionBar({
  count,
  onMarkRead,
  onMarkUnread,
  onDelete,
}: {
  count: number;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-fit items-center gap-2 rounded-xl border bg-card px-4 py-2.5 shadow-lg animate-fade-in">
      <span className="text-sm font-medium text-muted-foreground">{count} selected</span>
      <div className="mx-1 h-4 w-px bg-border" />
      <Button variant="ghost" size="sm" onClick={onMarkRead} className="gap-1.5 text-xs">
        <Eye className="h-3.5 w-3.5" /> Mark Read
      </Button>
      <Button variant="ghost" size="sm" onClick={onMarkUnread} className="gap-1.5 text-xs">
        <EyeOff className="h-3.5 w-3.5" /> Mark Unread
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete} className="gap-1.5 text-xs text-red-600 hover:text-red-700">
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>
    </div>
  );
}

// ===========================
// Main InboxPage
// ===========================
export function InboxPage() {
  const ctx = useNotifications();
  const {
    notifications, unreadCount, loading: notifLoading,
    fetchNotifications, markAsRead, markAsUnread, markAllRead, deleteNotification, clearRead,
    bulkMarkNotificationsRead, bulkMarkNotificationsUnread, bulkDeleteNotifications,
    trashedNotifications, fetchTrashedNotifications, restoreNotification, forceDeleteNotification,
    messageUnreadCount, messages, sentMessages, trashedMessages,
    messagesLoading, fetchMessages, fetchSentMessages, fetchTrashedMessages,
    sendMessage, markMessageRead, markMessageUnread, deleteMessage, restoreMessage, forceDeleteMessage,
    bulkMarkMessagesRead, bulkMarkMessagesUnread, bulkDeleteMessages,
  } = ctx;

  const [activeTab, setActiveTab] = useState('notifications');
  const [refreshing, setRefreshing] = useState(false);
  const [notifFilter, setNotifFilter] = useState<NotifFilterTab>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [users, setUsers] = useState<User[]>([]);
  const loading = notifLoading && notifications.length === 0;

  // Selection states
  const [selectedNotifIds, setSelectedNotifIds] = useState<Set<number>>(new Set());
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<number>>(new Set());

  // Compose dialog
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRecipientIds, setComposeRecipientIds] = useState<number[]>([]);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeFile, setComposeFile] = useState<File | null>(null);
  const [composeSending, setComposeSending] = useState(false);

  // Message viewer
  const [viewMessage, setViewMessage] = useState<Message | null>(null);

  // Confirm dialog for bulk delete
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<'notifications' | 'messages'>('notifications');

  // TaskDrawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<number | null>(null);

  // Fetch on mount
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => { api.get<User[]>('/users-list').then((res) => setUsers(res.data)).catch(() => {}); }, []);

  // Fetch per tab
  useEffect(() => {
    if (activeTab === 'messages') fetchMessages();
    else if (activeTab === 'sent') fetchSentMessages();
    else if (activeTab === 'trash') { fetchTrashedNotifications(); fetchTrashedMessages(); }
  }, [activeTab, fetchMessages, fetchSentMessages, fetchTrashedNotifications, fetchTrashedMessages]);

  // Clear selections on tab change
  useEffect(() => { setSelectedNotifIds(new Set()); setSelectedMsgIds(new Set()); }, [activeTab]);

  // ------- Handlers -------

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'notifications') await fetchNotifications();
      else if (activeTab === 'messages') await fetchMessages();
      else if (activeTab === 'sent') await fetchSentMessages();
      else if (activeTab === 'trash') { await fetchTrashedNotifications(); await fetchTrashedMessages(); }
    } catch { toast.error('Failed to refresh'); }
    finally { setRefreshing(false); }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) { try { await markAsRead(n.id); } catch { /* ignore */ } }
    if (n.task_id) { setDrawerTaskId(n.task_id); setDrawerOpen(true); }
  };

  const handleMessageClick = async (m: Message) => {
    if (!m.is_read) { try { await markMessageRead(m.id); } catch { /* ignore */ } }
    setViewMessage(m);
  };

  // Compose
  const resetCompose = () => {
    setComposeRecipientIds([]);
    setComposeSubject('');
    setComposeBody('');
    setComposeFile(null);
  };

  const handleSend = async () => {
    if (composeRecipientIds.length === 0) { toast.error('Please select a recipient'); return; }
    if (!composeSubject.trim()) { toast.error('Subject is required'); return; }
    if (!composeBody.trim()) { toast.error('Message body is required'); return; }

    setComposeSending(true);
    try {
      // Send one message per recipient
      for (const recipientId of composeRecipientIds) {
        const fd = new FormData();
        fd.append('recipient_id', String(recipientId));
        fd.append('subject', composeSubject);
        fd.append('body', composeBody);
        if (composeFile) fd.append('attachment', composeFile);
        await sendMessage(fd);
      }
      toast.success('Message sent');
      resetCompose();
      setComposeOpen(false);
      if (activeTab === 'sent') fetchSentMessages();
    } catch { toast.error('Failed to send message'); }
    finally { setComposeSending(false); }
  };

  // Bulk actions for notifications
  const handleBulkNotifRead = async () => {
    const ids = Array.from(selectedNotifIds);
    try { await bulkMarkNotificationsRead(ids); toast.success('Marked as read'); setSelectedNotifIds(new Set()); }
    catch { toast.error('Failed'); }
  };
  const handleBulkNotifUnread = async () => {
    const ids = Array.from(selectedNotifIds);
    try { await bulkMarkNotificationsUnread(ids); toast.success('Marked as unread'); setSelectedNotifIds(new Set()); }
    catch { toast.error('Failed'); }
  };
  const handleBulkNotifDelete = () => { setConfirmDeleteTarget('notifications'); setConfirmDeleteOpen(true); };
  const executeBulkNotifDelete = async () => {
    const ids = Array.from(selectedNotifIds);
    try { await bulkDeleteNotifications(ids); toast.success('Deleted'); setSelectedNotifIds(new Set()); }
    catch { toast.error('Failed'); }
  };

  // Bulk actions for messages
  const handleBulkMsgRead = async () => {
    const ids = Array.from(selectedMsgIds);
    try { await bulkMarkMessagesRead(ids); toast.success('Marked as read'); setSelectedMsgIds(new Set()); }
    catch { toast.error('Failed'); }
  };
  const handleBulkMsgUnread = async () => {
    const ids = Array.from(selectedMsgIds);
    try { await bulkMarkMessagesUnread(ids); toast.success('Marked as unread'); setSelectedMsgIds(new Set()); }
    catch { toast.error('Failed'); }
  };
  const handleBulkMsgDelete = () => { setConfirmDeleteTarget('messages'); setConfirmDeleteOpen(true); };
  const executeBulkMsgDelete = async () => {
    const ids = Array.from(selectedMsgIds);
    try { await bulkDeleteMessages(ids); toast.success('Deleted'); setSelectedMsgIds(new Set()); }
    catch { toast.error('Failed'); }
  };

  // ------- Filtered/grouped notifications -------
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (notifFilter === 'unread' && n.is_read) return false;
      if (notifFilter === 'read' && !n.is_read) return false;
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      return true;
    });
  }, [notifications, notifFilter, typeFilter]);

  const groupedNotifications = useMemo(() => {
    const grouped: Record<string, Notification[]> = {};
    for (const n of filteredNotifications) {
      const group = getDateGroup(n.created_at);
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(n);
    }
    return grouped;
  }, [filteredNotifications]);

  // ------- Toggle helpers -------
  const toggleNotifSelection = (id: number) => {
    setSelectedNotifIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleMsgSelection = (id: number) => {
    setSelectedMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllNotifs = () => {
    if (selectedNotifIds.size === filteredNotifications.length) {
      setSelectedNotifIds(new Set());
    } else {
      setSelectedNotifIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  const toggleSelectAllMsgs = () => {
    if (selectedMsgIds.size === messages.length) {
      setSelectedMsgIds(new Set());
    } else {
      setSelectedMsgIds(new Set(messages.map((m) => m.id)));
    }
  };

  // ------- Render Notification Row -------
  const renderNotificationRow = (n: Notification, idx: number, total: number, showCheckbox = true) => {
    const config = getTypeConfig(n.type);
    const Icon = config.icon;
    return (
      <div
        key={n.id}
        className={`group flex items-start gap-3 px-4 py-3 transition-colors duration-150 ${
          !n.is_read ? 'bg-brand-50/60 dark:bg-brand-950/20' : 'hover:bg-muted/30'
        } ${idx !== total - 1 ? 'border-b' : ''}`}
      >
        {showCheckbox && (
          <div className="mt-1.5">
            <Checkbox checked={selectedNotifIds.has(n.id)} onChange={() => toggleNotifSelection(n.id)} />
          </div>
        )}
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <button onClick={() => handleNotificationClick(n)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium text-foreground/80'}`}>{n.title}</p>
            {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600 animate-blink" />}
            {n.task?.title && (
              <Badge variant="secondary" className="max-w-[200px] truncate text-[10px]">{n.task.title}</Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{n.message}</p>
          <p className="mt-1 text-[10px] text-muted-foreground/50">{formatRelativeTime(n.created_at)}</p>
        </button>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {n.is_read ? (
            <button onClick={() => markAsUnread(n.id).catch(() => toast.error('Failed'))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Mark as unread">
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button onClick={() => markAsRead(n.id).catch(() => toast.error('Failed'))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Mark as read">
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => deleteNotification(n.id).then(() => toast.success('Moved to trash')).catch(() => toast.error('Failed'))} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/40" title="Delete">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // ------- Render Message Row -------
  const renderMessageRow = (m: Message, showCheckbox = true, showActions = true) => {
    const sender = m.sender;
    return (
      <div
        key={m.id}
        className={`group flex items-start gap-3 border-b px-4 py-3 transition-colors duration-150 ${
          !m.is_read ? 'bg-brand-50/60 dark:bg-brand-950/20' : 'hover:bg-muted/30'
        }`}
      >
        {showCheckbox && (
          <div className="mt-1.5">
            <Checkbox checked={selectedMsgIds.has(m.id)} onChange={() => toggleMsgSelection(m.id)} />
          </div>
        )}
        <Avatar className="mt-0.5 h-8 w-8 shrink-0">
          {sender?.avatar && <AvatarImage src={sender.avatar} />}
          <AvatarFallback className="text-xs">{sender ? getInitials(sender.name) : '?'}</AvatarFallback>
        </Avatar>
        <button onClick={() => handleMessageClick(m)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <p className={`text-sm ${!m.is_read ? 'font-semibold' : 'font-medium text-foreground/80'}`}>{m.subject}</p>
            {!m.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600 animate-blink" />}
            {m.attachment_name && <Paperclip className="h-3 w-3 text-muted-foreground" />}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">{sender?.name || 'Unknown'}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{stripHtml(m.body)}</p>
          <p className="mt-1 text-[10px] text-muted-foreground/50">{formatRelativeTime(m.created_at)}</p>
        </button>
        {showActions && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {m.is_read ? (
              <button onClick={(e) => { e.stopPropagation(); markMessageUnread(m.id).catch(() => toast.error('Failed')); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Mark as unread">
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); markMessageRead(m.id).catch(() => toast.error('Failed')); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Mark as read">
                <Eye className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); deleteMessage(m.id).then(() => toast.success('Moved to trash')).catch(() => toast.error('Failed')); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/40" title="Delete">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // ------- Render Sent Message Row -------
  const renderSentMessageRow = (m: Message) => {
    const recipient = m.recipient;
    return (
      <div
        key={m.id}
        className="group flex items-start gap-3 border-b px-4 py-3 transition-colors duration-150 hover:bg-muted/30"
      >
        <Avatar className="mt-0.5 h-8 w-8 shrink-0">
          {recipient?.avatar && <AvatarImage src={recipient.avatar} />}
          <AvatarFallback className="text-xs">{recipient ? getInitials(recipient.name) : '?'}</AvatarFallback>
        </Avatar>
        <button onClick={() => setViewMessage(m)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground/80">{m.subject}</p>
            {m.is_read && <MailOpen className="h-3 w-3 text-muted-foreground/50" />}
            {m.attachment_name && <Paperclip className="h-3 w-3 text-muted-foreground" />}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            To: <span className="font-medium text-foreground/70">{recipient?.name || 'Unknown'}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{stripHtml(m.body)}</p>
          <p className="mt-1 text-[10px] text-muted-foreground/50">{formatRelativeTime(m.created_at)}</p>
        </button>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => deleteMessage(m.id).then(() => toast.success('Moved to trash')).catch(() => toast.error('Failed'))} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/40" title="Delete">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const totalTrashCount = trashedNotifications.length + trashedMessages.length;

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
              {unreadCount + messageUnreadCount > 0
                ? `${unreadCount + messageUnreadCount} unread item${unreadCount + messageUnreadCount !== 1 ? 's' : ''}`
                : 'All caught up'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { resetCompose(); setComposeOpen(true); }} className="gap-1.5 text-xs">
            <Send className="h-3.5 w-3.5" />
            Compose
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 w-full justify-start">
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Messages
            {messageUnreadCount > 0 && (
              <span className="ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{messageUnreadCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-1.5">
            <SendHorizonal className="h-3.5 w-3.5" />
            Sent
          </TabsTrigger>
          <TabsTrigger value="trash" className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Trash
            {totalTrashCount > 0 && (
              <span className="ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-muted-foreground/30 px-1 text-[10px] font-bold">{totalTrashCount}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ========== NOTIFICATIONS TAB ========== */}
        <TabsContent value="notifications">
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filteredNotifications.length > 0 && selectedNotifIds.size === filteredNotifications.length}
                indeterminate={selectedNotifIds.size > 0 && selectedNotifIds.size < filteredNotifications.length}
                onChange={toggleSelectAllNotifs}
              />
              <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
                {(['all', 'unread', 'read'] as NotifFilterTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setNotifFilter(tab)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      notifFilter === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'unread' && unreadCount > 0 && (
                      <span className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={() => markAllRead().then(() => toast.success('All marked as read')).catch(() => toast.error('Failed'))} className="gap-1.5 text-xs">
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </Button>
              )}
            </div>
          </div>

          {/* Notification list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <EmptyState icon={Bell} title="Inbox Zero" description="No notifications to show. You're all caught up!" />
          ) : (
            <div className="space-y-6">
              {GROUP_ORDER.map((group) => {
                const items = groupedNotifications[group];
                if (!items || items.length === 0) return null;
                return (
                  <div key={group}>
                    <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">{group}</h2>
                    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                      {items.map((n, idx) => renderNotificationRow(n, idx, items.length))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedNotifIds.size > 0 && (
            <BulkActionBar count={selectedNotifIds.size} onMarkRead={handleBulkNotifRead} onMarkUnread={handleBulkNotifUnread} onDelete={handleBulkNotifDelete} />
          )}
        </TabsContent>

        {/* ========== MESSAGES TAB ========== */}
        <TabsContent value="messages">
          <div className="mb-4 flex items-center gap-2">
            <Checkbox
              checked={messages.length > 0 && selectedMsgIds.size === messages.length}
              indeterminate={selectedMsgIds.size > 0 && selectedMsgIds.size < messages.length}
              onChange={toggleSelectAllMsgs}
            />
            <span className="text-xs text-muted-foreground">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
          </div>

          {messagesLoading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState icon={Mail} title="No Messages" description="Your inbox is empty. Send a message to get started!" />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {messages.map((m) => renderMessageRow(m))}
            </div>
          )}

          {selectedMsgIds.size > 0 && (
            <BulkActionBar count={selectedMsgIds.size} onMarkRead={handleBulkMsgRead} onMarkUnread={handleBulkMsgUnread} onDelete={handleBulkMsgDelete} />
          )}
        </TabsContent>

        {/* ========== SENT TAB ========== */}
        <TabsContent value="sent">
          {sentMessages.length === 0 ? (
            <EmptyState icon={SendHorizonal} title="No Sent Messages" description="Messages you send will appear here." />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {sentMessages.map((m) => renderSentMessageRow(m))}
            </div>
          )}
        </TabsContent>

        {/* ========== TRASH TAB ========== */}
        <TabsContent value="trash">
          {totalTrashCount === 0 ? (
            <EmptyState icon={Trash2} title="Trash is Empty" description="Items you delete will appear here for recovery." />
          ) : (
            <div className="space-y-6">
              {trashedNotifications.length > 0 && (
                <div>
                  <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Notifications</h2>
                  <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    {trashedNotifications.map((n, idx) => {
                      const config = getTypeConfig(n.type);
                      const Icon = config.icon;
                      return (
                        <div key={n.id} className={`group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30 ${idx !== trashedNotifications.length - 1 ? 'border-b' : ''}`}>
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground/80">{n.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{n.message}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground/50">{formatRelativeTime(n.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => restoreNotification(n.id).then(() => toast.success('Restored')).catch(() => toast.error('Failed'))} className="gap-1 text-xs h-7 px-2">
                              <RotateCcw className="h-3 w-3" /> Restore
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => forceDeleteNotification(n.id).then(() => toast.success('Permanently deleted')).catch(() => toast.error('Failed'))} className="gap-1 text-xs h-7 px-2 text-red-600 hover:text-red-700">
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {trashedMessages.length > 0 && (
                <div>
                  <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Messages</h2>
                  <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    {trashedMessages.map((m, idx) => (
                      <div key={m.id} className={`group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30 ${idx !== trashedMessages.length - 1 ? 'border-b' : ''}`}>
                        <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                          {m.sender?.avatar && <AvatarImage src={m.sender.avatar} />}
                          <AvatarFallback className="text-xs">{m.sender ? getInitials(m.sender.name) : '?'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground/80">{m.subject}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{m.sender?.name || 'Unknown'}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{stripHtml(m.body)}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground/50">{formatRelativeTime(m.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => restoreMessage(m.id).then(() => toast.success('Restored')).catch(() => toast.error('Failed'))} className="gap-1 text-xs h-7 px-2">
                            <RotateCcw className="h-3 w-3" /> Restore
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => forceDeleteMessage(m.id).then(() => toast.success('Permanently deleted')).catch(() => toast.error('Failed'))} className="gap-1 text-xs h-7 px-2 text-red-600 hover:text-red-700">
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ========== COMPOSE DIALOG ========== */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" /> New Message
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">To</label>
              <MultiUserSelect users={users} selectedIds={composeRecipientIds} onChange={setComposeRecipientIds} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Subject</label>
              <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Message subject..." />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Body</label>
              <RichTextEditor content={composeBody} onChange={setComposeBody} placeholder="Write your message..." />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Attachment (optional)</label>
              <input
                type="file"
                onChange={(e) => setComposeFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted/80"
              />
              {composeFile && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" /> {composeFile.name}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
              <Button onClick={handleSend} disabled={composeSending} className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                {composeSending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== MESSAGE VIEWER DIALOG ========== */}
      <Dialog open={!!viewMessage} onOpenChange={(open) => { if (!open) setViewMessage(null); }}>
        <DialogContent className="sm:max-w-[600px]">
          {viewMessage && (
            <>
              <DialogHeader>
                <DialogTitle>{viewMessage.subject}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {viewMessage.sender?.avatar && <AvatarImage src={viewMessage.sender.avatar} />}
                    <AvatarFallback className="text-xs">{viewMessage.sender ? getInitials(viewMessage.sender.name) : '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{viewMessage.sender?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      To: {viewMessage.recipient?.name || 'Unknown'} &middot; {formatRelativeTime(viewMessage.created_at)}
                    </p>
                  </div>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-muted/20 p-4" dangerouslySetInnerHTML={{ __html: viewMessage.body }} />
                {viewMessage.attachment_path && (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{viewMessage.attachment_name}</span>
                    <a href={`/storage/${viewMessage.attachment_path}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                      <Download className="h-3 w-3" /> Download
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== BULK DELETE CONFIRM ========== */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {confirmDeleteTarget === 'notifications' ? selectedNotifIds.size : selectedMsgIds.size} item(s) to trash. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteTarget === 'notifications') executeBulkNotifDelete();
                else executeBulkMsgDelete();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* TaskDrawer */}
      <TaskDrawer open={drawerOpen} onOpenChange={setDrawerOpen} taskId={drawerTaskId} users={users} onTaskUpdated={fetchNotifications} />
    </div>
  );
}
