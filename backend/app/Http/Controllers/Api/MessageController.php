<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MessageController extends Controller
{
    public function inbox()
    {
        $messages = Message::inboxFor(auth()->id())
            ->with(['sender:id,name,email,avatar,status', 'recipient:id,name,email,avatar,status'])
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return response()->json($messages);
    }

    public function sent()
    {
        $messages = Message::sentBy(auth()->id())
            ->with(['sender:id,name,email,avatar,status', 'recipient:id,name,email,avatar,status'])
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return response()->json($messages);
    }

    public function trash()
    {
        $messages = Message::trashFor(auth()->id())
            ->with(['sender:id,name,email,avatar,status', 'recipient:id,name,email,avatar,status'])
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return response()->json($messages);
    }

    public function unreadCount()
    {
        $count = Message::inboxFor(auth()->id())
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'recipient_id' => 'required|exists:users,id',
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'attachment' => 'nullable|file|max:10240',
        ]);

        $data = [
            'sender_id' => auth()->id(),
            'recipient_id' => $request->recipient_id,
            'subject' => $request->subject,
            'body' => $request->body,
        ];

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $path = $file->store('messages/' . auth()->id(), 'public');
            $data['attachment_path'] = $path;
            $data['attachment_name'] = $file->getClientOriginalName();
        }

        $message = Message::create($data);
        $message->load(['sender:id,name,email,avatar,status', 'recipient:id,name,email,avatar,status']);

        return response()->json($message, 201);
    }

    public function show($id)
    {
        $userId = auth()->id();
        $message = Message::where(function ($q) use ($userId) {
            $q->where('recipient_id', $userId)->orWhere('sender_id', $userId);
        })->with(['sender:id,name,email,avatar,status', 'recipient:id,name,email,avatar,status'])
          ->findOrFail($id);

        // Auto-mark as read if recipient
        if ($message->recipient_id === $userId && !$message->is_read) {
            $message->update(['is_read' => true]);
        }

        return response()->json($message);
    }

    public function markAsRead($id)
    {
        $message = Message::where('recipient_id', auth()->id())->findOrFail($id);
        $message->update(['is_read' => true]);

        return response()->json($message);
    }

    public function markAsUnread($id)
    {
        $message = Message::where('recipient_id', auth()->id())->findOrFail($id);
        $message->update(['is_read' => false]);

        return response()->json($message);
    }

    public function destroy($id)
    {
        $userId = auth()->id();
        $message = Message::where(function ($q) use ($userId) {
            $q->where('recipient_id', $userId)->orWhere('sender_id', $userId);
        })->findOrFail($id);

        if ($message->sender_id === $userId) {
            $message->update(['deleted_by_sender' => true]);
        }
        if ($message->recipient_id === $userId) {
            $message->update(['deleted_by_recipient' => true]);
        }

        return response()->json(['message' => 'Message moved to trash']);
    }

    public function restore($id)
    {
        $userId = auth()->id();
        $message = Message::trashFor($userId)->findOrFail($id);

        if ($message->sender_id === $userId) {
            $message->update(['deleted_by_sender' => false]);
        }
        if ($message->recipient_id === $userId) {
            $message->update(['deleted_by_recipient' => false]);
        }

        return response()->json($message);
    }

    public function forceDestroy($id)
    {
        $userId = auth()->id();
        $message = Message::trashFor($userId)->findOrFail($id);

        // Delete attachment if exists
        if ($message->attachment_path) {
            Storage::disk('public')->delete($message->attachment_path);
        }

        $message->delete();

        return response()->json(['message' => 'Message permanently deleted']);
    }

    public function bulkMarkRead(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);

        Message::where('recipient_id', auth()->id())
            ->whereIn('id', $request->ids)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'Marked as read']);
    }

    public function bulkMarkUnread(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);

        Message::where('recipient_id', auth()->id())
            ->whereIn('id', $request->ids)
            ->update(['is_read' => false]);

        return response()->json(['message' => 'Marked as unread']);
    }

    public function bulkDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        $userId = auth()->id();

        // Set deleted flags for messages where user is sender or recipient
        Message::whereIn('id', $request->ids)
            ->where('sender_id', $userId)
            ->update(['deleted_by_sender' => true]);

        Message::whereIn('id', $request->ids)
            ->where('recipient_id', $userId)
            ->update(['deleted_by_recipient' => true]);

        return response()->json(['message' => 'Messages deleted']);
    }
}
