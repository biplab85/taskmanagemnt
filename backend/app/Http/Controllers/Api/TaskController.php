<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Requests\BulkTaskRequest;
use App\Http\Requests\ReorderTaskRequest;
use App\Models\Task;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();

        // Conditional eager loading based on query parameters
        $includes = collect(explode(',', $request->query('include', '')))
            ->intersect(['comments', 'attachments', 'subtasks', 'labels', 'dependencies'])
            ->toArray();
        $defaultIncludes = ['assignees:id,name,email,avatar,status,phone,department,location,profile_completed', 'creator:id,name,email,avatar'];
        $query = Task::with(array_merge($defaultIncludes, $includes));

        if (!$user->isAdmin() && !$user->can_view_all_tasks) {
            $query->where(function ($q) use ($user) {
                $q->whereHas('assignees', function ($q2) use ($user) {
                    $q2->where('users.id', $user->id);
                })->orWhere('created_by', $user->id);
            });
        }

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

        $query->orderBy('position')->orderBy('created_at', 'desc');

        // Optional pagination: send ?per_page=20 to paginate
        if ($request->has('per_page')) {
            $perPage = min((int) $request->per_page, 100);
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->get());
    }

    public function store(StoreTaskRequest $request)
    {
        // Shift existing tasks down to make room at position 0
        $targetStatus = $request->status ?? 'backlog';
        Task::where('status', $targetStatus)->increment('position');

        $task = Task::create([
            'title' => $request->title,
            'description' => $request->description,
            'status' => $targetStatus,
            'priority' => $request->priority ?? 'medium',
            'created_by' => auth()->id(),
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'position' => 0,
        ]);

        // Sync assignees
        $assigneeIds = $request->assignees ?? [];
        if (!empty($assigneeIds)) {
            $task->assignees()->sync($assigneeIds);
        }

        // Sync labels
        if ($request->has('labels')) {
            $task->labels()->sync($request->labels ?? []);
        }

        $task->load(['assignees:id,name,email,avatar,status,phone,department,location,profile_completed', 'creator:id,name,email,avatar', 'labels', 'subtasks']);

        // Activity log
        ActivityLog::create([
            'user_id' => auth()->id(),
            'task_id' => $task->id,
            'action' => 'created',
            'description' => 'Created task "' . $task->title . '"',
        ]);

        $currentUserId = auth()->id();
        $currentUserName = auth()->user()->name;

        // Notify creator (self) about task creation
        Notification::create([
            'user_id' => $currentUserId,
            'task_id' => $task->id,
            'title' => 'Task Created',
            'message' => 'You created "' . $task->title . '"',
            'type' => 'task_created',
        ]);

        // Notify each assignee (if different from creator)
        foreach ($assigneeIds as $assigneeId) {
            if ((int) $assigneeId !== $currentUserId) {
                Notification::create([
                    'user_id' => $assigneeId,
                    'task_id' => $task->id,
                    'title' => 'Task Assigned',
                    'message' => $currentUserName . ' assigned you to "' . $task->title . '"',
                    'type' => 'task_assigned',
                ]);
            }
        }

        // Clear report caches
        $this->clearReportCaches();

        return response()->json($task, 201);
    }

    public function show($id)
    {
        $task = Task::with([
            'assignees:id,name,email,avatar,status,phone,department,location,profile_completed',
            'creator:id,name,email,avatar',
            'comments.user:id,name,email,avatar',
            'comments.reactions.user:id,name',
            'attachments.user:id,name,email',
            'dependencies:id,title,status',
            'dependents:id,title,status',
            'labels',
            'subtasks',
        ])->findOrFail($id);

        return response()->json($task);
    }

    public function update(UpdateTaskRequest $request, $id)
    {
        $task = Task::findOrFail($id);

        // Authorization: admin, creator, or assignee
        $user = auth()->user();
        if ($user->role !== 'admin' && $task->created_by !== $user->id && !$task->assignees()->where('users.id', $user->id)->exists()) {
            return response()->json(['message' => 'You are not authorized to update this task'], 403);
        }

        $oldStatus = $task->status;
        $oldAssigneeIds = $task->assignees()->pluck('users.id')->toArray();

        $task->update($request->only([
            'title', 'description', 'status', 'priority',
            'start_date', 'end_date',
        ]));

        // Sync assignees if provided in request
        if ($request->has('assignees')) {
            $newAssigneeIds = $request->assignees ?? [];
            $task->assignees()->sync($newAssigneeIds);
        }

        // Sync labels if provided
        if ($request->has('labels')) {
            $task->labels()->sync($request->labels ?? []);
        }

        $task->load(['assignees:id,name,email,avatar,status,phone,department,location,profile_completed', 'creator:id,name,email,avatar', 'labels', 'subtasks']);

        $currentUserId = auth()->id();
        $currentUserName = auth()->user()->name;
        $currentAssigneeIds = $task->assignees->pluck('id')->toArray();

        // Activity log + notifications
        if ($oldStatus !== $task->status) {
            ActivityLog::create([
                'user_id' => $currentUserId,
                'task_id' => $task->id,
                'action' => 'status_changed',
                'description' => 'Changed status from "' . $oldStatus . '" to "' . $task->status . '"',
            ]);

            // Notify ALL involved users (assignees + creator) INCLUDING self
            $notifyUsers = collect($currentAssigneeIds)
                ->merge([$task->created_by])
                ->filter()
                ->unique();

            foreach ($notifyUsers as $uid) {
                $isSelf = $uid === $currentUserId;
                Notification::create([
                    'user_id' => $uid,
                    'task_id' => $task->id,
                    'title' => 'Status Changed',
                    'message' => ($isSelf ? 'You' : $currentUserName) . ' changed "' . $task->title . '" from ' . $oldStatus . ' to ' . $task->status,
                    'type' => 'task_status_changed',
                ]);
            }
        } else {
            ActivityLog::create([
                'user_id' => $currentUserId,
                'task_id' => $task->id,
                'action' => 'updated',
                'description' => 'Updated task "' . $task->title . '"',
            ]);

            // Notify ALL involved users INCLUDING self
            $notifyUsers = collect($currentAssigneeIds)
                ->merge([$task->created_by])
                ->filter()
                ->unique();

            foreach ($notifyUsers as $uid) {
                $isSelf = $uid === $currentUserId;
                Notification::create([
                    'user_id' => $uid,
                    'task_id' => $task->id,
                    'title' => 'Task Updated',
                    'message' => ($isSelf ? 'You' : $currentUserName) . ' updated "' . $task->title . '"',
                    'type' => 'task_updated',
                ]);
            }
        }

        // Notify newly added assignees
        if ($request->has('assignees')) {
            $addedAssignees = array_diff($currentAssigneeIds, $oldAssigneeIds);
            foreach ($addedAssignees as $assigneeId) {
                if ((int) $assigneeId !== $currentUserId) {
                    Notification::create([
                        'user_id' => $assigneeId,
                        'task_id' => $task->id,
                        'title' => 'Task Assigned',
                        'message' => $currentUserName . ' assigned you to "' . $task->title . '"',
                        'type' => 'task_assigned',
                    ]);
                }
            }
        }

        // Clear report caches
        $this->clearReportCaches();

        return response()->json($task);
    }

    public function destroy($id)
    {
        $task = Task::findOrFail($id);

        // Authorization: admin or creator
        $user = auth()->user();
        if ($user->role !== 'admin' && $task->created_by !== $user->id) {
            return response()->json(['message' => 'You are not authorized to delete this task'], 403);
        }

        $title = $task->title;
        $task->delete();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'task_id' => null,
            'action' => 'deleted',
            'description' => 'Deleted task "' . $title . '"',
        ]);

        // Clear report caches
        $this->clearReportCaches();

        return response()->json(['message' => 'Task deleted successfully']);
    }

    public function updateDependencies(Request $request, $id)
    {
        $task = Task::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'dependency_ids' => 'present|array',
            'dependency_ids.*' => 'integer|exists:tasks,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Prevent self-dependency
        $depIds = array_filter($request->dependency_ids, fn($depId) => (int) $depId !== $task->id);

        $task->dependencies()->sync($depIds);

        $task->load('dependencies:id,title,status', 'dependents:id,title,status');

        return response()->json($task);
    }

    public function archived(Request $request)
    {
        $tasks = Task::onlyTrashed()
            ->with(['assignees:id,name,email,avatar', 'creator:id,name,email,avatar'])
            ->orderBy('deleted_at', 'desc')
            ->get();

        return response()->json($tasks);
    }

    public function restore($id)
    {
        $task = Task::onlyTrashed()->findOrFail($id);
        $task->restore();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'task_id' => $task->id,
            'action' => 'restored',
            'description' => 'Restored task "' . $task->title . '" from archive',
        ]);

        return response()->json(['message' => 'Task restored successfully', 'task' => $task->load('assignees', 'creator')]);
    }

    public function forceDestroy($id)
    {
        $task = Task::onlyTrashed()->findOrFail($id);
        $title = $task->title;
        $task->forceDelete();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'task_id' => null,
            'action' => 'permanently_deleted',
            'description' => 'Permanently deleted task "' . $title . '"',
        ]);

        return response()->json(['message' => 'Task permanently deleted']);
    }

    public function duplicate($id)
    {
        $task = Task::with(['assignees', 'labels'])->findOrFail($id);

        // Shift existing tasks down
        Task::where('status', $task->status)->increment('position');

        $newTask = Task::create([
            'title' => $task->title . ' (Copy)',
            'description' => $task->description,
            'status' => $task->status,
            'priority' => $task->priority,
            'created_by' => auth()->id(),
            'start_date' => $task->start_date,
            'end_date' => $task->end_date,
            'position' => 0,
        ]);

        // Copy assignees and labels
        $newTask->assignees()->sync($task->assignees->pluck('id'));
        $newTask->labels()->sync($task->labels->pluck('id'));

        $newTask->load(['assignees:id,name,email,avatar,status,phone,department,location,profile_completed', 'creator:id,name,email,avatar', 'labels', 'subtasks']);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'task_id' => $newTask->id,
            'action' => 'duplicated',
            'description' => 'Duplicated task "' . $task->title . '"',
        ]);

        return response()->json($newTask, 201);
    }

    public function bulkUpdate(BulkTaskRequest $request)
    {
        $taskIds = $request->task_ids;
        $action = $request->action;
        $value = $request->value;
        $currentUserId = auth()->id();
        $count = 0;

        if ($action === 'delete') {
            $count = Task::whereIn('id', $taskIds)->count();
            Task::whereIn('id', $taskIds)->delete();

            ActivityLog::create([
                'user_id' => $currentUserId,
                'task_id' => null,
                'action' => 'bulk_deleted',
                'description' => "Bulk deleted {$count} tasks",
            ]);
        } elseif ($action === 'status') {
            $count = Task::whereIn('id', $taskIds)->update(['status' => $value]);

            ActivityLog::create([
                'user_id' => $currentUserId,
                'task_id' => null,
                'action' => 'bulk_status_changed',
                'description' => "Bulk changed {$count} tasks to status \"{$value}\"",
            ]);
        } elseif ($action === 'priority') {
            $count = Task::whereIn('id', $taskIds)->update(['priority' => $value]);

            ActivityLog::create([
                'user_id' => $currentUserId,
                'task_id' => null,
                'action' => 'bulk_priority_changed',
                'description' => "Bulk changed {$count} tasks to priority \"{$value}\"",
            ]);
        } elseif ($action === 'assignee' && $request->assignee_ids) {
            $tasks = Task::whereIn('id', $taskIds)->get();
            foreach ($tasks as $task) {
                $task->assignees()->sync($request->assignee_ids);
            }
            $count = $tasks->count();

            ActivityLog::create([
                'user_id' => $currentUserId,
                'task_id' => null,
                'action' => 'bulk_reassigned',
                'description' => "Bulk reassigned {$count} tasks",
            ]);
        }

        return response()->json(['message' => "Bulk action applied to {$count} tasks", 'affected' => $count]);
    }

    public function reorder(ReorderTaskRequest $request)
    {
        foreach ($request->tasks as $taskData) {
            Task::where('id', $taskData['id'])->update([
                'status' => $taskData['status'],
                'position' => $taskData['position'],
            ]);
        }

        return response()->json(['message' => 'Tasks reordered successfully']);
    }

    /**
     * Clear all report-related caches when tasks are created, updated, or deleted.
     */
    private function clearReportCaches(): void
    {
        // Clear stats cache for all users
        $userIds = User::pluck('id');
        foreach ($userIds as $userId) {
            Cache::forget('report_stats_' . $userId);
        }

        // Clear team workload cache
        Cache::forget('team_workload');

        // Clear completion trends caches for common day ranges
        foreach ([7, 14, 30, 60, 90] as $days) {
            Cache::forget('completion_trends_' . $days);
        }
    }
}
