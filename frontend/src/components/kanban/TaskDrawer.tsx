import { useState, useEffect } from 'react';
import api from '@/api/axios';
import type { Task, User, Attachment, Comment, ActivityLog, UserStatus } from '@/types';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/types';
import { useAuth } from '@/context/AuthContext';
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
} from 'lucide-react';
import { toast } from 'sonner';

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

export function TaskDrawer({ open, onOpenChange, taskId, users, onTaskUpdated }: TaskDrawerProps) {
  const { onStatusChange } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('backlog');
  const [editPriority, setEditPriority] = useState('medium');
  const [editAssigneeIds, setEditAssigneeIds] = useState<number[]>([]);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
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
        setLoading(false);
      }).catch(() => {
        toast.error('Failed to load task');
        setLoading(false);
      });
    }
  }, [open, taskId]);

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

  const statusInfo = TASK_STATUSES.find((s) => s.value === task?.status);
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
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="shrink-0 gap-1.5 cursor-pointer">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
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
                {TASK_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleQuickStatusChange(s.value)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                      task.status === s.value
                        ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-500 dark:bg-brand-950/30 dark:text-brand-400'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <Tabs defaultValue="details" className="flex h-full flex-col">
                <TabsList className="mx-6 mt-4 grid w-auto grid-cols-4 shrink-0">
                  <TabsTrigger value="details" className="gap-1.5 cursor-pointer">
                    <Pencil className="h-3.5 w-3.5" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="gap-1.5 cursor-pointer">
                    <Paperclip className="h-3.5 w-3.5" />
                    Files ({attachments.length})
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
                                    {u.status && <UserStatusDot status={u.status} className="absolute -bottom-px -right-px h-2 w-2 ring-1 ring-card" />}
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
                        dangerouslySetInnerHTML={{ __html: task.description }}
                      />
                    ) : (
                      <p className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                        No description provided.
                      </p>
                    )}
                  </div>

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
                              <img src={`/storage/${att.file_path}`} alt={att.file_name} className="aspect-square w-full object-cover" />
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
                        return (
                          <div key={att.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/50">
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
                        );
                      })}
                    </div>
                  )}
                  {attachments.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">No attachments yet. Upload files above.</p>
                  )}
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="flex flex-1 flex-col px-6 pb-6 mt-4">
                  <div className="flex-1 space-y-3 overflow-y-auto mb-4">
                    {comments.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">No comments yet. Start the conversation!</p>
                    )}
                    {comments.map((comment) => {
                      const initials = comment.user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <div key={comment.id} className="flex gap-3 animate-fade-in">
                          <Avatar className="h-8 w-8 shrink-0">
                            {comment.user?.avatar && <AvatarImage src={`/storage/${comment.user.avatar}`} />}
                            <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-bold dark:bg-brand-900 dark:text-brand-300">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{comment.user?.name}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(comment.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-foreground/80">{comment.body}</p>
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
                      <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
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
