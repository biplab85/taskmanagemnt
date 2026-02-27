<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $query = Notification::with('task:id,title,status')
            ->where('user_id', auth()->id());

        if ($request->has('filter') && $request->filter === 'unread') {
            $query->where('is_read', false);
        } elseif ($request->has('filter') && $request->filter === 'read') {
            $query->where('is_read', true);
        }

        if ($request->has('type') && $request->type) {
            $query->where('type', $request->type);
        }

        $query->orderBy('created_at', 'desc');

        if ($request->has('per_page')) {
            $perPage = min((int) $request->per_page, 50);
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->limit(100)->get());
    }

    public function unreadCount()
    {
        $count = Notification::where('user_id', auth()->id())
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    public function markAsRead($id)
    {
        $notification = Notification::where('user_id', auth()->id())->findOrFail($id);
        $notification->update(['is_read' => true]);

        return response()->json($notification);
    }

    public function markAsUnread($id)
    {
        $notification = Notification::where('user_id', auth()->id())->findOrFail($id);
        $notification->update(['is_read' => false]);

        return response()->json($notification);
    }

    public function markAllAsRead()
    {
        Notification::where('user_id', auth()->id())
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    public function destroy($id)
    {
        $notification = Notification::where('user_id', auth()->id())->findOrFail($id);
        $notification->delete();

        return response()->json(['message' => 'Notification deleted']);
    }

    public function destroyAll()
    {
        Notification::where('user_id', auth()->id())
            ->where('is_read', true)
            ->delete();

        return response()->json(['message' => 'All read notifications cleared']);
    }

    public function trash()
    {
        $notifications = Notification::onlyTrashed()
            ->with('task:id,title,status')
            ->where('user_id', auth()->id())
            ->orderBy('deleted_at', 'desc')
            ->limit(100)
            ->get();

        return response()->json($notifications);
    }

    public function restore($id)
    {
        $notification = Notification::onlyTrashed()
            ->where('user_id', auth()->id())
            ->findOrFail($id);
        $notification->restore();

        return response()->json($notification);
    }

    public function forceDestroy($id)
    {
        $notification = Notification::onlyTrashed()
            ->where('user_id', auth()->id())
            ->findOrFail($id);
        $notification->forceDelete();

        return response()->json(['message' => 'Notification permanently deleted']);
    }

    public function bulkMarkRead(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);

        Notification::where('user_id', auth()->id())
            ->whereIn('id', $request->ids)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'Marked as read']);
    }

    public function bulkMarkUnread(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);

        Notification::where('user_id', auth()->id())
            ->whereIn('id', $request->ids)
            ->update(['is_read' => false]);

        return response()->json(['message' => 'Marked as unread']);
    }

    public function bulkDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);

        Notification::where('user_id', auth()->id())
            ->whereIn('id', $request->ids)
            ->delete();

        return response()->json(['message' => 'Notifications deleted']);
    }
}
