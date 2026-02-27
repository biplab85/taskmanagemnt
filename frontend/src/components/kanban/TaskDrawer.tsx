import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import api from '@/api/axios';
import { sanitizeHtml } from '@/lib/sanitize';
import type { Task, User, Attachment, Comment, ActivityLog, UserStatus, TimeEntry } from '@/types';
import { TASK_PRIORITIES } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useKanbanColumns } from '@/context/KanbanColumnsContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatusDot } from '@/components/shared/UserStatusDot';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { FileUpload } from '@/components/shared/FileUpload';
import { MultiUserSelect } from '@/components/shared/MultiUserSelect';
import { UserHoverCard } from '@/components/shared/UserHoverCard';
import { SubtaskChecklist } from '@/components/shared/SubtaskChecklist';
import { LabelSelect } from '@/components/shared/LabelSelect';
import { DependencySelect } from '@/components/shared/DependencySelect';
import {
  Calendar,
  Clock,
  User as UserIcon,
  Send,
  Trash2,
  Download,
  FileImage,
  FileText,
  File,
  Pencil,
  Save,
  X,
  Activity,
  Paperclip,
  MessageSquare,
  Check,
  Smile,
  Eye,
  EyeOff,
  Timer,
  Play,
  Square,
  Plus as PlusIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TaskDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number | null;
  users: User[];
  onTaskUpdated: () => void;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType === 'application/pdf') return FileText;
  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatElapsedSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TaskDrawer({ open, onOpenChange, taskId, users, onTaskUpdated }: TaskDrawerProps) {
  const { onStatusChange, user: authUser } = useAuth();
  const { columns, getColumn } = useKanbanColumns();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');

  // Time tracking state
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerLoading, setTimerLoading] = useState(false);
  const [manualHours, setManualHours] = useState('0');
  const [manualMinutes, setManualMinutes] = useState('30');
  const [manualDescription, setManualDescription] = useState('');
  const [addingManual, setAddingManual] = useState(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Watchers state
  const [watchers, setWatchers] = useState<User[]>([]);
  const [isWatching, setIsWatching] = useState(false);
  const [watcherLoading, setWatcherLoading] = useState(false);

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('backlog');
  const [editPriority, setEditPriority] = useState('medium');
  const [editAssigneeIds, setEditAssigneeIds] = useState<number[]>([]);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editLabelIds, setEditLabelIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && taskId) {
      setLoading(true);
      setEditing(false);
      Promise.all([
        api.get<Task>(`/tasks/${taskId}`),
        api.get<ActivityLog[]>(`/tasks/${taskId}/activity`).catch(() => ({ data: [] as ActivityLog[] })),
      ]).then(([taskRes, logsRes]) => {
        const t = taskRes.data;
        setTask(t);
        setAttachments(t.attachments || []);
        setComments(t.comments || []);
        setActivityLogs(logsRes.data);
        // Populate edit fields
        setEditTitle(t.title);
        setEditDescription(t.description || '');
        setEditStatus(t.status);
        setEditPriority(t.priority);
        setEditAssigneeIds(t.assignees?.map((u) => u.id) || []);
        setEditStartDate(t.start_date || '');
        setEditEndDate(t.end_date || '');
        setEditLabelIds(t.labels?.map((l) => l.id) || []);
        setLoading(false);
      }).catch(() => {
        toast.error('Failed to load task');
        setLoading(false);
      });
    }
  }, [open, taskId]);

  // Fetch time entries and watchers when drawer opens
  useEffect(() => {
    if (open && taskId) {
      api.get<TimeEntry[]>(`/tasks/${taskId}/time-entries`).then((res) => {
        setTimeEntries(res.data);
        const active = res.data.find((e) => !e.stopped_at && e.user_id === authUser?.id);
        if (active) {
          setActiveTimer(active);
          const startedAt = new Date(active.started_at).getTime();
          setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
        } else {
          setActiveTimer(null);
          setElapsedSeconds(0);
        }
      }).catch(() => {});
      api.get<User[]>(`/tasks/${taskId}/watchers`).then((res) => {
        setWatchers(res.data);
        setIsWatching(res.data.some((w) => w.id === authUser?.id));
      }).catch(() => {});
    }
  }, [open, taskId, authUser?.id]);

  // Timer tick interval
  useEffect(() => {
    if (activeTimer) {
      timerIntervalRef.current = setInterval(() => {
        const startedAt = new Date(activeTimer.started_at).getTime();
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeTimer]);

  // Subscribe to user status changes
  useEffect(() => {
    return onStatusChange((userId: number, newStatus: UserStatus) => {
      setTask((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          assignees: prev.assignees?.map((a) =>
            a.id === userId ? { ...a, status: newStatus } : a
          ),
        };
      });
    });
  }, [onStatusChange]);

  const handleQuickStatusChange = async (newStatus: string) => {
    if (!task) return;
    try {
      await api.put(`/tasks/${task.id}`, { status: newStatus });
      setTask({ ...task, status: newStatus as Task['status'] });
      setEditStatus(newStatus);
      onTaskUpdated();
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleSave = async () => {
    if (!task) return;
    setSaving(true);
    try {
      await api.put(`/tasks/${task.id}`, {
        title: editTitle,
        description: editDescription || null,
        status: editStatus,
        priority: editPriority,
        assignees: editAssigneeIds,
        labels: editLabelIds,
        start_date: editStartDate || null,
        end_date: editEndDate || null,
      });
      const res = await api.get<Task>(`/tasks/${task.id}`);
      setTask(res.data);
      setEditing(false);
      onTaskUpdated();
      toast.success('Task updated');
    } catch {
      toast.error('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleSendComment = async () => {
    if (!task || !newComment.trim()) return;
    setSendingComment(true);
    try {
      const res = await api.post<Comment>(`/tasks/${task.id}/comments`, { body: newComment });
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to send comment');
    } finally {
      setSendingComment(false);
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!editingCommentBody.trim()) return;
    try {
      const res = await api.put<Comment>(`/comments/${commentId}`, { body: editingCommentBody });
      setComments((prev) => prev.map((c) => (c.id === commentId ? res.data : c)));
      setEditingCommentId(null);
      setEditingCommentBody('');
      toast.success('Comment updated');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to edit';
      toast.error(msg);
    }
  };

  const REACTION_EMOJIS = ['👍', '❤️', '😄', '🎉', '😮', '👀'];

  const handleToggleReaction = async (commentId: number, emoji: string) => {
    try {
      const res = await api.post<{ reactions: Comment['reactions'] }>(`/comments/${commentId}/reactions`, { emoji });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, reactions: res.data.reactions } : c))
      );
    } catch {
      toast.error('Failed to react');
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!task) return;
    setUploading(true);
    const formData = new FormData();
    files.forEach((file) => formData.append('files[]', file));
    try {
      const res = await api.post<Attachment[]>(`/tasks/${task.id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments((prev) => [...prev, ...res.data]);
      toast.success('Files uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (id: number) => {
    try {
      await api.delete(`/attachments/${id}`);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      toast.success('Attachment deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  // Time tracking handlers
  const handleStartTimer = async () => {
    if (!task) return;
    setTimerLoading(true);
    try {
      const res = await api.post<TimeEntry>(`/tasks/${task.id}/time-entries/start`);
      setActiveTimer(res.data);
      setTimeEntries((prev) => [res.data, ...prev]);
      toast.success('Timer started');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to start timer';
      toast.error(msg);
    } finally {
      setTimerLoading(false);
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    setTimerLoading(true);
    try {
      const res = await api.put<TimeEntry>(`/time-entries/${activeTimer.id}/stop`);
      setActiveTimer(null);
      setTimeEntries((prev) => prev.map((e) => (e.id === res.data.id ? res.data : e)));
      toast.success('Timer stopped');
    } catch {
      toast.error('Failed to stop timer');
    } finally {
      setTimerLoading(false);
    }
  };

  const handleAddManualEntry = async () => {
    if (!task) return;
    const totalMin = parseInt(manualHours) * 60 + parseInt(manualMinutes);
    if (totalMin <= 0) { toast.error('Duration must be greater than 0'); return; }
    setAddingManual(true);
    const now = new Date();
    const started = new Date(now.getTime() - totalMin * 60000);
    try {
      const res = await api.post<TimeEntry>(`/tasks/${task.id}/time-entries`, {
        description: manualDescription || null,
        started_at: started.toISOString(),
        stopped_at: now.toISOString(),
      });
      setTimeEntries((prev) => [res.data, ...prev]);
      setManualHours('0');
      setManualMinutes('30');
      setManualDescription('');
      toast.success('Time entry added');
    } catch {
      toast.error('Failed to add time entry');
    } finally {
      setAddingManual(false);
    }
  };

  const handleDeleteTimeEntry = async (id: number) => {
    try {
      await api.delete(`/time-entries/${id}`);
      setTimeEntries((prev) => prev.filter((e) => e.id !== id));
      if (activeTimer?.id === id) setActiveTimer(null);
      toast.success('Time entry deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  // Watcher handlers
  const handleToggleWatch = async () => {
    if (!task) return;
    setWatcherLoading(true);
    try {
      await api.post(`/tasks/${task.id}/watchers/toggle`);
      const res = await api.get<User[]>(`/tasks/${task.id}/watchers`);
      setWatchers(res.data);
      const watching = res.data.some((w) => w.id === authUser?.id);
      setIsWatching(watching);
      toast.success(watching ? 'Now watching this task' : 'Stopped watching this task');
    } catch {
      toast.error('Failed to toggle watch');
    } finally {
      setWatcherLoading(false);
    }
  };

  const totalTimeMinutes = timeEntries.reduce((sum, e) => {
    if (e.duration_minutes) return sum + e.duration_minutes;
    if (e.stopped_at) {
      return sum + Math.floor((new Date(e.stopped_at).getTime() - new Date(e.started_at).getTime()) / 60000);
    }
    return sum;
  }, 0);

  const statusInfo = getColumn(task?.status || '');
  const assignees = task?.assignees || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl lg:max-w-2xl p-0 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <SheetTitle className="sr-only">Loading task</SheetTitle>
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          </div>
        ) : task ? (
          <div className="flex h-full flex-col">
            {/* Header */}
            <SheetHeader className="border-b px-6 py-4 shrink-0">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-lg font-semibold"
                    />
                  ) : (
                    <SheetTitle className="text-lg leading-tight">{task.title}</SheetTitle>
                  )}
                  <SheetDescription className="mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusInfo?.color }} />
                      {statusInfo?.label}
                    </span>
                    <span className="text-muted-foreground/40">|</span>
                    <PriorityBadge priority={task.priority} />
                  </SheetDescription>
                </div>
                {!editing ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleWatch}
                      disabled={watcherLoading}
                      className={`gap-1.5 cursor-pointer ${isWatching ? 'text-brand-600 border-brand-300 dark:border-brand-700' : ''}`}
                    >
                      {isWatching ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {isWatching ? 'Watching' : 'Watch'}
                      {watchers.length > 0 && (
                        <span className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold">
                          {watchers.length}
                        </span>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5 cursor-pointer">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" onClick={handleSave} disabled={saving} className="bg-brand-600 hover:bg-brand-700 gap-1.5 cursor-pointer">
                      <Save className="h-3.5 w-3.5" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="cursor-pointer">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </SheetHeader>

            {/* Quick status change */}
            <div className="border-b px-6 py-3 shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-medium text-muted-foreground shrink-0">Status:</span>
                {columns.map((col) => (
                  <button
                    key={col.slug}
                    onClick={() => handleQuickStatusChange(col.slug)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                      task.status === col.slug
                        ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-500 dark:bg-brand-950/30 dark:text-brand-400'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <Tabs defaultValue="details" className="flex h-full flex-col">
                <TabsList className="mx-6 mt-4 grid w-auto grid-cols-5 shrink-0">
                  <TabsTrigger value="details" className="gap-1.5 cursor-pointer">
                    <Pencil className="h-3.5 w-3.5" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="gap-1.5 cursor-pointer">
                    <Paperclip className="h-3.5 w-3.5" />
                    Files ({attachments.length})
                  </TabsTrigger>
                  <TabsTrigger value="time" className="gap-1.5 cursor-pointer">
                    <Timer className="h-3.5 w-3.5" />
                    Time
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="gap-1.5 cursor-pointer">
                    <MessageSquare className="h-3.5 w-3.5" />
                    ({comments.length})
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="gap-1.5 cursor-pointer">
                    <Activity className="h-3.5 w-3.5" />
                    Log
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="flex-1 px-6 pb-6 mt-4 space-y-5">
                  {/* Meta info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <UserIcon className="h-3 w-3" />
                        Assignees
                      </Label>
                      {editing ? (
                        <MultiUserSelect
                          users={users}
                          selectedIds={editAssigneeIds}
                          onChange={setEditAssigneeIds}
                        />
                      ) : assignees.length > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex -space-x-2">
                            {assignees.slice(0, 4).map((u) => {
                              const initials = u.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                              return (
                                <UserHoverCard key={u.id} user={u}>
                                  <div className="relative cursor-pointer">
                                    <Avatar className="h-7 w-7 ring-2 ring-background">
                                      {u.avatar && <AvatarImage src={`/storage/${u.avatar}`} />}
                                      <AvatarFallback className="bg-brand-100 text-brand-700 text-[10px] font-bold dark:bg-brand-900 dark:text-brand-300">
                                        {initials}
                                      </AvatarFallback>
                                    </Avatar>
                                    {u.status && <UserStatusDot status={u.status} isOnLeave={u.is_on_leave} className="absolute -bottom-px -right-px h-2 w-2 ring-1 ring-card" />}
                                    {u.profile_completed && (
                                      <span className="absolute -top-px -left-px flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-white ring-1 ring-card" title="Profile Complete">
                                        <Check className="h-1.5 w-1.5" strokeWidth={3} />
                                      </span>
                                    )}
                                  </div>
                                </UserHoverCard>
                              );
                            })}
                          </div>
                          <span className="text-sm font-medium">
                            {assignees.map((u) => u.name).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Priority</Label>
                      {editing ? (
                        <Select value={editPriority} onValueChange={setEditPriority}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TASK_PRIORITIES.map((p) => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <PriorityBadge priority={task.priority} />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        Start Date
                      </Label>
                      {editing ? (
                        <Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="h-9" />
                      ) : (
                        <span className="text-sm">{task.start_date ? new Date(task.start_date).toLocaleDateString() : 'Not set'}</span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Due Date
                      </Label>
                      {editing ? (
                        <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="h-9" />
                      ) : (
                        <span className="text-sm">{task.end_date ? new Date(task.end_date).toLocaleDateString() : 'Not set'}</span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    {editing ? (
                      <RichTextEditor content={editDescription} onChange={setEditDescription} />
                    ) : task.description ? (
                      <div
                        className="tiptap prose prose-sm max-w-none rounded-lg border bg-muted/30 p-4 dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(task.description) }}
                      />
                    ) : (
                      <p className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                        No description provided.
                      </p>
                    )}
                  </div>

                  {/* Labels */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Labels</Label>
                    {editing ? (
                      <LabelSelect selectedIds={editLabelIds} onChange={setEditLabelIds} />
                    ) : task.labels && task.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {task.labels.map((label) => (
                          <span
                            key={label.id}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${label.color}20`,
                              color: label.color,
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No labels</span>
                    )}
                  </div>

                  {/* Subtasks */}
                  <SubtaskChecklist
                    taskId={task.id}
                    subtasks={task.subtasks || []}
                    onUpdate={async () => {
                      const res = await api.get<Task>(`/tasks/${task.id}`);
                      setTask(res.data);
                      onTaskUpdated();
                    }}
                    readonly={false}
                  />

                  {/* Dependencies */}
                  <DependencySelect
                    taskId={task.id}
                    dependencies={task.dependencies || []}
                    dependents={task.dependents || []}
                    onUpdate={async () => {
                      const res = await api.get<Task>(`/tasks/${task.id}`);
                      setTask(res.data);
                    }}
                  />

                  {/* Created info */}
                  <div className="rounded-lg border bg-muted/30 px-4 py-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Created {new Date(task.created_at).toLocaleString()}</span>
                      {task.updated_at && <span>Updated {new Date(task.updated_at).toLocaleString()}</span>}
                    </div>
                  </div>
                </TabsContent>

                {/* Attachments Tab */}
                <TabsContent value="attachments" className="flex-1 px-6 pb-6 mt-4 space-y-4">
                  <FileUpload onFilesSelected={handleFileUpload} uploading={uploading} />
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.filter((a) => a.file_type.startsWith('image/')).length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {attachments.filter((a) => a.file_type.startsWith('image/')).map((att) => (
                            <div key={att.id} className="group relative overflow-hidden rounded-lg border bg-muted">
                              <Image src={`/storage/${att.file_path}`} alt={att.file_name} width={200} height={200} className="aspect-square w-full object-cover" unoptimized />
                              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                <a href={`/storage/${att.file_path}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30 cursor-pointer">
                                  <Download className="h-4 w-4" />
                                </a>
                                <button onClick={() => handleDeleteAttachment(att.id)} className="rounded-full bg-white/20 p-2 text-white hover:bg-red-500/80 cursor-pointer">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="truncate px-2 py-1.5 text-xs text-muted-foreground">{att.file_name}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {attachments.filter((a) => !a.file_type.startsWith('image/')).map((att) => {
                        const Icon = getFileIcon(att.file_type);
                        const isPdf = att.file_type === 'application/pdf';
                        return (
                          <div key={att.id} className="rounded-lg border bg-card overflow-hidden">
                            {isPdf && (
                              <iframe
                                src={`/storage/${att.file_path}`}
                                className="w-full h-48 border-b"
                                title={att.file_name}
                              />
                            )}
                            <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent/50">
                              <div className="flex items-center gap-3 min-w-0">
                                <Icon className="h-8 w-8 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{att.file_name}</p>
                                  <p className="text-xs text-muted-foreground">{formatSize(att.file_size)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <a href={`/storage/${att.file_path}`} target="_blank" rel="noopener noreferrer" className="rounded-md p-1.5 text-muted-foreground hover:text-brand-600 cursor-pointer">
                                  <Download className="h-4 w-4" />
                                </a>
                                <button onClick={() => handleDeleteAttachment(att.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-red-600 cursor-pointer">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {attachments.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">No attachments yet. Upload files above.</p>
                  )}
                </TabsContent>

                {/* Time Tracking Tab */}
                <TabsContent value="time" className="flex-1 px-6 pb-6 mt-4 space-y-4">
                  {/* Total time summary */}
                  <div className="rounded-xl border bg-brand-50/50 dark:bg-brand-950/20 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900">
                        <Timer className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Total Time Logged</p>
                        <p className="text-lg font-bold text-brand-600 dark:text-brand-400">{formatDuration(totalTimeMinutes)}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{timeEntries.length} entries</span>
                  </div>

                  {/* Active Timer / Start */}
                  <div className="rounded-xl border p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Timer</p>
                    {activeTimer ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                          </span>
                          <span className="text-2xl font-mono font-bold tabular-nums">{formatElapsedSeconds(elapsedSeconds)}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleStopTimer}
                          disabled={timerLoading}
                          className="gap-1.5 cursor-pointer"
                        >
                          <Square className="h-3.5 w-3.5" />
                          Stop
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleStartTimer}
                        disabled={timerLoading}
                        className="bg-brand-600 hover:bg-brand-700 gap-1.5 cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Start Timer
                      </Button>
                    )}
                  </div>

                  {/* Manual entry */}
                  <div className="rounded-xl border p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Log Time Manually</p>
                    <div className="flex items-end gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Hours</Label>
                        <Input type="number" min="0" max="24" value={manualHours} onChange={(e) => setManualHours(e.target.value)} className="h-8 w-16 text-center" />
                      </div>
                      <span className="pb-1.5 text-sm font-bold text-muted-foreground">:</span>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Minutes</Label>
                        <Input type="number" min="0" max="59" value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)} className="h-8 w-16 text-center" />
                      </div>
                      <div className="flex-1">
                        <Label className="text-[10px] text-muted-foreground">Description</Label>
                        <Input placeholder="What did you work on?" value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} className="h-8" />
                      </div>
                      <Button size="sm" onClick={handleAddManualEntry} disabled={addingManual} className="h-8 bg-brand-600 hover:bg-brand-700 gap-1 cursor-pointer">
                        <PlusIcon className="h-3.5 w-3.5" />
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Time entries list */}
                  {timeEntries.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entries</p>
                      {timeEntries.map((entry) => {
                        const entryInitials = entry.user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                        const isRunning = !entry.stopped_at;
                        const isOwn = entry.user_id === authUser?.id;
                        return (
                          <div key={entry.id} className="flex items-center gap-3 rounded-lg border bg-card/50 p-3">
                            <Avatar className="h-7 w-7">
                              {entry.user?.avatar && <AvatarImage src={`/storage/${entry.user.avatar}`} />}
                              <AvatarFallback className="bg-brand-100 text-brand-700 text-[10px] font-bold dark:bg-brand-900 dark:text-brand-300">
                                {entryInitials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{entry.user?.name}</span>
                                {isRunning && (
                                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Running
                                  </span>
                                )}
                              </div>
                              {entry.description && (
                                <p className="text-[11px] text-muted-foreground truncate">{entry.description}</p>
                              )}
                              <p className="text-[10px] text-muted-foreground/60">
                                {new Date(entry.started_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-semibold tabular-nums">
                                {isRunning ? formatElapsedSeconds(elapsedSeconds) : formatDuration(entry.duration_minutes)}
                              </span>
                              {isOwn && (
                                <button onClick={() => handleDeleteTimeEntry(entry.id)} className="rounded p-1 text-muted-foreground hover:text-red-600 cursor-pointer">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {timeEntries.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
                        <Timer className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-foreground/70">No time logged yet</p>
                      <p className="text-xs text-muted-foreground">Start the timer or log time manually</p>
                    </div>
                  )}
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="flex flex-1 flex-col px-6 pb-6 mt-4">
                  <div className="flex-1 space-y-3 overflow-y-auto mb-4">
                    {comments.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
                          <MessageSquare className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-medium text-foreground/70">No comments yet</p>
                        <p className="text-xs text-muted-foreground">Start the conversation below</p>
                      </div>
                    )}
                    {comments.map((comment) => {
                      const initials = comment.user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                      const isOwn = comment.user_id === authUser?.id;
                      const canEdit = isOwn && (new Date().getTime() - new Date(comment.created_at).getTime()) < 15 * 60 * 1000;
                      const isEditing = editingCommentId === comment.id;

                      // Group reactions by emoji
                      const reactionGroups: Record<string, { count: number; users: string[]; hasMe: boolean }> = {};
                      (comment.reactions || []).forEach((r) => {
                        if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = { count: 0, users: [], hasMe: false };
                        reactionGroups[r.emoji].count++;
                        if (r.user?.name) reactionGroups[r.emoji].users.push(r.user.name);
                        if (r.user_id === authUser?.id) reactionGroups[r.emoji].hasMe = true;
                      });

                      return (
                        <div key={comment.id} className="group/comment flex gap-3 animate-fade-in">
                          <Avatar className="h-8 w-8 shrink-0">
                            {comment.user?.avatar && <AvatarImage src={`/storage/${comment.user.avatar}`} />}
                            <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-bold dark:bg-brand-900 dark:text-brand-300">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="rounded-lg bg-muted/50 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{comment.user?.name}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(comment.created_at).toLocaleString()}
                                </span>
                                {comment.edited_at && (
                                  <span className="text-[10px] text-muted-foreground/60 italic">edited</span>
                                )}
                                {/* Edit/react actions */}
                                <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                  {canEdit && !isEditing && (
                                    <button
                                      onClick={() => { setEditingCommentId(comment.id); setEditingCommentBody(comment.body); }}
                                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                      title="Edit"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  )}
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="React">
                                        <Smile className="h-3 w-3" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-1.5" side="top" align="end">
                                      <div className="flex gap-1">
                                        {REACTION_EMOJIS.map((emoji) => (
                                          <button
                                            key={emoji}
                                            onClick={() => handleToggleReaction(comment.id, emoji)}
                                            className="rounded-md px-2 py-1 text-base hover:bg-muted transition-colors"
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>

                              {isEditing ? (
                                <div className="mt-1 flex gap-2">
                                  <Input
                                    value={editingCommentBody}
                                    onChange={(e) => setEditingCommentBody(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditComment(comment.id); if (e.key === 'Escape') setEditingCommentId(null); }}
                                    className="flex-1 h-8 text-sm"
                                    autoFocus
                                  />
                                  <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)} className="h-8 px-2">
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" onClick={() => handleEditComment(comment.id)} className="h-8 px-2 bg-brand-600 hover:bg-brand-700">
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <p className="mt-1 text-sm text-foreground/80">{comment.body}</p>
                              )}
                            </div>

                            {/* Reaction pills */}
                            {Object.keys(reactionGroups).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {Object.entries(reactionGroups).map(([emoji, group]) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleToggleReaction(comment.id, emoji)}
                                    title={group.users.join(', ')}
                                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                                      group.hasMe
                                        ? 'border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-950/30'
                                        : 'border-border bg-muted/30 hover:bg-muted/60'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    <span className="font-medium text-muted-foreground">{group.count}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 shrink-0 border-t pt-4">
                    <Input
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                      className="flex-1"
                    />
                    <Button onClick={handleSendComment} disabled={sendingComment || !newComment.trim()} size="icon" className="bg-brand-600 hover:bg-brand-700 shrink-0 cursor-pointer">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Activity Log Tab */}
                <TabsContent value="activity" className="flex-1 px-6 pb-6 mt-4">
                  <div className="space-y-1">
                    {activityLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
                          <Activity className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-medium text-foreground/70">No activity yet</p>
                        <p className="text-xs text-muted-foreground">Actions on this task will appear here</p>
                      </div>
                    ) : (
                      activityLogs.map((log, index) => (
                        <div key={log.id} className="relative flex items-start gap-3 py-3 animate-fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                          {/* Timeline connector */}
                          {index < activityLogs.length - 1 && (
                            <div className="absolute left-[15px] top-10 h-full w-px bg-border" />
                          )}
                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <p className="text-sm">
                              <span className="font-medium">{log.user?.name}</span>{' '}
                              <span className="text-muted-foreground">{log.description}</span>
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                              {new Date(log.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <SheetHeader>
              <SheetTitle className="sr-only">Task Details</SheetTitle>
              <SheetDescription>Task not found</SheetDescription>
            </SheetHeader>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
