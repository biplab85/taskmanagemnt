'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/api/axios';
import type { LeaveRequest, Holiday } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarRange, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LEAVE_COLORS: Record<string, string> = {
  'sick-leave': 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-300',
  'casual-leave': 'bg-blue-200 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  'annual-leave': 'bg-emerald-200 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
  'work-from-home': 'bg-violet-200 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300',
};

function getLeaveColor(slug: string): string {
  return LEAVE_COLORS[slug] || 'bg-brand-200 dark:bg-brand-900/40 text-brand-800 dark:text-brand-300';
}

export function LeaveCalendarPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendar();
  }, [month, year]);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leave-calendar', { params: { month, year } });
      setLeaves(res.data.leaves || []);
      setHolidays(res.data.holidays || []);
    } catch {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const prev = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const next = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return days;
  }, [month, year]);

  const getLeavesForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leaves.filter((l) => {
      const start = l.start_date.slice(0, 10);
      const end = l.end_date.slice(0, 10);
      return dateStr >= start && dateStr <= end;
    });
  };

  const getHolidayForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find((h) => h.date.slice(0, 10) === dateStr);
  };

  const isWeekend = (day: number) => {
    const d = new Date(year, month - 1, day).getDay();
    return d === 0 || d === 6;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/leave">
            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <CalendarRange className="h-5 w-5 text-brand-600" />
          <h1 className="text-xl font-bold tracking-tight">Leave Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prev} className="h-8 w-8 cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={next} className="h-8 w-8 cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : (
        <Card className="border-0 shadow-md overflow-hidden">
          <CardContent className="p-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b bg-muted/50">
              {DAY_NAMES.map((d) => (
                <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="min-h-[100px] border-b border-r bg-muted/10" />;
                }

                const dayLeaves = getLeavesForDay(day);
                const holiday = getHolidayForDay(day);
                const weekend = isWeekend(day);
                const today = isToday(day);

                return (
                  <div
                    key={day}
                    className={`min-h-[100px] border-b border-r p-1.5 transition-colors ${
                      weekend ? 'bg-muted/20' : ''
                    } ${today ? 'ring-2 ring-inset ring-brand-500' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${today ? 'text-brand-600' : weekend ? 'text-muted-foreground/50' : 'text-foreground'}`}>
                        {day}
                      </span>
                    </div>
                    {holiday && (
                      <div className="mb-1 rounded px-1.5 py-0.5 text-[9px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 truncate">
                        {holiday.name}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {dayLeaves.slice(0, 3).map((l) => (
                        <div
                          key={l.id}
                          className={`flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-medium truncate ${getLeaveColor(l.leave_type?.slug || '')}`}
                          title={`${l.user?.name} — ${l.leave_type?.name} (${l.status})`}
                        >
                          <Avatar className="h-3.5 w-3.5 shrink-0">
                            {l.user?.avatar && <AvatarImage src={`/storage/${l.user.avatar}`} />}
                            <AvatarFallback className="text-[6px]">{l.user?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{l.user?.name}</span>
                        </div>
                      ))}
                      {dayLeaves.length > 3 && (
                        <span className="text-[9px] text-muted-foreground pl-1">+{dayLeaves.length - 3} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-200" /> Holiday
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-200" /> Sick
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-200" /> Casual
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-200" /> Annual
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-200" /> WFH
        </span>
      </div>
    </div>
  );
}
