'use client';

import { useState, useEffect } from 'react';
import api from '@/api/axios';
import type { TaskTemplate, TaskPriority } from '@/types';
import { TASK_PRIORITIES } from '@/types';
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
import { FileStack, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PriorityBadge } from '@/components/shared/PriorityBadge';

export function TaskTemplatesManager() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [titlePattern, setTitlePattern] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  const fetchTemplates = async () => {
    try {
      const res = await api.get<TaskTemplate[]>('/task-templates');
      setTemplates(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const resetForm = () => {
    setName('');
    setTitlePattern('');
    setDescription('');
    setPriority('medium');
    setEditingTemplate(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    setTitlePattern(template.title_pattern || '');
    setDescription(template.description || '');
    setPriority(template.priority);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload = {
      name,
      title_pattern: titlePattern || null,
      description: description || null,
      priority,
    };
    try {
      if (editingTemplate) {
        await api.put(`/task-templates/${editingTemplate.id}`, payload);
        toast.success('Template updated');
      } else {
        await api.post('/task-templates', payload);
        toast.success('Template created');
      }
      setDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/task-templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileStack className="h-4 w-4 text-brand-500" />
            Task Templates
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
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No task templates created yet</p>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/30">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{template.name}</p>
                    <PriorityBadge priority={template.priority} />
                  </div>
                  {template.title_pattern && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      Title: {template.title_pattern}
                    </p>
                  )}
                  {template.description && (
                    <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
                      {template.description.replace(/<[^>]*>/g, '').slice(0, 80)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(template)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(template.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-red-600 hover:bg-muted cursor-pointer">
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
              <DialogTitle>{editingTemplate ? 'Edit' : 'New'} Task Template</DialogTitle>
              <DialogDescription>Save common task configurations for quick reuse</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Template Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Bug Report, Feature Request" />
              </div>
              <div>
                <Label className="text-xs">Title Pattern</Label>
                <Input value={titlePattern} onChange={(e) => setTitlePattern(e.target.value)} placeholder="e.g., [BUG] - " />
                <p className="text-[10px] text-muted-foreground mt-1">Pre-filled task title when using this template</p>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Default task description..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <Label className="text-xs">Default Priority</Label>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-brand-600 hover:bg-brand-700 cursor-pointer">
                {saving ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
