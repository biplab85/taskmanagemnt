<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Leave;
use App\Models\LeaveBalance;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeaveReportController extends Controller
{
    /**
     * Summary stats for leave dashboard.
     */
    public function stats(Request $request): JsonResponse
    {
        $year = $request->input('year', now()->year);
        $user = auth()->user();

        $query = Leave::whereYear('start_date', $year);
        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        $byStatus = $query->select('status', DB::raw('count(*) as count'), DB::raw('sum(total_days) as total_days'))
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $totalLeaves = $query->count();

        return response()->json([
            'total_requests' => $totalLeaves,
            'pending' => $byStatus->get('pending')?->count ?? 0,
            'approved' => $byStatus->get('approved')?->count ?? 0,
            'rejected' => $byStatus->get('rejected')?->count ?? 0,
            'cancelled' => $byStatus->get('cancelled')?->count ?? 0,
            'approved_days' => (float) ($byStatus->get('approved')?->total_days ?? 0),
            'year' => (int) $year,
        ]);
    }

    /**
     * User-wise leave summary report.
     */
    public function userReport(Request $request): JsonResponse
    {
        $year = $request->input('year', now()->year);

        $users = User::select('id', 'name', 'email', 'avatar', 'department')
            ->with(['leaveBalances' => function ($q) use ($year) {
                $q->where('year', $year)->with('leaveType:id,name');
            }])
            ->get()
            ->map(function ($user) use ($year) {
                $totalApproved = Leave::where('user_id', $user->id)
                    ->whereYear('start_date', $year)
                    ->where('status', 'approved')
                    ->sum('total_days');

                $pending = Leave::where('user_id', $user->id)
                    ->whereYear('start_date', $year)
                    ->where('status', 'pending')
                    ->count();

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'department' => $user->department,
                    'total_approved_days' => (float) $totalApproved,
                    'pending_requests' => $pending,
                    'balances' => $user->leaveBalances->map(fn ($b) => [
                        'leave_type' => $b->leaveType->name,
                        'total' => (float) $b->total_days,
                        'used' => (float) $b->used_days,
                        'remaining' => $b->remaining_days,
                    ]),
                ];
            });

        return response()->json($users);
    }

    /**
     * Department-wise leave summary.
     */
    public function departmentReport(Request $request): JsonResponse
    {
        $year = $request->input('year', now()->year);

        $report = Leave::join('users', 'leaves.user_id', '=', 'users.id')
            ->whereYear('leaves.start_date', $year)
            ->where('leaves.status', 'approved')
            ->select(
                DB::raw('COALESCE(users.department, \'Unassigned\') as department'),
                DB::raw('count(*) as total_leaves'),
                DB::raw('sum(leaves.total_days) as total_days'),
                DB::raw('count(distinct leaves.user_id) as unique_users')
            )
            ->groupBy('department')
            ->orderByDesc('total_days')
            ->get();

        return response()->json($report);
    }

    /**
     * Export leaves as CSV.
     */
    public function exportCsv(Request $request)
    {
        $year = $request->input('year', now()->year);

        $leaves = Leave::with(['user:id,name,department', 'leaveType:id,name'])
            ->whereYear('start_date', $year)
            ->orderByDesc('created_at')
            ->get();

        $headers = ['ID', 'Employee', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Applied On'];
        $rows = $leaves->map(fn ($l) => [
            $l->id,
            $l->user?->name ?? 'N/A',
            $l->user?->department ?? 'N/A',
            $l->leaveType?->name ?? 'N/A',
            $l->start_date->toDateString(),
            $l->end_date->toDateString(),
            $l->total_days,
            ucfirst($l->status),
            $l->created_at->toDateString(),
        ]);

        $callback = function () use ($headers, $rows) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);
            foreach ($rows as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"leaves-{$year}.csv\"",
        ]);
    }
}
