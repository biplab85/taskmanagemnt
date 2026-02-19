<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;

class TaskWatcherController extends Controller
{
    /**
     * Toggle watch/unwatch a task for the current user.
     */
    public function toggle(Request $request, $taskId)
    {
        $task = Task::findOrFail($taskId);
        $userId = auth()->id();

        $exists = $task->watchers()->where('user_id', $userId)->exists();

        if ($exists) {
            $task->watchers()->detach($userId);
            return response()->json([
                'message' => 'Unwatched task successfully',
                'watching' => false,
            ]);
        }

        $task->watchers()->attach($userId);
        return response()->json([
            'message' => 'Watching task successfully',
            'watching' => true,
        ]);
    }

    /**
     * List all watchers for a task.
     */
    public function watchers($taskId)
    {
        $task = Task::findOrFail($taskId);

        $watchers = $task->watchers()
            ->select('users.id', 'users.name', 'users.email', 'users.avatar')
            ->get();

        return response()->json($watchers);
    }
}
