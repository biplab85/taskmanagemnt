<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        $users = User::select('id', 'name', 'email', 'role', 'can_view_all_tasks', 'avatar', 'status', 'phone', 'department', 'location', 'profile_completed', 'created_at')
            ->with('activeLeave.leaveType')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($users);
    }

    public function store(StoreUserRequest $request)
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'role' => $request->role ?? 'user',
            'can_view_all_tasks' => $request->can_view_all_tasks ?? false,
        ]);

        return response()->json($user, 201);
    }

    public function show($id)
    {
        $user = User::with('activeLeave.leaveType')->findOrFail($id);

        return response()->json($user);
    }

    public function update(UpdateUserRequest $request, $id)
    {
        $user = User::findOrFail($id);

        $data = $request->only(['name', 'email', 'role', 'can_view_all_tasks']);

        if ($request->filled('password')) {
            $data['password'] = $request->password;
        }

        $user->update($data);

        return response()->json($user);
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Cannot delete your own account'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * Toggle user status between active and deactivated.
     */
    public function toggleActive($id)
    {
        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Cannot deactivate your own account'], 403);
        }

        if ($user->deactivated_at) {
            // Reactivate
            $user->update([
                'deactivated_at' => null,
                'status' => 'active',
            ]);

            return response()->json([
                'message' => 'User reactivated successfully',
                'user' => $user,
                'active' => true,
            ]);
        }

        // Deactivate
        $user->update([
            'deactivated_at' => now(),
            'status' => 'deactivated',
        ]);

        return response()->json([
            'message' => 'User deactivated successfully',
            'user' => $user,
            'active' => false,
        ]);
    }
}
