'use client';

import { useState, useEffect } from 'react';
import api from '@/api/axios';
import type { Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Archive, RotateCcw, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
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

export function ArchivePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchArchived();
  }, []);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const res = await api.get<Task[]>('/tasks-archived');
      setTasks(res.data);
    } catch {
      toast.error('Failed to load archived tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.post(`/tasks/${id}/restore`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success('Task restored');
    } catch {
      toast.error('Failed to restore task');
    }
  };

  const handlePermanentDelete = async (id: number) => {
    try {
      await api.delete(`/tasks/${id}/force`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setDeleteId(null);
      toast.success('Task permanently deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Archive className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Archive</h1>
            <p className="text-sm text-muted-foreground">
              {tasks.length} deleted task{tasks.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      {tasks.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search archived tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && tasks.length === 0 && (
        <EmptyState
          icon={Archive}
          title="Archive is empty"
          description="Deleted tasks will appear here. You can restore them within 30 days."
        />
      )}

      {/* Task list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((task) => {
            const deletedAt = (task as unknown as Record<string, unknown>).deleted_at as string | undefined;
            return (
              <div
                key={task.id}
                className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold truncate">{task.title}</h3>
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {task.creator && (
                      <span className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          {task.creator.avatar && <AvatarImage src={`/storage/${task.creator.avatar}`} />}
                          <AvatarFallback className="text-[8px]">
                            {task.creator.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {task.creator.name}
                      </span>
                    )}
                    {deletedAt && (
                      <span>Deleted {new Date(deletedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(task.id)}
                    className="gap-1.5 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(task.id)}
                    className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This task will be permanently deleted and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handlePermanentDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
