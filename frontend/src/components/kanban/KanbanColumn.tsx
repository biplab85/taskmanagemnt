import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '@/types';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
  onViewTask: (taskId: number) => void;
}

export function KanbanColumn({ status, label, color, tasks, onEditTask, onDeleteTask, onViewTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 min-w-[18rem] flex-col rounded-xl bg-muted/50 transition-all duration-200 dark:bg-muted/30 ${
        isOver ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-background scale-[1.01]' : ''
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 px-2 pb-3" style={{ minHeight: '80px' }}>
          {tasks.length === 0 && (
            <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 text-xs text-muted-foreground">
              Drop tasks here
            </div>
          )}
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.id)}
              onView={() => onViewTask(task.id)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
