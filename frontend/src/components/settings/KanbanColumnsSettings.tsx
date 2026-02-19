import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '@/api/axios';
import { useKanbanColumns, type KanbanColumn } from '@/context/KanbanColumnsContext';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GripVertical, Plus, Trash2, Columns3 } from 'lucide-react';
import { toast } from 'sonner';

function SortableColumnRow({
  column,
  onLabelChange,
  onColorChange,
  onDelete,
}: {
  column: KanbanColumn;
  onLabelChange: (id: number, label: string) => void;
  onColorChange: (id: number, color: string) => void;
  onDelete: (column: KanbanColumn) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:bg-accent/30"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <input
        type="color"
        value={column.color}
        onChange={(e) => onColorChange(column.id, e.target.value)}
        className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
      />

      <Input
        value={column.label}
        onChange={(e) => onLabelChange(column.id, e.target.value)}
        className="flex-1 h-8 text-sm"
      />

      <span className="text-xs text-muted-foreground font-mono shrink-0">{column.slug}</span>

      <button
        onClick={() => onDelete(column)}
        className="rounded-md p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
        title="Delete column"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function KanbanColumnsSettings() {
  const { columns, refetch } = useKanbanColumns();
  const [localColumns, setLocalColumns] = useState<KanbanColumn[]>(columns);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<KanbanColumn | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Sync local state when context columns change
  useState(() => {
    setLocalColumns(columns);
  });

  // Keep local state in sync with columns from context
  if (columns !== localColumns && !saving) {
    // Only resync if we're not in the middle of a save
    if (JSON.stringify(columns.map(c => c.id)) !== JSON.stringify(localColumns.map(c => c.id))) {
      setLocalColumns(columns);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localColumns.findIndex((c) => c.id === active.id);
    const newIndex = localColumns.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(localColumns, oldIndex, newIndex);
    setLocalColumns(reordered);

    try {
      await api.put('/kanban-columns/reorder', {
        columns: reordered.map((c, i) => ({ id: c.id, position: i })),
      });
      await refetch();
      toast.success('Column order updated');
    } catch {
      toast.error('Failed to reorder columns');
      setLocalColumns(columns);
    }
  };

  const handleLabelChange = (id: number, label: string) => {
    setLocalColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, label } : c))
    );
  };

  const handleColorChange = (id: number, color: string) => {
    setLocalColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, color } : c))
    );
  };

  const handleSaveColumn = async (col: KanbanColumn) => {
    setSaving(true);
    try {
      await api.put(`/kanban-columns/${col.id}`, {
        label: col.label,
        color: col.color,
      });
      await refetch();
      toast.success('Column updated');
    } catch {
      toast.error('Failed to update column');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(
        localColumns.map((col) =>
          api.put(`/kanban-columns/${col.id}`, {
            label: col.label,
            color: col.color,
          })
        )
      );
      await refetch();
      toast.success('All columns saved');
    } catch {
      toast.error('Failed to save columns');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      await api.post('/kanban-columns', {
        label: newLabel.trim(),
        color: newColor,
      });
      setNewLabel('');
      setNewColor('#6b7280');
      await refetch();
      toast.success('Column added');
    } catch {
      toast.error('Failed to add column');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !reassignTo) return;
    setDeleting(true);
    try {
      await api.delete(`/kanban-columns/${deleteTarget.id}`, {
        data: { reassign_to: reassignTo },
      });
      setDeleteTarget(null);
      setReassignTo('');
      await refetch();
      toast.success('Column deleted and tasks reassigned');
    } catch {
      toast.error('Failed to delete column');
    } finally {
      setDeleting(false);
    }
  };

  // Check if any column has unsaved changes
  const hasChanges = localColumns.some((local) => {
    const original = columns.find((c) => c.id === local.id);
    return original && (original.label !== local.label || original.color !== local.color);
  });

  return (
    <>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Columns3 className="h-4 w-4 text-brand-500" />
            Kanban Columns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Manage kanban board columns. Drag to reorder, edit labels and colors, or add new columns.
          </p>

          {/* Draggable column list */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localColumns.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5">
                {localColumns.map((col) => (
                  <SortableColumnRow
                    key={col.id}
                    column={col}
                    onLabelChange={handleLabelChange}
                    onColorChange={handleColorChange}
                    onDelete={(c) => {
                      setDeleteTarget(c);
                      // Default reassign to the first column that isn't the one being deleted
                      const fallback = columns.find((x) => x.slug !== c.slug);
                      setReassignTo(fallback?.slug || '');
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Save changes button */}
          {hasChanges && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={saving}
                className="bg-brand-600 hover:bg-brand-700 cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}

          {/* Add new column */}
          <div className="rounded-xl border border-dashed p-4 space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Add New Column
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
              />
              <Input
                placeholder="Column name..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
                className="flex-1"
              />
              <Button
                onClick={handleAdd}
                disabled={adding || !newLabel.trim()}
                className="bg-brand-600 hover:bg-brand-700 gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {adding ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.label}&rdquo; column?</AlertDialogTitle>
            <AlertDialogDescription>
              All tasks in this column will be moved to the column you select below.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <Label className="text-sm">Move tasks to:</Label>
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {columns
                  .filter((c) => c.slug !== deleteTarget?.slug)
                  .map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting || !reassignTo}
              className="bg-red-600 hover:bg-red-700 cursor-pointer"
            >
              {deleting ? 'Deleting...' : 'Delete Column'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
