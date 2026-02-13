import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Calendar } from 'lucide-react';
import type { Task } from '@/types';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatusDot } from '@/components/shared/UserStatusDot';

interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
}

export function TaskCard({ task, isOverlay, onEdit, onDelete, onView }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const initials = task.assignee?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group animate-scale-in rounded-xl border bg-card p-3 shadow-sm transition-all duration-200 hover:shadow-md dark:border-border/50 ${
        isOverlay ? 'rotate-3 shadow-xl ring-2 ring-brand-500/50' : ''
      } ${isDragging ? 'z-50' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab rounded-md p-0.5 text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <button
            onClick={(e) => { e.stopPropagation(); onView?.(); }}
            className="text-left w-full cursor-pointer group/title"
          >
            <p className="text-sm font-semibold leading-tight transition-colors group-hover/title:text-brand-600">
              {task.title}
            </p>
          </button>

          {task.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground" dangerouslySetInnerHTML={{
              __html: task.description.replace(/<[^>]*>/g, ' ').slice(0, 100)
            }} />
          )}

          {task.end_date && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="text-[11px]">{new Date(task.end_date).toLocaleDateString()}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <PriorityBadge priority={task.priority} />
            <div className="flex items-center gap-1.5">
              {task.assignee && (
                <div className="relative">
                  <Avatar className="h-6 w-6 ring-1 ring-border">
                    {task.assignee.avatar && <AvatarImage src={`/storage/${task.assignee.avatar}`} />}
                    <AvatarFallback className="bg-brand-100 text-brand-700 text-[10px] font-bold dark:bg-brand-900 dark:text-brand-300">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {task.assignee.status && (
                    <UserStatusDot status={task.assignee.status} className="absolute -bottom-px -right-px h-2 w-2 ring-1 ring-card" />
                  )}
                </div>
              )}
              <div className="hidden items-center gap-0.5 group-hover:flex">
                {onEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-brand-600 cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
