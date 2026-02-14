import { useState, useMemo } from 'react';
import type { Task } from '@/types';
import { TASK_STATUSES } from '@/types';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserHoverCard } from '@/components/shared/UserHoverCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  onView: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getStatusColor(status: string): string {
  return TASK_STATUSES.find((s) => s.value === status)?.color || '#6b7280';
}

export function CalendarView({ tasks, onView }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: { date: number; isCurrentMonth: boolean; dateObj: Date }[] = [];

    // Previous month padding
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLast - i,
        isCurrentMonth: false,
        dateObj: new Date(year, month - 1, prevMonthLast - i),
      });
    }

    // Current month
    for (let d = 1; d <= totalDays; d++) {
      days.push({
        date: d,
        isCurrentMonth: true,
        dateObj: new Date(year, month, d),
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: d,
        isCurrentMonth: false,
        dateObj: new Date(year, month + 1, d),
      });
    }

    return days;
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      const date = task.end_date || task.start_date;
      if (date) {
        const key = new Date(date).toISOString().split('T')[0];
        if (!map[key]) map[key] = [];
        map[key].push(task);
      }
    });
    return map;
  }, [tasks]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="animate-fade-in">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">{monthName}</h2>
        </div>
        <Button variant="outline" size="sm" onClick={goToday} className="cursor-pointer">
          Today
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {DAY_NAMES.map((day) => (
          <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l">
        {calendarDays.map((day, i) => {
          const dateStr = `${day.dateObj.getFullYear()}-${String(day.dateObj.getMonth() + 1).padStart(2, '0')}-${String(day.dateObj.getDate()).padStart(2, '0')}`;
          const dayTasks = tasksByDate[dateStr] || [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={i}
              className={`min-h-[100px] border-r border-b p-1.5 transition-colors ${
                day.isCurrentMonth
                  ? 'bg-card'
                  : 'bg-muted/30'
              } ${isToday ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''}`}
            >
              <div className={`mb-1 text-right text-xs font-medium ${
                !day.isCurrentMonth
                  ? 'text-muted-foreground/40'
                  : isToday
                    ? 'text-brand-600 font-bold'
                    : 'text-muted-foreground'
              }`}>
                {isToday ? (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white text-[11px]">
                    {day.date}
                  </span>
                ) : (
                  day.date
                )}
              </div>

              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => {
                  const assignees = task.assignees || [];
                  const firstAssignee = assignees[0];
                  const firstInitial = firstAssignee?.name?.charAt(0).toUpperCase();
                  return (
                    <button
                      key={task.id}
                      onClick={() => onView(task.id)}
                      className="group/cal flex w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-left transition-all hover:shadow-sm cursor-pointer"
                      style={{ backgroundColor: getStatusColor(task.status) + '18' }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: getStatusColor(task.status) }}
                      />
                      <span className="text-[10px] font-medium truncate flex-1 transition-colors group-hover/cal:text-brand-600">
                        {task.title}
                      </span>
                      {firstAssignee && (
                        <UserHoverCard user={firstAssignee}>
                          <div className="flex items-center gap-0.5 shrink-0 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <Avatar className="h-4 w-4">
                              {firstAssignee.avatar && <AvatarImage src={`/storage/${firstAssignee.avatar}`} />}
                              <AvatarFallback className="bg-brand-100 text-brand-700 text-[6px] font-bold dark:bg-brand-900 dark:text-brand-300">
                                {firstInitial}
                              </AvatarFallback>
                            </Avatar>
                            {assignees.length > 1 && (
                              <span className="text-[8px] font-bold text-muted-foreground">+{assignees.length - 1}</span>
                            )}
                          </div>
                        </UserHoverCard>
                      )}
                    </button>
                  );
                })}
                {dayTasks.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center font-medium">
                    +{dayTasks.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 px-1">
        {TASK_STATUSES.map((s) => (
          <span key={s.value} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
