'use client';

import { useState, useEffect } from 'react';
import api from '@/api/axios';
import type { Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Link2, Plus, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface DependencySelectProps {
  taskId: number;
  dependencies: { id: number; title: string; status: string }[];
  dependents: { id: number; title: string; status: string }[];
  onUpdate: () => void;
}

export function DependencySelect({ taskId, dependencies, dependents, onUpdate }: DependencySelectProps) {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && allTasks.length === 0) {
      api.get<Task[]>('/tasks').then((res) => setAllTasks(res.data)).catch(() => {});
    }
  }, [open, allTasks.length]);

  const currentDepIds = new Set(dependencies.map((d) => d.id));

  const filteredTasks = allTasks.filter(
    (t) => t.id !== taskId && !currentDepIds.has(t.id) && t.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddDependency = async (depId: number) => {
    setLoading(true);
    try {
      const newIds = [...dependencies.map((d) => d.id), depId];
      await api.put(`/tasks/${taskId}/dependencies`, { dependency_ids: newIds });
      onUpdate();
      setSearch('');
    } catch {
      toast.error('Failed to add dependency');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDependency = async (depId: number) => {
    setLoading(true);
    try {
      const newIds = dependencies.filter((d) => d.id !== depId).map((d) => d.id);
      await api.put(`/tasks/${taskId}/dependencies`, { dependency_ids: newIds });
      onUpdate();
    } catch {
      toast.error('Failed to remove dependency');
    } finally {
      setLoading(false);
    }
  };

  const hasDeps = dependencies.length > 0 || dependents.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" />
          Dependencies
        </h4>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" side="left" align="start">
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs mb-2"
              autoFocus
            />
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filteredTasks.slice(0, 10).map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleAddDependency(t.id)}
                  disabled={loading}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                >
                  <span className="flex-1 truncate font-medium">{t.title}</span>
                  <StatusBadge status={t.status} />
                </button>
              ))}
              {filteredTasks.length === 0 && (
                <p className="py-3 text-center text-xs text-muted-foreground">No tasks found</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {!hasDeps && (
        <p className="text-xs text-muted-foreground/60 italic">No dependencies</p>
      )}

      {/* Blocked by */}
      {dependencies.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Blocked by</p>
          {dependencies.map((dep) => (
            <div key={dep.id} className="group flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
              <span className="flex-1 truncate font-medium">{dep.title}</span>
              <StatusBadge status={dep.status} />
              <button
                onClick={() => handleRemoveDependency(dep.id)}
                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground hover:text-red-500 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Blocks */}
      {dependents.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Blocks</p>
          {dependents.map((dep) => (
            <div key={dep.id} className="flex items-center gap-2 rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 px-2.5 py-1.5 text-xs">
              <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
              <span className="flex-1 truncate font-medium">{dep.title}</span>
              <StatusBadge status={dep.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
