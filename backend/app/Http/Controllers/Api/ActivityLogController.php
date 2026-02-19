<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;

class ActivityLogController extends Controller
{
    public function index(\Illuminate\Http\Request $request)
    {
        $query = ActivityLog::with(['user:id,name,email,avatar', 'task:id,title'])
            ->orderBy('created_at', 'desc');

        if ($request->has('per_page')) {
            $perPage = min((int) $request->per_page, 50);
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->limit(100)->get());
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
