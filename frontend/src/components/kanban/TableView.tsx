import type { Task } from '@/types';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatusDot } from '@/components/shared/UserStatusDot';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2 } from 'lucide-react';

interface TableViewProps {
  tasks: Task[];
  onView: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}

export function TableView({ tasks, onView, onEdit, onDelete }: TableViewProps) {
  const sorted = [...tasks].sort((a, b) => {
    const statusOrder = ['in_progress', 'todo', 'review', 'backlog', 'complete'];
    const diff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    if (diff !== 0) return diff;
    return a.position - b.position;
  });

  return (
    <div className="rounded-xl border bg-card shadow-md overflow-hidden animate-fade-in">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%]">Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((task, i) => {
            const initials = task.assignee?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <TableRow
                key={task.id}
                className="group transition-colors hover:bg-accent/30 animate-fade-in"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <TableCell>
                  <button onClick={() => onView(task.id)} className="text-left cursor-pointer group/title">
                    <p className="text-sm font-semibold truncate max-w-[300px] transition-colors group-hover/title:text-brand-600">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[300px] mt-0.5" dangerouslySetInnerHTML={{
                        __html: task.description.replace(/<[^>]*>/g, ' ').slice(0, 80)
                      }} />
                    )}
                  </button>
                </TableCell>
                <TableCell>
                  <StatusBadge status={task.status} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={task.priority} />
                </TableCell>
                <TableCell>
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar className="h-7 w-7 ring-1 ring-border">
                          {task.assignee.avatar && <AvatarImage src={`/storage/${task.assignee.avatar}`} />}
                          <AvatarFallback className="bg-brand-100 text-brand-700 text-[10px] font-bold dark:bg-brand-900 dark:text-brand-300">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        {task.assignee.status && <UserStatusDot status={task.assignee.status} className="absolute -bottom-px -right-px h-2 w-2 ring-1 ring-card" />}
                      </div>
                      <span className="text-sm hidden lg:inline">{task.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {task.start_date ? new Date(task.start_date).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {task.end_date ? new Date(task.end_date).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(task)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-brand-600 cursor-pointer">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onDelete(task.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-red-600 cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                No tasks found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
