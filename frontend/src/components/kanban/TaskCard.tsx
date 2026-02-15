import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Calendar, Check } from 'lucide-react';
import type { Task } from '@/types';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserStatusDot } from '@/components/shared/UserStatusDot';
import { UserHoverCard } from '@/components/shared/UserHoverCard';

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

  const assignees = task.assignees || [];

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
              {assignees.length > 0 && (
                <div className="flex -space-x-1.5">
                  {assignees.slice(0, 2).map((u) => {
                    const initials = u.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <UserHoverCard key={u.id} user={u}>
                        <div className="relative cursor-pointer">
                          <Avatar className="h-6 w-6 ring-2 ring-card">
                            {u.avatar && <AvatarImage src={`/storage/${u.avatar}`} />}
                            <AvatarFallback className="bg-brand-100 text-brand-700 text-[10px] font-bold dark:bg-brand-900 dark:text-brand-300">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          {u.status && (
                            <UserStatusDot status={u.status} className="absolute -bottom-px -right-px h-2 w-2 ring-1 ring-card" />
                          )}
                          {u.profile_completed && (
                            <span className="absolute -top-px -left-px flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-white ring-1 ring-card" title="Profile Complete">
                              <Check className="h-1.5 w-1.5" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      </UserHoverCard>
                    );
                  })}
                  {assignees.length > 2 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-muted ring-2 ring-card text-[10px] font-bold text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                        >
                          +{assignees.length - 2}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-48 p-2" onClick={(e) => e.stopPropagation()}>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">All Assignees</p>
                        <div className="space-y-1.5">
                          {assignees.map((u) => {
                            const initials = u.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                            return (
                              <div key={u.id} className="flex items-center gap-2 px-1">
                                <Avatar className="h-6 w-6">
                                  {u.avatar && <AvatarImage src={`/storage/${u.avatar}`} />}
                                  <AvatarFallback className="bg-brand-100 text-brand-700 text-[10px] font-bold dark:bg-brand-900 dark:text-brand-300">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-foreground">{u.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
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
