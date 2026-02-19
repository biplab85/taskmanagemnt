<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommentRequest;
use App\Models\Comment;
use App\Models\CommentReaction;
use App\Models\Notification;
use App\Models\ActivityLog;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CommentController extends Controller
{
    public function store(StoreCommentRequest $request, $taskId)
    {
        $task = Task::findOrFail($taskId);

        $comment = Comment::create([
            'task_id' => $task->id,
            'user_id' => auth()->id(),
            'body' => $request->body,
        ]);

        $comment->load('user:id,name,email,avatar');

        // Notify ALL involved users (assignees + creator) INCLUDING self
        $currentUserId = auth()->id();
        $currentUserName = auth()->user()->name;
        $notifyUsers = $task->assignees->pluck('id')
            ->merge([$task->created_by])
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

        // Parse @mentions and notify mentioned users
        $this->processMentions($request->body, $task, $currentUserId, $currentUserName, $notifyUsers->toArray());

        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'task_id' => $task->id,
            'action' => 'commented',
            'description' => 'Added a comment on "' . $task->title . '"',
        ]);

        return response()->json($comment, 201);
    }

    public function update(Request $request, $id)
    {
        $comment = Comment::where('user_id', auth()->id())->findOrFail($id);

        // Allow editing within 15 minutes
        if ($comment->created_at->diffInMinutes(now()) > 15) {
            return response()->json(['message' => 'Comments can only be edited within 15 minutes'], 403);
        }

        $validator = Validator::make($request->all(), [
            'body' => 'required|string|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $comment->update([
            'body' => $request->body,
            'edited_at' => now(),
        ]);

        $comment->load('user:id,name,email,avatar', 'reactions.user:id,name');

        return response()->json($comment);
    }

    public function destroy($id)
    {
        $comment = Comment::where('user_id', auth()->id())->findOrFail($id);
        $comment->delete();

        return response()->json(['message' => 'Comment deleted']);
    }

    /**
     * Parse @mentions in comment body and notify mentioned users.
     * Skips users who were already notified via the comment notification.
     */
    protected function processMentions(string $body, Task $task, int $currentUserId, string $currentUserName, array $alreadyNotifiedUserIds): void
    {
        // Match @username patterns (alphanumeric, dots, hyphens, underscores, spaces between words)
        preg_match_all('/@([\w][\w.\- ]*[\w])/', $body, $matches);

        if (empty($matches[1])) {
            return;
        }

        $mentionedNames = array_unique($matches[1]);

        foreach ($mentionedNames as $name) {
            $user = User::where('name', $name)->first();

            if (!$user) {
                continue;
            }

            // Don't duplicate notifications for users already getting comment notifications
            if (in_array($user->id, $alreadyNotifiedUserIds)) {
                continue;
            }

            Notification::create([
                'user_id' => $user->id,
                'task_id' => $task->id,
                'title' => 'You were mentioned',
                'message' => '@' . $currentUserName . ' mentioned you in a comment on "' . $task->title . '"',
                'type' => 'mention',
            ]);
        }
    }

    public function toggleReaction(Request $request, $id)
    {
        $comment = Comment::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'emoji' => 'required|string|max:10',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $existing = CommentReaction::where('comment_id', $id)
            ->where('user_id', auth()->id())
            ->where('emoji', $request->emoji)
            ->first();

        if ($existing) {
            $existing->delete();
            $action = 'removed';
        } else {
            CommentReaction::create([
                'comment_id' => $id,
                'user_id' => auth()->id(),
                'emoji' => $request->emoji,
            ]);
            $action = 'added';
        }

        // Return updated reactions
        $reactions = CommentReaction::where('comment_id', $id)
            ->with('user:id,name')
            ->get();

        return response()->json(['action' => $action, 'reactions' => $reactions]);
    }
}
