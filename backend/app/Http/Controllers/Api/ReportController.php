<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function stats()
    {
        $user = auth()->user();
        $cacheKey = 'report_stats_' . $user->id;

        $data = Cache::remember($cacheKey, 300, function () use ($user) {
            $taskQuery = Task::query();
            if (!$user->isAdmin() && !$user->can_view_all_tasks) {
                $taskQuery->where(function ($q) use ($user) {
                    $q->whereHas('assignees', fn($q2) => $q2->where('users.id', $user->id))
                      ->orWhere('created_by', $user->id);
                });
            }

            $total = (clone $taskQuery)->count();
            $byStatus = (clone $taskQuery)->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')->pluck('count', 'status');
            $byPriority = (clone $taskQuery)->select('priority', DB::raw('count(*) as count'))
                ->groupBy('priority')->pluck('count', 'priority');

            // Overdue tasks
            $overdue = (clone $taskQuery)->where('end_date', '<', now()->toDateString())
                ->where('status', '!=', 'complete')->count();

            return [
                'total' => $total,
                'by_status' => $byStatus,
                'by_priority' => $byPriority,
                'overdue' => $overdue,
            ];
        });

        return response()->json($data);
    }

    public function completionTrends(Request $request)
    {
        $days = $request->input('days', 30);
        $cacheKey = 'completion_trends_' . $days;

        $trends = Cache::remember($cacheKey, 600, function () use ($days) {
            $startDate = now()->subDays($days)->toDateString();

            return ActivityLog::where('action', 'status_changed')
                ->where('description', 'like', '%to "complete"%')
                ->where('created_at', '>=', $startDate)
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
                ->groupBy('date')
                ->orderBy('date')
                ->get();
        });

        return response()->json($trends);
    }

    public function teamWorkload()
    {
        $workload = Cache::remember('team_workload', 300, function () {
            return User::select('users.id', 'users.name', 'users.avatar')
                ->withCount(['tasks as total_tasks'])
                ->withCount(['tasks as completed_tasks' => fn($q) => $q->where('status', 'complete')])
                ->withCount(['tasks as in_progress_tasks' => fn($q) => $q->where('status', 'in_progress')])
                ->withCount(['tasks as overdue_tasks' => fn($q) => $q->where('end_date', '<', now()->toDateString())->where('status', '!=', 'complete')])
                ->orderBy('name')
                ->get();
        });

        return response()->json($workload);
    }

    public function overdueTasks()
    {
        $user = auth()->user();

        $query = Task::with(['assignees:id,name,email,avatar', 'creator:id,name', 'labels'])
            ->where('end_date', '<', now()->toDateString())
            ->where('status', '!=', 'complete');

        if (!$user->isAdmin() && !$user->can_view_all_tasks) {
            $query->where(function ($q) use ($user) {
                $q->whereHas('assignees', fn($q2) => $q2->where('users.id', $user->id))
                  ->orWhere('created_by', $user->id);
            });
        }

        $tasks = $query->orderBy('end_date')->get()->map(function ($task) {
            $task->days_overdue = now()->diffInDays($task->end_date);
            return $task;
        });

        return response()->json($tasks);
    }

    public function exportCsv(Request $request)
    {
        $user = auth()->user();

        $query = Task::with(['assignees:id,name,email', 'creator:id,name,email', 'labels']);

        // Permission check
        if (!$user->isAdmin() && !$user->can_view_all_tasks) {
            $query->where(function ($q) use ($user) {
                $q->whereHas('assignees', fn($q2) => $q2->where('users.id', $user->id))
                  ->orWhere('created_by', $user->id);
            });
        }

        // Apply same filters as task index
        if ($request->has('status') && $request->status) {
            $statuses = explode(',', $request->status);
            $query->whereIn('status', $statuses);
        }

        if ($request->has('priority') && $request->priority) {
            $priorities = explode(',', $request->priority);
            $query->whereIn('priority', $priorities);
        }

        if ($request->has('assigned_to') && $request->assigned_to) {
            $query->whereHas('assignees', function ($q) use ($request) {
                $q->where('users.id', $request->assigned_to);
            });
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->where('created_at', '<=', $request->date_to . ' 23:59:59');
        }

        $tasks = $query->orderBy('created_at', 'desc')->get();

        // Build CSV
        $csvHeader = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Creator', 'Assignees', 'Labels', 'Start Date', 'End Date', 'Created At'];

        $callback = function () use ($tasks, $csvHeader) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $csvHeader);

            foreach ($tasks as $task) {
                $assignees = $task->assignees->pluck('name')->implode(', ');
                $labels = $task->labels->pluck('name')->implode(', ');

                fputcsv($handle, [
                    $task->id,
                    $task->title,
                    strip_tags($task->description ?? ''),
                    $task->status,
                    $task->priority,
                    $task->creator?->name ?? '',
                    $assignees,
                    $labels,
                    $task->start_date?->format('Y-m-d') ?? '',
                    $task->end_date?->format('Y-m-d') ?? '',
                    $task->created_at->format('Y-m-d H:i:s'),
                ]);
            }

            fclose($handle);
        };

        $filename = 'tasks_export_' . now()->format('Y-m-d_His') . '.csv';

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function globalSearch(Request $request)
    {
        $search = $request->input('q', '');
        if (strlen($search) < 2) {
            return response()->json(['tasks' => [], 'users' => []]);
        }

        $user = auth()->user();

        // Search tasks
        $taskQuery = Task::with(['assignees:id,name,avatar', 'labels'])
            ->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });

        if (!$user->isAdmin() && !$user->can_view_all_tasks) {
            $taskQuery->where(function ($q) use ($user) {
                $q->whereHas('assignees', fn($q2) => $q2->where('users.id', $user->id))
                  ->orWhere('created_by', $user->id);
            });
        }

        $tasks = $taskQuery->limit(10)->get();

        // Search users
        $users = User::where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%");
        })->select('id', 'name', 'email', 'avatar', 'role', 'status')
          ->limit(5)->get();

        return response()->json([
            'tasks' => $tasks,
            'users' => $users,
        ]);
    }
}
