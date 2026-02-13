<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;

class ActivityLogController extends Controller
{
    public function index()
    {
        $logs = ActivityLog::with(['user:id,name,email,avatar', 'task:id,title'])
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return response()->json($logs);
    }

    public function forTask($taskId)
    {
        $logs = ActivityLog::with(['user:id,name,email,avatar'])
            ->where('task_id', $taskId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($logs);
    }
}
