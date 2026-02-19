import { useState } from 'react';
import { Check, Plus, Trash2, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import api from '@/api/axios';
import type { Subtask } from '@/types';

interface SubtaskChecklistProps {
  taskId: number;
  subtasks: Subtask[];
  onUpdate: () => void;
  readonly?: boolean;
}

export function SubtaskChecklist({ taskId, subtasks, onUpdate, readonly = false }: SubtaskChecklistProps) {
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  const completed = subtasks.filter((s) => s.is_completed).length;
  const total = subtasks.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const setLoading = (id: number, loading: boolean) => {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      if (loading) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const setDeleting = (id: number, deleting: boolean) => {
    setDeletingIds((prev) => {
      const next = new Set(prev);
      if (deleting) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggle = async (subtask: Subtask) => {
    if (readonly || loadingIds.has(subtask.id)) return;
    setLoading(subtask.id, true);
    try {
      await api.put(`/subtasks/${subtask.id}`, { is_completed: !subtask.is_completed });
      onUpdate();
    } catch {
      toast.error('Failed to update subtask.');
    } finally {
      setLoading(subtask.id, false);
    }
  };

  const handleDelete = async (subtask: Subtask) => {
    if (readonly || deletingIds.has(subtask.id)) return;
    setDeleting(subtask.id, true);
    try {
      await api.delete(`/subtasks/${subtask.id}`);
      onUpdate();
    } catch {
      toast.error('Failed to delete subtask.');
    } finally {
      setDeleting(subtask.id, false);
    }
  };

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      await api.post(`/tasks/${taskId}/subtasks`, { title });
      setNewTitle('');
      onUpdate();
    } catch {
      toast.error('Failed to add subtask.');
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="animate-fade-in space-y-3">
      {/* Progress header */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">
            Subtasks
          </span>
          <span>
            {completed} of {total} complete
            {total > 0 && (
              <span className="ml-1 text-brand-600 dark:text-brand-400 font-semibold">
                ({percentage}%)
              </span>
            )}
          </span>
        </div>
        <Progress value={completed} max={total > 0 ? total : 1} />
      </div>

      {/* Subtask list */}
      {subtasks.length > 0 && (
        <ul className="space-y-1">
          {subtasks.map((subtask) => (
            <li
              key={subtask.id}
              className="group flex items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-muted/50"
            >
              {/* Drag handle (visual only) */}
              {!readonly && (
                <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
              )}

              {/* Checkbox */}
              <button
                type="button"
                onClick={() => handleToggle(subtask)}
                disabled={readonly || loadingIds.has(subtask.id)}
                aria-label={subtask.is_completed ? 'Mark incomplete' : 'Mark complete'}
                className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 ${
                  subtask.is_completed
                    ? 'border-brand-600 bg-brand-600 dark:border-brand-500 dark:bg-brand-500'
                    : 'border-muted-foreground/40 hover:border-brand-500 dark:hover:border-brand-400'
                } ${readonly ? 'cursor-default' : 'cursor-pointer'} ${loadingIds.has(subtask.id) ? 'opacity-60' : ''}`}
                style={{ minWidth: '1.125rem', minHeight: '1.125rem' }}
              >
                {subtask.is_completed && (
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                )}
              </button>

              {/* Title */}
              <span
                className={`flex-1 text-sm leading-snug transition-all duration-200 ${
                  subtask.is_completed
                    ? 'text-muted-foreground line-through decoration-muted-foreground/50'
                    : 'text-foreground'
                }`}
              >
                {subtask.title}
              </span>

              {/* Delete button */}
              {!readonly && (
                <button
                  type="button"
                  onClick={() => handleDelete(subtask)}
                  disabled={deletingIds.has(subtask.id)}
                  aria-label="Delete subtask"
                  className={`ml-auto shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-all hover:text-red-500 focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 ${
                    deletingIds.has(subtask.id) ? 'cursor-not-allowed opacity-60' : ''
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Empty state */}
      {subtasks.length === 0 && (
        <p className="py-1 text-xs text-muted-foreground">
          No subtasks yet.{!readonly && ' Add one below.'}
        </p>
      )}

      {/* Add subtask input */}
      {!readonly && (
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Plus className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a subtask..."
              disabled={adding}
              className="h-8 pl-8 text-sm placeholder:text-muted-foreground/50"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={!newTitle.trim() || adding}
            className="h-8 shrink-0 bg-brand-600 px-3 text-xs hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-700"
          >
            {adding ? 'Adding…' : 'Add'}
          </Button>
        </div>
      )}
    </div>
  );
}
