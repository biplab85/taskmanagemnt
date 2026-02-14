import type { Task } from '@/types';
import { TASK_STATUSES } from '@/types';
import { PriorityBadge } from '@/components/shared/PriorityBadge';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatusDot } from '@/components/shared/UserStatusDot';
import { UserHoverCard } from '@/components/shared/UserHoverCard';
import { Calendar, Pencil, Trash2, Check } from 'lucide-react';

interface ListViewProps {
  tasks: Task[];
  onView: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}

export function ListView({ tasks, onView, onEdit, onDelete }: ListViewProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {TASK_STATUSES.map((statusDef) => {
        const statusTasks = tasks
          .filter((t) => t.status === statusDef.value)
          .sort((a, b) => a.position - b.position);

        return (
          <div key={statusDef.value}>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: statusDef.color }} />
              <h3 className="text-sm font-semibold">{statusDef.label}</h3>
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
                {statusTasks.length}
              </span>
            </div>

            {statusTasks.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-muted-foreground/15 px-4 py-6 text-center text-xs text-muted-foreground">
                No tasks
              </div>
            ) : (
              <div className="space-y-1.5">
                {statusTasks.map((task, i) => {
                  const assignees = task.assignees || [];
                  return (
                    <div
                      key={task.id}
                      className="group flex items-center gap-4 rounded-xl border bg-card px-4 py-3 transition-all hover:shadow-md hover:bg-accent/30 animate-fade-in"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <button
                        onClick={() => onView(task.id)}
                        className="min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <p className="text-sm font-semibold truncate transition-colors group-hover:text-brand-600">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5" dangerouslySetInnerHTML={{
                            __html: task.description.replace(/<[^>]*>/g, ' ').slice(0, 120)
                          }} />
                        )}
                      </button>

                      <div className="flex items-center gap-3 shrink-0">
                        {task.end_date && (
                          <span className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.end_date).toLocaleDateString()}
                          </span>
                        )}

                        <PriorityBadge priority={task.priority} />

                        {assignees.length > 0 && (
                          <div className="hidden sm:flex -space-x-1.5">
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
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted ring-2 ring-card text-[10px] font-bold text-muted-foreground">
                                +{assignees.length - 2}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onEdit(task)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-brand-600 cursor-pointer">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => onDelete(task.id)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-red-600 cursor-pointer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
