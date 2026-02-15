import type { Task } from '@/types';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatusDot } from '@/components/shared/UserStatusDot';
import { UserHoverCard } from '@/components/shared/UserHoverCard';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Pencil, Trash2, Check } from 'lucide-react';

interface GridViewProps {
  tasks: Task[];
  onView: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}

export function GridView({ tasks, onView, onEdit, onDelete }: GridViewProps) {
  const sorted = [...tasks].sort((a, b) => {
    const statusOrder = ['in_progress', 'todo', 'review', 'backlog', 'complete'];
    const diff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    if (diff !== 0) return diff;
    return a.position - b.position;
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
      {sorted.map((task, i) => {
        const assignees = task.assignees || [];
        return (
          <div
            key={task.id}
            className="group flex flex-col rounded-xl border bg-card shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 animate-scale-in overflow-hidden"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {/* Color bar */}
            <div className="h-1" style={{
              backgroundColor: (() => {
                const colors: Record<string, string> = { backlog: '#6b7280', todo: '#3b82f6', in_progress: '#f59e0b', review: '#8b5cf6', complete: '#10b981' };
                return colors[task.status];
              })()
            }} />

            <div className="flex flex-1 flex-col p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <StatusBadge status={task.status} />
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(task)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-brand-600 cursor-pointer">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onDelete(task.id)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-red-600 cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Title */}
              <button
                onClick={() => onView(task.id)}
                className="text-left cursor-pointer mb-2"
              >
                <h3 className="text-sm font-semibold leading-snug transition-colors group-hover:text-brand-600 line-clamp-2">
                  {task.title}
                </h3>
              </button>

              {/* Description */}
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3" dangerouslySetInnerHTML={{
                  __html: task.description.replace(/<[^>]*>/g, ' ').slice(0, 100)
                }} />
              )}

              {/* Footer */}
              <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={task.priority} />
                  {task.end_date && (
                    <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(task.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>

                {assignees.length > 0 ? (
                  <div className="flex -space-x-1.5">
                    {assignees.slice(0, 2).map((u) => {
                      const initials = u.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <UserHoverCard key={u.id} user={u}>
                          <div className="relative cursor-pointer">
                            <Avatar className="h-7 w-7 ring-2 ring-card">
                              {u.avatar && <AvatarImage src={`/storage/${u.avatar}`} />}
                              <AvatarFallback className="bg-brand-100 text-brand-700 text-[10px] font-bold dark:bg-brand-900 dark:text-brand-300">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            {u.status && <UserStatusDot status={u.status} className="absolute -bottom-px -right-px h-2 w-2 ring-1 ring-card" />}
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
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted ring-2 ring-card text-[10px] font-bold text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
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
                ) : (
                  <span className="text-[11px] text-muted-foreground">Unassigned</span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {sorted.length === 0 && (
        <div className="col-span-full flex h-40 items-center justify-center rounded-xl border-2 border-dashed text-sm text-muted-foreground">
          No tasks found
        </div>
      )}
    </div>
  );
}
