import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Clock, CheckCircle2, ListTodo, Activity, TrendingUp,
  Calendar, Users, X, Loader2, InboxIcon, Search, SlidersHorizontal,
  ChevronDown, ArrowUpDown,
} from 'lucide-react';
import api from '@/api/axios';
import type { Task, ActivityLog, TaskStatus, TaskPriority } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// --- Constants ---

const TIME_RANGES = [
  { value: 'all', label: 'All Time', days: 0 },
  { value: '5d', label: '5 Days', days: 5 },
  { value: '20d', label: '20 Days', days: 20 },
  { value: '2m', label: '2 Months', days: 60 },
  { value: '5m', label: '5 Months', days: 150 },
  { value: '1y', label: '1 Year', days: 365 },
  { value: '2y', label: '2 Years', days: 730 },
  { value: '5y', label: '5 Years', days: 1825 },
  { value: 'custom', label: 'Custom', days: -1 },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string; dotClass: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'gray', dotClass: 'bg-gray-400' },
  { value: 'todo', label: 'To Do', color: 'blue', dotClass: 'bg-blue-500' },
  { value: 'in_progress', label: 'In Progress', color: 'amber', dotClass: 'bg-amber-500' },
  { value: 'review', label: 'Review', color: 'purple', dotClass: 'bg-purple-500' },
  { value: 'complete', label: 'Complete', color: 'emerald', dotClass: 'bg-emerald-500' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; dotClass: string }[] = [
  { value: 'low', label: 'Low', dotClass: 'bg-slate-400' },
  { value: 'medium', label: 'Medium', dotClass: 'bg-blue-500' },
  { value: 'high', label: 'High', dotClass: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', dotClass: 'bg-red-500' },
];

const statusConfig = {
  backlog: { label: 'Backlog', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  todo: { label: 'To Do', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  review: { label: 'Review', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  complete: { label: 'Complete', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
} as const;

interface UserListItem {
  id: number;
  name: string;
}

interface Filters {
  timeRange: string;
  dateFrom: string;
  dateTo: string;
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  assignedTo: string;
  search: string;
}

const defaultFilters: Filters = {
  timeRange: 'all',
  dateFrom: '',
  dateTo: '',
  statuses: [],
  priorities: [],
  assignedTo: 'all',
  search: '',
};

function countActiveFilters(f: Filters, isAdmin: boolean): number {
  let count = 0;
  if (f.timeRange !== 'all') count++;
  if (f.timeRange === 'custom' && (f.dateFrom || f.dateTo)) count++;
  if (f.statuses.length > 0) count++;
  if (f.priorities.length > 0) count++;
  if (isAdmin && f.assignedTo !== 'all') count++;
  if (f.search.trim()) count++;
  return count;
}

// --- Component ---

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [users, setUsers] = useState<UserListItem[]>([]);

  const activeCount = countActiveFilters(filters, !!isAdmin);

  // Fetch users list once (admin only)
  useEffect(() => {
    if (isAdmin) {
      api.get<UserListItem[]>('/users-list').then((res) => setUsers(res.data)).catch(() => {});
    }
  }, [isAdmin]);

  const fetchDashboardData = useCallback(async (f: Filters) => {
    const params: Record<string, string> = {};

    // Date range
    if (f.timeRange === 'custom') {
      if (f.dateFrom) params.date_from = f.dateFrom;
      if (f.dateTo) params.date_to = f.dateTo;
    } else if (f.timeRange !== 'all') {
      const range = TIME_RANGES.find((r) => r.value === f.timeRange);
      if (range && range.days > 0) {
        const d = new Date();
        d.setDate(d.getDate() - range.days);
        params.date_from = d.toISOString().split('T')[0];
      }
    }

    // Status
    if (f.statuses.length > 0) {
      params.status = f.statuses.join(',');
    }

    // Priority
    if (f.priorities.length > 0) {
      params.priority = f.priorities.join(',');
    }

    // User
    if (f.assignedTo !== 'all') {
      params.assigned_to = f.assignedTo;
    }

    // Search
    if (f.search.trim()) {
      params.search = f.search.trim();
    }

    const [tasksRes, logsRes] = await Promise.all([
      api.get<Task[]>('/tasks', { params }),
      api.get<ActivityLog[]>('/activity-logs').catch(() => ({ data: [] as ActivityLog[] })),
    ]);

    setTasks(tasksRes.data);
    setActivityLogs(logsRes.data);
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchDashboardData(filters).catch(() => {}).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch on filter changes (skip initial)
  useEffect(() => {
    if (loading) return;
    setFilterLoading(true);
    fetchDashboardData(filters).catch(() => {}).finally(() => setFilterLoading(false));
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Update helpers
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleStatus = (s: TaskStatus) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(s)
        ? prev.statuses.filter((x) => x !== s)
        : [...prev.statuses, s],
    }));
  };

  const togglePriority = (p: TaskPriority) => {
    setFilters((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(p)
        ? prev.priorities.filter((x) => x !== p)
        : [...prev.priorities, p],
    }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setSearchInput('');
  };

  // Stats
  const completed = tasks.filter((t) => t.status === 'complete').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const pending = tasks.filter((t) => t.status === 'backlog' || t.status === 'todo').length;

  const stats = [
    { label: 'Total Tasks', value: tasks.length, icon: ClipboardList, gradient: 'from-blue-500 to-blue-600' },
    { label: 'Completed', value: completed, icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-600' },
    { label: 'In Progress', value: inProgress, icon: Clock, gradient: 'from-amber-500 to-amber-600' },
    { label: 'Pending', value: pending, icon: ListTodo, gradient: 'from-violet-500 to-violet-600' },
  ];

  const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your projects</p>
      </div>

      {/* ========== ADVANCED FILTER BAR (Admin Only) ========== */}
      {isAdmin && <Card className="border-0 shadow-md overflow-hidden">
        {/* Top bar: Search + Filter toggle + Clear */}
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search tasks..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <Button
            variant={filtersOpen ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltersOpen((v) => !v)}
            className="h-9 gap-2"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeCount > 0 && (
              <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                {activeCount}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
          </Button>

          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
              Clear all
            </Button>
          )}

          {filterLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Active filter pills */}
        {activeCount > 0 && !filtersOpen && (
          <div className="flex flex-wrap gap-2 px-4 pb-3">
            {filters.timeRange !== 'all' && (
              <FilterPill
                label={filters.timeRange === 'custom'
                  ? `${filters.dateFrom || '...'} → ${filters.dateTo || '...'}`
                  : TIME_RANGES.find((r) => r.value === filters.timeRange)?.label || filters.timeRange}
                onRemove={() => setFilter('timeRange', 'all')}
              />
            )}
            {filters.statuses.length > 0 && (
              <FilterPill
                label={`Status: ${filters.statuses.map((s) => STATUS_OPTIONS.find((o) => o.value === s)?.label).join(', ')}`}
                onRemove={() => setFilter('statuses', [])}
              />
            )}
            {filters.priorities.length > 0 && (
              <FilterPill
                label={`Priority: ${filters.priorities.map((p) => PRIORITY_OPTIONS.find((o) => o.value === p)?.label).join(', ')}`}
                onRemove={() => setFilter('priorities', [])}
              />
            )}
            {isAdmin && filters.assignedTo !== 'all' && (
              <FilterPill
                label={`User: ${users.find((u) => String(u.id) === filters.assignedTo)?.name || filters.assignedTo}`}
                onRemove={() => setFilter('assignedTo', 'all')}
              />
            )}
            {filters.search.trim() && (
              <FilterPill
                label={`Search: "${filters.search}"`}
                onRemove={() => { setFilter('search', ''); setSearchInput(''); }}
              />
            )}
          </div>
        )}

        {/* Expanded filter panel */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${filtersOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="overflow-hidden">
            <div className="border-t px-4 pb-4 pt-4 space-y-5">

              {/* Row 1: Time Range presets */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Time Range
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_RANGES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setFilter('timeRange', r.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                        filters.timeRange === r.value
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom date inputs */}
              {filters.timeRange === 'custom' && (
                <div className="flex flex-wrap items-end gap-3 pl-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">From</label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilter('dateFrom', e.target.value)}
                      className="h-9 w-[160px]"
                    />
                  </div>
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground mb-2 rotate-90" />
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">To</label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilter('dateTo', e.target.value)}
                      className="h-9 w-[160px]"
                    />
                  </div>
                </div>
              )}

              {/* Row 2: Status multi-select */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Status
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((s) => {
                    const active = filters.statuses.includes(s.value);
                    return (
                      <button
                        key={s.value}
                        onClick={() => toggleStatus(s.value)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${active ? 'bg-white/80' : s.dotClass}`} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: Priority multi-select */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Priority
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_OPTIONS.map((p) => {
                    const active = filters.priorities.includes(p.value);
                    return (
                      <button
                        key={p.value}
                        onClick={() => togglePriority(p.value)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${active ? 'bg-white/80' : p.dotClass}`} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: User filter (admin only) */}
              {isAdmin && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Assigned To
                  </label>
                  <Select value={filters.assignedTo} onValueChange={(v) => setFilter('assignedTo', v)}>
                    <SelectTrigger className="w-[220px] h-9">
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>}

      {/* ========== STATS CARDS ========== */}
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 transition-opacity duration-200 ${filterLoading ? 'opacity-60' : ''}`}>
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

      {/* ========== EMPTY STATE ========== */}
      {tasks.length === 0 && (
        <Card className="border-0 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <InboxIcon className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-lg font-medium text-muted-foreground">No tasks found</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {isAdmin && activeCount > 0
                ? 'Try adjusting your filters or time range'
                : 'Create your first task on the Kanban board'}
            </p>
            {isAdmin && activeCount > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 gap-1.5">
                <X className="h-3.5 w-3.5" />
                Clear all filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========== COMPLETION RING + ACTIVITY FEED ========== */}
      {tasks.length > 0 && (
        <div className={`grid gap-4 lg:grid-cols-3 transition-opacity duration-200 ${filterLoading ? 'opacity-60' : ''}`}>
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
                <span>{completed} of {tasks.length} tasks done</span>
              </div>
            </CardContent>
          </Card>

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
      )}

      {/* ========== RECENT TASKS ========== */}
      {tasks.length > 0 && (
        <Card className={`border-0 shadow-md transition-opacity duration-200 ${filterLoading ? 'opacity-60' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Tasks</CardTitle>
            <button onClick={() => navigate('/kanban')} className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors cursor-pointer">
              View all &rarr;
            </button>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Sub-components ---

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 dark:bg-brand-900/40 px-2.5 py-1 text-[11px] font-medium text-brand-700 dark:text-brand-300">
      {label}
      <button onClick={onRemove} className="ml-0.5 rounded-full p-0.5 hover:bg-brand-200 dark:hover:bg-brand-800 transition-colors cursor-pointer">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
