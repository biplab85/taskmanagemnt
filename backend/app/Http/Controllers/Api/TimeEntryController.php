<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTimeEntryRequest;
use App\Models\TimeEntry;
use App\Models\Task;
use Illuminate\Http\Request;
use Carbon\Carbon;

class TimeEntryController extends Controller
{
    /**
     * List time entries for a specific task.
     */
    public function index($taskId)
    {
        $task = Task::findOrFail($taskId);

        $entries = TimeEntry::where('task_id', $task->id)
            ->with('user:id,name,email,avatar')
            ->orderBy('started_at', 'desc')
            ->get();

        return response()->json($entries);
    }

    /**
     * Start a timer for a task (create entry with started_at = now).
     */
    public function start(Request $request, $taskId)
    {
        $task = Task::findOrFail($taskId);
        $userId = auth()->id();

        // Check if user already has an active timer
        $activeTimer = TimeEntry::where('user_id', $userId)
            ->whereNull('stopped_at')
            ->first();

        if ($activeTimer) {
            return response()->json([
                'message' => 'You already have an active timer. Stop it first before starting a new one.',
                'active_entry' => $activeTimer,
            ], 422);
        }

        $entry = TimeEntry::create([
            'task_id' => $task->id,
            'user_id' => $userId,
            'description' => $request->input('description'),
            'started_at' => now(),
        ]);

        $entry->load('user:id,name,email,avatar');

        return response()->json($entry, 201);
    }

    /**
     * Stop a running timer.
     */
    public function stop($id)
    {
        $entry = TimeEntry::findOrFail($id);

        // Only the owner can stop their timer
        if ($entry->user_id !== auth()->id()) {
            return response()->json(['message' => 'You can only stop your own timer'], 403);
        }

        if ($entry->stopped_at) {
            return response()->json(['message' => 'This timer is already stopped'], 422);
        }

        $stoppedAt = now();
        $durationMinutes = (int) Carbon::parse($entry->started_at)->diffInMinutes($stoppedAt);

        $entry->update([
            'stopped_at' => $stoppedAt,
            'duration_minutes' => $durationMinutes,
        ]);

        $entry->load('user:id,name,email,avatar');

        return response()->json($entry);
    }

    /**
     * Create a manual time entry (with both start and stop times).
     */
    public function store(StoreTimeEntryRequest $request, $taskId)
    {
        $task = Task::findOrFail($taskId);

        $startedAt = Carbon::parse($request->started_at);
        $stoppedAt = Carbon::parse($request->stopped_at);
        $durationMinutes = (int) $startedAt->diffInMinutes($stoppedAt);

        $entry = TimeEntry::create([
            'task_id' => $task->id,
            'user_id' => auth()->id(),
            'description' => $request->input('description'),
            'started_at' => $startedAt,
            'stopped_at' => $stoppedAt,
            'duration_minutes' => $durationMinutes,
        ]);

        $entry->load('user:id,name,email,avatar');

        return response()->json($entry, 201);
    }

    /**
     * Delete a time entry.
     */
    public function destroy($id)
    {
        $entry = TimeEntry::findOrFail($id);

        // Only owner or admin can delete
        $user = auth()->user();
        if ($entry->user_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['message' => 'You are not authorized to delete this time entry'], 403);
        }

        $entry->delete();

        return response()->json(['message' => 'Time entry deleted successfully']);
    }

    /**
     * Get current user's active timer (no stopped_at).
     */
    public function myActive()
    {
        $entry = TimeEntry::where('user_id', auth()->id())
            ->whereNull('stopped_at')
            ->with(['user:id,name,email,avatar', 'task:id,title,status'])
            ->first();

        return response()->json($entry);
    }
}
