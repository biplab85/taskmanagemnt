'use client';

import { useState } from 'react';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Trash2, ArrowRightLeft, Flag } from 'lucide-react';
import { useKanbanColumns } from '@/context/KanbanColumnsContext';
import { TASK_PRIORITIES } from '@/types';
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

interface BulkActionBarProps {
  selectedIds: Set<number>;
  onClear: () => void;
  onDone: () => void;
}

export function BulkActionBar({ selectedIds, onClear, onDone }: BulkActionBarProps) {
  const { columns } = useKanbanColumns();
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const count = selectedIds.size;

  if (count === 0) return null;

  const handleBulkAction = async (action: string, value?: string) => {
    setLoading(true);
    try {
      await api.post('/tasks-bulk', {
        task_ids: Array.from(selectedIds),
        action,
        value,
      });
      toast.success(`Bulk ${action} applied to ${count} task${count !== 1 ? 's' : ''}`);
      onClear();
      onDone();
    } catch {
      toast.error('Bulk action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in">
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-3 shadow-2xl">
          <span className="text-sm font-semibold text-foreground">
            {count} selected
          </span>

          <div className="h-5 w-px bg-border" />

          {/* Change Status */}
          <Select
            onValueChange={(val) => handleBulkAction('status', val)}
            disabled={loading}
          >
            <SelectTrigger className="h-8 w-auto gap-1.5 text-xs border-none bg-muted/60 px-3">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col.slug} value={col.slug} className="text-xs">
                  {col.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Change Priority */}
          <Select
            onValueChange={(val) => handleBulkAction('priority', val)}
            disabled={loading}
          >
            <SelectTrigger className="h-8 w-auto gap-1.5 text-xs border-none bg-muted/60 px-3">
              <Flag className="h-3.5 w-3.5" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={loading}
            className="h-8 gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>

          <div className="h-5 w-px bg-border" />

          {/* Clear */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="h-7 w-7 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} task{count !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the selected tasks. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBulkAction('delete')}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
