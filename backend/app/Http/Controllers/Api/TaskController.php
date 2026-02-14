<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\ActivityLog;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();

        $query = Task::with(['assignees:id,name,email,avatar,status,phone,department,location,profile_completed', 'creator:id,name,email,avatar']);

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

        $tasks = $query->orderBy('position')->orderBy('created_at', 'desc')->get();

        return response()->json($tasks);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:backlog,todo,in_progress,review,complete',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'assignees' => 'nullable|array',
            'assignees.*' => 'exists:users,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

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

        $task->load(['assignees:id,name,email,avatar,status,phone,department,location,profile_completed', 'creator:id,name,email,avatar']);

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

        return response()->json($task, 201);
    }

    public function show($id)
    {
        $task = Task::with([
            'assignees:id,name,email,avatar,status,phone,department,location,profile_completed',
            'creator:id,name,email,avatar',
            'comments.user:id,name,email,avatar',
            'attachments.user:id,name,email',
        ])->findOrFail($id);

        return response()->json($task);
    }

    public function update(Request $request, $id)
    {
        $task = Task::findOrFail($id);
        $oldStatus = $task->status;
        $oldAssigneeIds = $task->assignees()->pluck('users.id')->toArray();

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:backlog,todo,in_progress,review,complete',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'assignees' => 'sometimes|nullable|array',
            'assignees.*' => 'exists:users,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $task->update($request->only([
            'title', 'description', 'status', 'priority',
            'start_date', 'end_date',
        ]));

        // Sync assignees if provided in request
        if ($request->has('assignees')) {
            $newAssigneeIds = $request->assignees ?? [];
            $task->assignees()->sync($newAssigneeIds);
        }

        $task->load(['assignees:id,name,email,avatar,status,phone,department,location,profile_completed', 'creator:id,name,email,avatar']);

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

        return response()->json($task);
    }

    public function destroy($id)
    {
        $task = Task::findOrFail($id);
        $title = $task->title;
        $task->delete();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'task_id' => null,
            'action' => 'deleted',
            'description' => 'Deleted task "' . $title . '"',
        ]);

        return response()->json(['message' => 'Task deleted successfully']);
    }

    public function reorder(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tasks' => 'required|array',
            'tasks.*.id' => 'required|exists:tasks,id',
            'tasks.*.status' => 'required|in:backlog,todo,in_progress,review,complete',
            'tasks.*.position' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        foreach ($request->tasks as $taskData) {
            Task::where('id', $taskData['id'])->update([
                'status' => $taskData['status'],
                'position' => $taskData['position'],
            ]);
        }

        return response()->json(['message' => 'Tasks reordered successfully']);
    }
}
