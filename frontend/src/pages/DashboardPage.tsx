import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, CheckCircle2, AlertCircle, Activity, TrendingUp } from 'lucide-react';
import api from '@/api/axios';
import type { Task, ActivityLog } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';

const statusConfig = {
  backlog: { label: 'Backlog', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  todo: { label: 'To Do', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  review: { label: 'Review', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  complete: { label: 'Complete', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
} as const;

export function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get<Task[]>('/tasks'),
      api.get<ActivityLog[]>('/activity-logs').catch(() => ({ data: [] as ActivityLog[] })),
    ]).then(([tasksRes, logsRes]) => {
      setTasks(tasksRes.data);
      setActivityLogs(logsRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Total Tasks', value: tasks.length, icon: ClipboardList, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'In Progress', value: tasks.filter((t) => t.status === 'in_progress').length, icon: Clock, gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Completed', value: tasks.filter((t) => t.status === 'complete').length, icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Urgent', value: tasks.filter((t) => t.priority === 'urgent').length, icon: AlertCircle, gradient: 'from-red-500 to-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
  ];

  const completionRate = tasks.length > 0
    ? Math.round((tasks.filter((t) => t.status === 'complete').length / tasks.length) * 100)
    : 0;

  const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your projects</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={stat.label} className="overflow-hidden animate-fade-in border-0 shadow-md" style={{ animationDelay: `${i * 80}ms` }}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion rate + Activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Progress */}
        <Card className="border-0 shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="relative h-32 w-32">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/50" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-brand-500"
                  strokeDasharray={`${completionRate * 2.51} 251`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{completionRate}%</span>
                <span className="text-xs text-muted-foreground">Complete</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              <span>{tasks.filter((t) => t.status === 'complete').length} of {tasks.length} tasks done</span>
            </div>
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-brand-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-56 overflow-y-auto">
              {activityLogs.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No recent activity</p>
              ) : (
                activityLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    <Avatar className="h-7 w-7 mt-0.5">
                      <AvatarFallback className="bg-brand-100 text-brand-700 text-[10px] font-bold dark:bg-brand-900 dark:text-brand-300">
                        {log.user?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground/80">
                        <span className="font-medium">{log.user?.name}</span>{' '}
                        <span className="text-muted-foreground">{log.description}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground/60">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Tasks</CardTitle>
          <button onClick={() => navigate('/kanban')} className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors cursor-pointer">
            View all &rarr;
          </button>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No tasks yet. Create one on the Kanban board.</p>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl border p-3 transition-all hover:bg-accent/50 hover:shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.assignee ? task.assignee.name : 'Unassigned'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={task.priority} />
                    <Badge variant="secondary" className={statusConfig[task.status].className}>
                      {statusConfig[task.status].label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
