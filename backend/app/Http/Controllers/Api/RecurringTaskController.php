<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RecurringTask;
use App\Models\Task;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class RecurringTaskController extends Controller
{
    public function index()
    {
        $recurringTasks = RecurringTask::with('creator:id,name,email,avatar')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($recurringTasks);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:todo,backlog,in_progress',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'frequency' => 'required|string|in:daily,weekly,monthly',
            'day_of_week' => 'nullable|integer|min:0|max:6',
            'day_of_month' => 'nullable|integer|min:1|max:31',
            'time_of_day' => 'nullable|date_format:H:i',
            'is_active' => 'nullable|boolean',
            'assignee_ids' => 'nullable|array',
            'assignee_ids.*' => 'integer|exists:users,id',
            'label_ids' => 'nullable|array',
            'label_ids.*' => 'integer|exists:labels,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only([
            'title', 'description', 'status', 'priority',
            'frequency', 'day_of_week', 'day_of_month', 'time_of_day',
            'is_active', 'assignee_ids', 'label_ids',
        ]);
        $data['created_by'] = auth()->id();
        $data['next_run'] = $this->calculateNextRun($request);

        $recurringTask = RecurringTask::create($data);
        $recurringTask->load('creator:id,name,email,avatar');

        return response()->json($recurringTask, 201);
    }

    public function update(Request $request, $id)
    {
        $recurringTask = RecurringTask::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:todo,backlog,in_progress',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'frequency' => 'sometimes|required|string|in:daily,weekly,monthly',
            'day_of_week' => 'nullable|integer|min:0|max:6',
            'day_of_month' => 'nullable|integer|min:1|max:31',
            'time_of_day' => 'nullable|date_format:H:i',
            'is_active' => 'nullable|boolean',
            'assignee_ids' => 'nullable|array',
            'assignee_ids.*' => 'integer|exists:users,id',
            'label_ids' => 'nullable|array',
            'label_ids.*' => 'integer|exists:labels,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only([
            'title', 'description', 'status', 'priority',
            'frequency', 'day_of_week', 'day_of_month', 'time_of_day',
            'is_active', 'assignee_ids', 'label_ids',
        ]);

        // Recalculate next_run if frequency-related fields changed
        if ($request->hasAny(['frequency', 'day_of_week', 'day_of_month'])) {
            $data['next_run'] = $this->calculateNextRun($request, $recurringTask);
        }

        $recurringTask->update($data);
        $recurringTask->load('creator:id,name,email,avatar');

        return response()->json($recurringTask);
    }

    public function destroy($id)
    {
        $recurringTask = RecurringTask::findOrFail($id);
        $recurringTask->delete();

        return response()->json(['message' => 'Recurring task deleted successfully']);
    }

    /**
     * Manually trigger task generation from a recurring task template.
     */
    public function generate($id)
    {
        $recurringTask = RecurringTask::findOrFail($id);

        // Shift existing tasks down to make room at position 0
        $targetStatus = $recurringTask->status ?? 'todo';
        Task::where('status', $targetStatus)->increment('position');

        $task = Task::create([
            'title' => $recurringTask->title,
            'description' => $recurringTask->description,
            'status' => $targetStatus,
            'priority' => $recurringTask->priority ?? 'medium',
            'created_by' => auth()->id(),
            'position' => 0,
        ]);

        // Sync assignees from the recurring task template
        if (!empty($recurringTask->assignee_ids)) {
            $task->assignees()->sync($recurringTask->assignee_ids);
        }

        // Sync labels from the recurring task template
        if (!empty($recurringTask->label_ids)) {
            $task->labels()->sync($recurringTask->label_ids);
        }

        // Update next_run
        $recurringTask->update([
            'next_run' => $this->calculateNextRun(new Request($recurringTask->toArray()), $recurringTask),
        ]);

        $task->load([
            'assignees:id,name,email,avatar,status,phone,department,location,profile_completed',
            'creator:id,name,email,avatar',
            'labels',
            'subtasks',
        ]);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'task_id' => $task->id,
            'action' => 'created',
            'description' => 'Generated task "' . $task->title . '" from recurring template',
        ]);

        return response()->json($task, 201);
    }

    /**
     * Calculate the next run date based on frequency settings.
     */
    private function calculateNextRun(Request $request, ?RecurringTask $existing = null): string
    {
        $frequency = $request->input('frequency', $existing?->frequency ?? 'daily');
        $now = Carbon::now();

        switch ($frequency) {
            case 'daily':
                return $now->addDay()->toDateString();

            case 'weekly':
                $dayOfWeek = $request->input('day_of_week', $existing?->day_of_week ?? 1);
                $next = $now->copy()->next((int) $dayOfWeek);
                return $next->toDateString();

            case 'monthly':
                $dayOfMonth = $request->input('day_of_month', $existing?->day_of_month ?? 1);
                $next = $now->copy()->addMonth()->day(min($dayOfMonth, $now->copy()->addMonth()->daysInMonth));
                return $next->toDateString();

            default:
                return $now->addDay()->toDateString();
        }
    }
}
