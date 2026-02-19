'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, AlertTriangle, Download, Calendar } from 'lucide-react';
import { useKanbanColumns } from '@/context/KanbanColumnsContext';
import { ReportsSkeleton } from '@/components/shared/ReportsSkeleton';
import { toast } from 'sonner';
import type { Task, TaskPriority } from '@/types';

// ---------- Interfaces ----------

interface Stats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  overdue: number;
}

interface WorkloadUser {
  id: number;
  name: string;
  avatar: string | null;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
}

interface OverdueTask extends Task {
  days_overdue: number;
}

interface CompletionTrend {
  date: string;
  completed: number;
}

// ---------- Priority config ----------

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; text: string; dot: string }> = {
  urgent: { label: 'Urgent', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: '#ef4444' },
  high:   { label: 'High',   bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', dot: '#f97316' },
  medium: { label: 'Medium', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: '#3b82f6' },
  low:    { label: 'Low',    bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: '#6b7280' },
};

// ---------- Helper: initials ----------

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------- Sub-components ----------

function AvatarCircle({ name, avatar, size = 'md' }: { name: string; avatar?: string | null; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        title={name}
        className={`${dim} rounded-full object-cover ring-2 ring-background`}
      />
    );
  }
  return (
    <span
      title={name}
      className={`${dim} rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center ring-2 ring-background`}
    >
      {initials(name)}
    </span>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority as TaskPriority] ?? {
    label: priority,
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
    dot: '#6b7280',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ---------- Completion Trends Chart ----------

function CompletionTrendsChart({ data }: { data: CompletionTrend[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">No completion data available yet</p>
      </div>
    );
  }

  const W = 800;
  const H = 280;
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(...data.map((d) => d.completed), 1);
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * i));

  const points = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padT + chartH - (d.completed / maxVal) * chartH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    setHoveredIndex(closest);
  }, [points]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-500, #6366f1)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-brand-500, #6366f1)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((tick) => {
        const y = padT + chartH - (tick / maxVal) * chartH;
        return (
          <g key={tick}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
            <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground" fontSize="11">{tick}</text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill="url(#trendGrad)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="var(--color-brand-500, #6366f1)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* X-axis labels */}
      {points.map((p, i) => {
        if (data.length <= 7 || i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) {
          return (
            <text key={i} x={p.x} y={H - 8} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
              {formatShortDate(p.date)}
            </text>
          );
        }
        return null;
      })}

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={hoveredIndex === i ? 5 : 3}
          fill="var(--color-brand-500, #6366f1)"
          stroke="white"
          strokeWidth="2"
          className="transition-all duration-150"
        />
      ))}

      {/* Hover tooltip */}
      {hoveredIndex !== null && points[hoveredIndex] && (() => {
        const p = points[hoveredIndex];
        const tooltipW = 120;
        const tooltipH = 44;
        let tx = p.x - tooltipW / 2;
        if (tx < padL) tx = padL;
        if (tx + tooltipW > W - padR) tx = W - padR - tooltipW;
        const ty = p.y - tooltipH - 12;
        return (
          <g>
            <line x1={p.x} y1={padT} x2={p.x} y2={padT + chartH} stroke="var(--color-brand-500, #6366f1)" strokeOpacity="0.2" strokeDasharray="3 3" />
            <rect x={tx} y={ty} width={tooltipW} height={tooltipH} rx="8" fill="var(--color-card, white)" stroke="var(--color-border, #e5e7eb)" strokeWidth="1" />
            <text x={tx + tooltipW / 2} y={ty + 17} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
              {formatShortDate(p.date)}
            </text>
            <text x={tx + tooltipW / 2} y={ty + 34} textAnchor="middle" className="fill-foreground" fontSize="13" fontWeight="600">
              {p.completed} completed
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// ---------- Main Component ----------

export function ReportsPage() {
  const { columns, getColumn } = useKanbanColumns();

  const [stats, setStats] = useState<Stats | null>(null);
  const [workload, setWorkload] = useState<WorkloadUser[]>([]);
  const [overdue, setOverdue] = useState<OverdueTask[]>([]);
  const [completionTrends, setCompletionTrends] = useState<CompletionTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Stats>('/reports/stats'),
      api.get<WorkloadUser[]>('/reports/team-workload'),
      api.get<OverdueTask[]>('/reports/overdue'),
      api.get<CompletionTrend[]>('/reports/completion-trends', { params: { days: 30 } }),
    ])
      .then(([statsRes, workloadRes, overdueRes, trendsRes]) => {
        setStats(statsRes.data);
        setWorkload(workloadRes.data);
        setOverdue(overdueRes.data);
        setCompletionTrends(Array.isArray(trendsRes.data) ? trendsRes.data : []);
      })
      .catch(() => {
        toast.error('Failed to load report data');
      })
      .finally(() => setLoading(false));
  }, []);

  // ---------- CSV Export ----------

  const exportCSV = () => {
    if (!stats) {
      toast.error('No data to export');
      return;
    }

    const rows: string[][] = [];

    // Header
    rows.push(['Section', 'Key', 'Value']);

    // Stats summary
    rows.push(['Stats', 'Total Tasks', String(stats.total)]);
    rows.push(['Stats', 'Overdue Tasks', String(stats.overdue)]);
    const completed = stats.by_status['complete'] ?? 0;
    const rate = stats.total > 0 ? Math.round((completed / stats.total) * 100) : 0;
    rows.push(['Stats', 'Completion Rate (%)', String(rate)]);

    // By status
    for (const [slug, count] of Object.entries(stats.by_status)) {
      const col = getColumn(slug);
      rows.push(['Status Distribution', col?.label ?? slug, String(count)]);
    }

    // By priority
    for (const [priority, count] of Object.entries(stats.by_priority)) {
      rows.push(['Priority Breakdown', priority, String(count)]);
    }

    // Team workload
    for (const u of workload) {
      rows.push(['Team Workload', u.name + ' — Total', String(u.total_tasks)]);
      rows.push(['Team Workload', u.name + ' — Completed', String(u.completed_tasks)]);
      rows.push(['Team Workload', u.name + ' — In Progress', String(u.in_progress_tasks)]);
      rows.push(['Team Workload', u.name + ' — Overdue', String(u.overdue_tasks)]);
    }

    // Overdue tasks
    for (const task of overdue) {
      const assigneeNames = (task.assignees ?? []).map((a) => a.name).join('; ');
      rows.push(['Overdue Tasks', task.title, `${task.days_overdue} days overdue | Priority: ${task.priority} | Assignees: ${assigneeNames}`]);
    }

    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sklentr-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported as CSV');
  };

  // ---------- Derived values ----------

  const completedCount = stats?.by_status['complete'] ?? 0;
  const completionRate = stats && stats.total > 0 ? Math.round((completedCount / stats.total) * 100) : 0;
  const totalStatusCount = stats ? Object.values(stats.by_status).reduce((a, b) => a + b, 0) : 0;
  const maxWorkload = workload.length > 0 ? Math.max(...workload.map((u) => u.total_tasks)) : 1;

  // ---------- Loading ----------

  if (loading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ===== PAGE HEADER ===== */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-brand-600" />
            Reports &amp; Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of task performance and team activity
          </p>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* ===== SECTION 1: STATS CARDS ===== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Total Tasks */}
        <Card className="overflow-hidden border-0 shadow-md animate-fade-in" style={{ animationDelay: '0ms' }}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Tasks</p>
              <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        {/* By Priority */}
        <Card className="overflow-hidden border-0 shadow-md animate-fade-in" style={{ animationDelay: '80ms' }}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">By Priority</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                const count = stats?.by_priority[p] ?? 0;
                return (
                  <div key={p} className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                      {cfg.label}
                    </span>
                    <span className="font-semibold text-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Overdue Tasks */}
        <Card className="overflow-hidden border-0 shadow-md animate-fade-in" style={{ animationDelay: '160ms' }}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-lg ${(stats?.overdue ?? 0) > 0 ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-emerald-500 to-emerald-600'} text-white`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue</p>
              <p className={`text-2xl font-bold ${(stats?.overdue ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                {stats?.overdue ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="overflow-hidden border-0 shadow-md animate-fade-in" style={{ animationDelay: '240ms' }}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/40" />
                <circle
                  cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="4"
                  className="text-brand-500"
                  strokeDasharray={`${completionRate * 1.131} 113.1`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-foreground">{completionRate}%</span>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completion Rate</p>
              <p className="text-2xl font-bold">{completionRate}%</p>
              <p className="text-[11px] text-muted-foreground">{completedCount} / {stats?.total ?? 0} done</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== SECTION 1.5: COMPLETION TRENDS CHART ===== */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-brand-500" />
              Completion Trends
            </CardTitle>
            <span className="text-xs text-muted-foreground">Last 30 days</span>
          </div>
        </CardHeader>
        <CardContent>
          <CompletionTrendsChart data={completionTrends} />
        </CardContent>
      </Card>

      {/* ===== SECTION 2: STATUS DISTRIBUTION ===== */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-brand-500" />
            Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {columns.length === 0 || !stats ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No data available</p>
          ) : (
            columns.map((col) => {
              const count = stats.by_status[col.slug] ?? 0;
              const pct = totalStatusCount > 0 ? Math.round((count / totalStatusCount) * 100) : 0;
              return (
                <div key={col.slug} className="flex items-center gap-3">
                  <span
                    className="w-24 shrink-0 text-xs font-medium text-right pr-1 truncate"
                    style={{ color: col.color }}
                  >
                    {col.label}
                  </span>
                  <div className="flex-1 h-6 bg-muted/40 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: col.color,
                        minWidth: count > 0 ? '2px' : '0',
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 w-20 text-right justify-end">
                    <span className="text-sm font-semibold tabular-nums">{count}</span>
                    <span className="text-xs text-muted-foreground">({pct}%)</span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ===== SECTION 3: TEAM WORKLOAD ===== */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-brand-500" />
            Team Workload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workload.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No team data available</p>
          ) : (
            workload.map((user) => {
              const totalPct = maxWorkload > 0 ? (user.total_tasks / maxWorkload) * 100 : 0;
              const completedPct = user.total_tasks > 0 ? Math.round((user.completed_tasks / user.total_tasks) * 100) : 0;

              return (
                <div key={user.id} className="rounded-xl border bg-card/50 p-4 space-y-3">
                  {/* User info row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarCircle name={user.name} avatar={user.avatar} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.total_tasks} task{user.total_tasks !== 1 ? 's' : ''} total</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs">
                      {user.overdue_tasks > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-red-700 dark:text-red-400 font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          {user.overdue_tasks} overdue
                        </span>
                      )}
                      <span className="text-muted-foreground font-medium">{completedPct}% done</span>
                    </div>
                  </div>

                  {/* Task bar: total */}
                  <div className="space-y-1.5">
                    <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700"
                        style={{ width: `${totalPct}%` }}
                      />
                    </div>

                    {/* Breakdown pills */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {user.completed_tasks} completed
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        {user.in_progress_tasks} in progress
                      </span>
                      {user.overdue_tasks > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          {user.overdue_tasks} overdue
                        </span>
                      )}
                    </div>

                    {/* Stacked bar */}
                    {user.total_tasks > 0 && (
                      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-700"
                          style={{ width: `${(user.completed_tasks / user.total_tasks) * 100}%` }}
                        />
                        <div
                          className="h-full bg-amber-400 transition-all duration-700"
                          style={{ width: `${(user.in_progress_tasks / user.total_tasks) * 100}%` }}
                        />
                        {user.overdue_tasks > 0 && (
                          <div
                            className="h-full bg-red-500 transition-all duration-700"
                            style={{ width: `${(user.overdue_tasks / user.total_tasks) * 100}%` }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ===== SECTION 4: OVERDUE TASKS LIST ===== */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Overdue Tasks
            {overdue.length > 0 && (
              <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 px-1.5 text-[11px] font-bold text-red-700 dark:text-red-400">
                {overdue.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">No overdue tasks!</p>
              <p className="text-xs text-muted-foreground">Everything is on track.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdue.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-red-200/60 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 p-3 transition-all hover:bg-red-50/80 dark:hover:bg-red-950/30"
                >
                  {/* Left: title + assignees */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate hover:text-brand-600 cursor-default transition-colors">
                        {task.title}
                      </p>
                      {task.assignees && task.assignees.length > 0 ? (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          <div className="flex -space-x-1">
                            {task.assignees.slice(0, 4).map((a) => (
                              <AvatarCircle key={a.id} name={a.name} avatar={a.avatar} size="sm" />
                            ))}
                          </div>
                          {task.assignees.length > 4 && (
                            <span className="text-[10px] text-muted-foreground ml-1">
                              +{task.assignees.length - 4} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-1">Unassigned</p>
                      )}
                    </div>
                  </div>

                  {/* Right: days overdue + priority */}
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityPill priority={task.priority} />
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                      {task.days_overdue}d overdue
                    </span>
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
