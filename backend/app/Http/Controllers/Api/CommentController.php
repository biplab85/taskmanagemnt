<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Notification;
use App\Models\ActivityLog;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CommentController extends Controller
{
    public function store(Request $request, $taskId)
    {
        $task = Task::findOrFail($taskId);

        $validator = Validator::make($request->all(), [
            'body' => 'required|string|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $comment = Comment::create([
            'task_id' => $task->id,
            'user_id' => auth()->id(),
            'body' => $request->body,
        ]);

        $comment->load('user:id,name,email,avatar');

        // Notify ALL involved users (assignee + creator) INCLUDING self
        $currentUserId = auth()->id();
        $currentUserName = auth()->user()->name;
        $notifyUsers = collect([$task->assigned_to, $task->created_by])
            ->filter()
            ->unique();

        foreach ($notifyUsers as $uid) {
            $isSelf = $uid === $currentUserId;
            Notification::create([
                'user_id' => $uid,
                'task_id' => $task->id,
                'title' => 'New Comment',
                'message' => ($isSelf ? 'You' : $currentUserName) . ' commented on "' . $task->title . '"',
                'type' => 'comment',
            ]);
        }

        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'task_id' => $task->id,
            'action' => 'commented',
            'description' => 'Added a comment on "' . $task->title . '"',
        ]);

        return response()->json($comment, 201);
    }

    public function destroy($id)
    {
        $comment = Comment::where('user_id', auth()->id())->findOrFail($id);
        $comment->delete();

        return response()->json(['message' => 'Comment deleted']);
    }
}
