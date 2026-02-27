<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLeaveRequest;
use App\Models\Holiday;
use App\Models\Leave;
use App\Models\LeaveBalance;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    /**
     * List leaves: admin sees all, user sees own.
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $query = Leave::with(['user:id,name,email,avatar,department', 'leaveType:id,name,slug', 'approver:id,name']);

        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        // Filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('leave_type_id')) {
            $query->where('leave_type_id', $request->leave_type_id);
        }
        if ($request->filled('date_from')) {
            $query->where('start_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('end_date', '<=', $request->date_to);
        }

        $leaves = $query->orderByDesc('created_at')->get();
        return response()->json($leaves);
    }

    /**
     * Apply for leave.
     */
    public function store(StoreLeaveRequest $request): JsonResponse
    {
        $user = auth()->user();
        $data = $request->validated();

        // Calculate total days (excluding weekends and holidays)
        $totalDays = $this->calculateLeaveDays(
            $data['start_date'],
            $data['end_date'],
            $data['is_half_day'] ?? false
        );

        if ($totalDays <= 0) {
            return response()->json(['message' => 'No working days in selected range'], 422);
        }

        // Check balance
        $year = Carbon::parse($data['start_date'])->year;
        $balance = LeaveBalance::where('user_id', $user->id)
            ->where('leave_type_id', $data['leave_type_id'])
            ->where('year', $year)
            ->first();

        if ($balance) {
            $remaining = (float) $balance->total_days + (float) $balance->carried_forward - (float) $balance->used_days;
            if ($totalDays > $remaining) {
                return response()->json(['message' => 'Insufficient leave balance. Remaining: ' . $remaining . ' days'], 422);
            }
        }

        // Check for overlapping leave
        $overlap = Leave::where('user_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($q) use ($data) {
                $q->whereBetween('start_date', [$data['start_date'], $data['end_date']])
                  ->orWhereBetween('end_date', [$data['start_date'], $data['end_date']])
                  ->orWhere(function ($q2) use ($data) {
                      $q2->where('start_date', '<=', $data['start_date'])
                         ->where('end_date', '>=', $data['end_date']);
                  });
            })
            ->exists();

        if ($overlap) {
            return response()->json(['message' => 'You already have a leave request for overlapping dates'], 422);
        }

        // Handle attachment
        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('leave-attachments', 'public');
        }

        $leave = Leave::create([
            'user_id' => $user->id,
            'leave_type_id' => $data['leave_type_id'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'total_days' => $totalDays,
            'is_half_day' => $data['is_half_day'] ?? false,
            'half_day_period' => $data['half_day_period'] ?? null,
            'reason' => $data['reason'],
            'status' => 'pending',
            'attachment' => $attachmentPath,
        ]);

        $leave->load(['user:id,name,email,avatar,department', 'leaveType:id,name,slug']);

        // Notify admins
        $admins = User::where('role', 'admin')->pluck('id');
        foreach ($admins as $adminId) {
            Notification::create([
                'user_id' => $adminId,
                'title' => 'New Leave Request',
                'message' => "{$user->name} applied for {$leave->leaveType->name} ({$totalDays} days)",
                'type' => 'leave_request',
            ]);
        }

        return response()->json($leave, 201);
    }

    /**
     * Admin approve/reject a leave.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $leave = Leave::with(['user', 'leaveType'])->findOrFail($id);

        $data = $request->validate([
            'status' => 'required|in:approved,rejected',
            'admin_comment' => 'nullable|string|max:1000',
        ]);

        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Can only approve/reject pending leaves'], 422);
        }

        $leave->update([
            'status' => $data['status'],
            'admin_comment' => $data['admin_comment'] ?? null,
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        // Update balance if approved
        if ($data['status'] === 'approved') {
            $year = $leave->start_date->year;
            $balance = LeaveBalance::firstOrCreate(
                [
                    'user_id' => $leave->user_id,
                    'leave_type_id' => $leave->leave_type_id,
                    'year' => $year,
                ],
                ['total_days' => 0, 'used_days' => 0, 'carried_forward' => 0]
            );
            $balance->increment('used_days', (float) $leave->total_days);
        }

        // Notify user
        $statusLabel = ucfirst($data['status']);
        Notification::create([
            'user_id' => $leave->user_id,
            'title' => "Leave {$statusLabel}",
            'message' => "Your {$leave->leaveType->name} request has been {$data['status']}",
            'type' => 'leave_' . $data['status'],
        ]);

        $leave->load(['approver:id,name']);
        return response()->json($leave);
    }

    /**
     * User cancels own pending leave.
     */
    public function cancel(int $id): JsonResponse
    {
        $leave = Leave::findOrFail($id);
        $user = auth()->user();

        if ($leave->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Only pending leaves can be cancelled'], 422);
        }

        $leave->update(['status' => 'cancelled']);
        return response()->json(['message' => 'Leave cancelled']);
    }

    /**
     * Team leave calendar data.
     */
    public function calendar(Request $request): JsonResponse
    {
        $month = $request->input('month', now()->month);
        $year = $request->input('year', now()->year);

        $startOfMonth = Carbon::create($year, $month, 1)->startOfMonth();
        $endOfMonth = Carbon::create($year, $month, 1)->endOfMonth();

        $leaves = Leave::with(['user:id,name,avatar,department', 'leaveType:id,name,slug'])
            ->whereIn('status', ['approved', 'pending'])
            ->where(function ($q) use ($startOfMonth, $endOfMonth) {
                $q->whereBetween('start_date', [$startOfMonth, $endOfMonth])
                  ->orWhereBetween('end_date', [$startOfMonth, $endOfMonth])
                  ->orWhere(function ($q2) use ($startOfMonth, $endOfMonth) {
                      $q2->where('start_date', '<=', $startOfMonth)
                         ->where('end_date', '>=', $endOfMonth);
                  });
            })
            ->get();

        $holidays = Holiday::whereBetween('date', [$startOfMonth, $endOfMonth])
            ->orWhere(function ($q) use ($month) {
                $q->where('is_recurring', true)
                  ->whereMonth('date', $month);
            })
            ->get();

        return response()->json([
            'leaves' => $leaves,
            'holidays' => $holidays,
        ]);
    }

    /**
     * Leave conflict detection — users on leave for a given date.
     */
    public function conflicts(Request $request): JsonResponse
    {
        $date = $request->input('date', now()->toDateString());

        $leaves = Leave::with(['user:id,name,avatar,department', 'leaveType:id,name'])
            ->whereIn('status', ['approved', 'pending'])
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->get();

        return response()->json($leaves);
    }

    /**
     * Calculate working days between two dates (exclude weekends & holidays).
     */
    private function calculateLeaveDays(string $startDate, string $endDate, bool $isHalfDay): float
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        if ($isHalfDay) {
            return 0.5;
        }

        $holidays = Holiday::whereBetween('date', [$start, $end])
            ->pluck('date')
            ->map(fn ($d) => $d->toDateString())
            ->toArray();

        $days = 0;
        $current = $start->copy();
        while ($current->lte($end)) {
            if (!$current->isWeekend() && !in_array($current->toDateString(), $holidays)) {
                $days++;
            }
            $current->addDay();
        }

        return (float) $days;
    }
}
