'use client';

import { useState, useEffect } from 'react';
import api from '@/api/axios';
import type { RecurringTask, TaskPriority } from '@/types';
import { TASK_PRIORITIES } from '@/types';
import { useKanbanColumns } from '@/context/KanbanColumnsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RefreshCw, Plus, Pencil, Trash2, Play, Pause, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { PriorityBadge } from '@/components/shared/PriorityBadge';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function RecurringTasksManager() {
  const { columns } = useKanbanColumns();
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState('09:00');
  const [isActive, setIsActive] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await api.get<RecurringTask[]>('/recurring-tasks');
      setTasks(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('todo');
    setPriority('medium');
    setFrequency('weekly');
    setDayOfWeek(1);
    setDayOfMonth(1);
    setTimeOfDay('09:00');
    setIsActive(true);
    setEditingTask(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (task: RecurringTask) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setPriority(task.priority);
    setFrequency(task.frequency);
    setDayOfWeek(task.day_of_week ?? 1);
    setDayOfMonth(task.day_of_month ?? 1);
    setTimeOfDay(task.time_of_day);
    setIsActive(task.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    const payload = {
      title,
      description: description || null,
      status,
      priority,
      frequency,
      day_of_week: frequency === 'weekly' ? dayOfWeek : null,
      day_of_month: frequency === 'monthly' ? dayOfMonth : null,
      time_of_day: timeOfDay,
      is_active: isActive,
      assignee_ids: editingTask?.assignee_ids || [],
      label_ids: editingTask?.label_ids || [],
    };
    try {
      if (editingTask) {
        await api.put(`/recurring-tasks/${editingTask.id}`, payload);
        toast.success('Recurring task updated');
      } else {
        await api.post('/recurring-tasks', payload);
        toast.success('Recurring task created');
      }
      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/recurring-tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success('Recurring task deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleGenerate = async (id: number) => {
    try {
      await api.post(`/recurring-tasks/${id}/generate`);
      toast.success('Task generated from template');
    } catch {
      toast.error('Failed to generate task');
    }
  };

  const handleToggleActive = async (task: RecurringTask) => {
    try {
      await api.put(`/recurring-tasks/${task.id}`, { ...task, is_active: !task.is_active });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_active: !t.is_active } : t))
      );
      toast.success(task.is_active ? 'Paused' : 'Activated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const getFrequencyLabel = (task: RecurringTask) => {
    if (task.frequency === 'daily') return `Daily at ${task.time_of_day}`;
    if (task.frequency === 'weekly') return `Every ${DAYS_OF_WEEK[task.day_of_week ?? 0]} at ${task.time_of_day}`;
    if (task.frequency === 'monthly') return `Monthly on day ${task.day_of_month} at ${task.time_of_day}`;
    return task.frequency;
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4 text-brand-500" />
            Recurring Tasks
          </CardTitle>
          <Button size="sm" onClick={openCreate} className="bg-brand-600 hover:bg-brand-700 gap-1.5 cursor-pointer">
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No recurring tasks configured</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/30">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{task.title}</p>
                    <PriorityBadge priority={task.priority} />
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${task.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {task.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{getFrequencyLabel(task)}</p>
                  <p className="text-[10px] text-muted-foreground/60">Next: {new Date(task.next_run).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggleActive(task)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer" title={task.is_active ? 'Pause' : 'Activate'}>
                    {task.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => handleGenerate(task.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-brand-600 hover:bg-muted cursor-pointer" title="Generate Now">
                    <Zap className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openEdit(task)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(task.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-red-600 hover:bg-muted cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit' : 'New'} Recurring Task</DialogTitle>
              <DialogDescription>Configure a task that generates on a schedule</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as 'daily' | 'weekly' | 'monthly')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Time</Label>
                  <Input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} />
                </div>
              </div>
              {frequency === 'weekly' && (
                <div>
                  <Label className="text-xs">Day of Week</Label>
                  <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d, i) => (
                        <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {frequency === 'monthly' && (
                <div>
                  <Label className="text-xs">Day of Month</Label>
                  <Input type="number" min={1} max={31} value={dayOfMonth} onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
                <Label htmlFor="isActive" className="text-xs cursor-pointer">Active (will generate tasks on schedule)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-brand-600 hover:bg-brand-700 cursor-pointer">
                {saving ? 'Saving...' : editingTask ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
