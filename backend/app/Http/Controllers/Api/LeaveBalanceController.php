<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveBalanceController extends Controller
{
    /**
     * Get balances for a user (or current user).
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $userId = $request->input('user_id', $user->id);
        $year = $request->input('year', now()->year);

        // Non-admin can only see own balance
        if (!$user->isAdmin() && $userId != $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $balances = LeaveBalance::with('leaveType:id,name,slug,max_days,is_paid')
            ->where('user_id', $userId)
            ->where('year', $year)
            ->get()
            ->map(function ($balance) {
                $balance->remaining_days = $balance->remaining_days;
                return $balance;
            });

        return response()->json($balances);
    }

    /**
     * Admin: Set or update leave balance for a user.
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'leave_type_id' => 'required|exists:leave_types,id',
            'year' => 'required|integer|min:2020|max:2099',
            'total_days' => 'required|numeric|min:0|max:365',
            'carried_forward' => 'nullable|numeric|min:0|max:365',
        ]);

        $balance = LeaveBalance::updateOrCreate(
            [
                'user_id' => $data['user_id'],
                'leave_type_id' => $data['leave_type_id'],
                'year' => $data['year'],
            ],
            [
                'total_days' => $data['total_days'],
                'carried_forward' => $data['carried_forward'] ?? 0,
            ]
        );

        $balance->load('leaveType:id,name,slug,max_days,is_paid');
        $balance->remaining_days = $balance->remaining_days;

        return response()->json($balance);
    }

    /**
     * Admin: Initialize balances for all users for a given year from leave type defaults.
     */
    public function initializeYear(Request $request): JsonResponse
    {
        $year = $request->input('year', now()->year);
        $users = User::all();
        $leaveTypes = LeaveType::where('is_active', true)->get();

        $created = 0;
        foreach ($users as $user) {
            foreach ($leaveTypes as $type) {
                $exists = LeaveBalance::where('user_id', $user->id)
                    ->where('leave_type_id', $type->id)
                    ->where('year', $year)
                    ->exists();

                if (!$exists) {
                    // Check carry forward from previous year
                    $carriedForward = 0;
                    if ($type->carry_forward) {
                        $prevBalance = LeaveBalance::where('user_id', $user->id)
                            ->where('leave_type_id', $type->id)
                            ->where('year', $year - 1)
                            ->first();
                        if ($prevBalance) {
                            $carriedForward = max(0, (float) $prevBalance->total_days + (float) $prevBalance->carried_forward - (float) $prevBalance->used_days);
                        }
                    }

                    LeaveBalance::create([
                        'user_id' => $user->id,
                        'leave_type_id' => $type->id,
                        'year' => $year,
                        'total_days' => $type->max_days,
                        'used_days' => 0,
                        'carried_forward' => $carriedForward,
                    ]);
                    $created++;
                }
            }
        }

        return response()->json(['message' => "Initialized {$created} balances for {$year}"]);
    }
}
