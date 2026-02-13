import { useState, useEffect, type FormEvent } from 'react';
import api from '@/api/axios';
import type { Task, User, Attachment, Comment } from '@/types';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileUpload } from '@/components/shared/FileUpload';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { Trash2, Download, FileImage, FileText, File, ExternalLink, Send } from 'lucide-react';
import { toast } from 'sonner';

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  users: User[];
  onSaved: () => void;
}

const FILE_ICONS: Record<string, typeof FileImage> = {
  'image': FileImage,
  'application/pdf': FileText,
  'default': File,
};

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FILE_ICONS['image'];
  if (mimeType === 'application/pdf') return FILE_ICONS['application/pdf'];
  return FILE_ICONS['default'];
}

export function TaskModal({ open, onOpenChange, task, users, onSaved }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('backlog');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [figmaLink, setFigmaLink] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setAssignedTo(task.assigned_to?.toString() || '');
      setStartDate(task.start_date || '');
      setEndDate(task.end_date || '');
      api.get<Task>(`/tasks/${task.id}`).then((res) => {
        setAttachments(res.data.attachments || []);
        setComments(res.data.comments || []);
      });
    } else {
      setTitle('');
      setDescription('');
      setStatus('backlog');
      setPriority('medium');
      setAssignedTo('');
      setStartDate('');
      setEndDate('');
      setAttachments([]);
      setComments([]);
    }
    setNewComment('');
    setFigmaLink('');
  }, [task, open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const data = {
      title,
      description: description || null,
      status,
      priority,
      assigned_to: assignedTo ? Number(assignedTo) : null,
      start_date: startDate || null,
      end_date: endDate || null,
    };

    try {
      if (task) {
        await api.put(`/tasks/${task.id}`, data);
        toast.success('Task updated');
      } else {
        await api.post('/tasks', data);
        toast.success('Task created');
      }
      onSaved();
    } catch {
      toast.error('Failed to save task');
    } finally {
      setSubmitting(false);
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
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleSendComment = async () => {
    if (!task || !newComment.trim()) return;
    setSendingComment(true);
    try {
      const res = await api.post<Comment>(`/tasks/${task.id}/comments`, { body: newComment });
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
    } catch {
      toast.error('Failed to send comment');
    } finally {
      setSendingComment(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{task ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            {task && <TabsTrigger value="attachments">Files ({attachments.length})</TabsTrigger>}
            {task && <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <RichTextEditor content={description} onChange={setDescription} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={submitting}>
                  {submitting ? 'Saving...' : task ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </TabsContent>

          {task && (
            <TabsContent value="attachments" className="mt-4 space-y-4">
              <FileUpload onFilesSelected={handleFileUpload} uploading={uploading} />

              {/* Figma link input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Paste Figma link..."
                  value={figmaLink}
                  onChange={(e) => setFigmaLink(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  disabled={!figmaLink}
                  onClick={() => {
                    if (figmaLink) {
                      window.open(figmaLink, '_blank');
                      setFigmaLink('');
                    }
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </Button>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {/* Image previews */}
                  {attachments.filter((a) => isImage(a.file_type)).length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {attachments.filter((a) => isImage(a.file_type)).map((att) => (
                        <div key={att.id} className="group relative overflow-hidden rounded-lg border bg-muted">
                          <img
                            src={`/storage/${att.file_path}`}
                            alt={att.file_name}
                            className="aspect-square w-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <a
                              href={`/storage/${att.file_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="rounded-full bg-white/20 p-2 text-white hover:bg-red-500/80"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="truncate px-2 py-1.5 text-xs text-muted-foreground">{att.file_name}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Non-image files */}
                  {attachments.filter((a) => !isImage(a.file_type)).map((att) => {
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
                          <a href={`/storage/${att.file_path}`} target="_blank" rel="noopener noreferrer" className="rounded-md p-1.5 text-muted-foreground hover:text-brand-600">
                            <Download className="h-4 w-4" />
                          </a>
                          <button onClick={() => handleDeleteAttachment(att.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}

          {task && (
            <TabsContent value="comments" className="mt-4 space-y-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No comments yet</p>
                )}
                {comments.map((comment) => {
                  const initials = comment.user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div key={comment.id} className="flex gap-3 animate-fade-in">
                      <Avatar className="h-8 w-8 shrink-0">
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
              <div className="flex gap-2">
                <Input
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                  className="flex-1"
                />
                <Button onClick={handleSendComment} disabled={sendingComment || !newComment.trim()} size="icon" className="bg-brand-600 hover:bg-brand-700 shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
