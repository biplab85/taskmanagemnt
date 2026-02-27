<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/|confirmed',
        ], [
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
            'password.min' => 'Password must be at least 8 characters.',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'role' => 'user',
        ]);

        $token = auth()->login($user);

        return $this->respondWithToken($token, $user, 201);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $credentials = $request->only('email', 'password');

        if (!$token = auth()->attempt($credentials)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        // Block deactivated users from logging in
        $user = auth()->user();
        if ($user->deactivated_at) {
            auth()->logout();
            return response()->json(['message' => 'Your account has been deactivated. Please contact an administrator.'], 403);
        }

        return $this->respondWithToken($token, $user);
    }

    public function me()
    {
        $user = auth()->user();
        $user->load(['educations', 'activeLeave.leaveType']);
        $user->append('profile_completion');

        return response()->json($user);
    }

    public function logout()
    {
        auth()->logout();

        return response()->json(['message' => 'Successfully logged out']);
    }

    public function refresh()
    {
        $token = auth()->refresh();

        return $this->respondWithToken($token, auth()->user());
    }

    public function impersonate($id)
    {
        if ((int) $id === auth()->id()) {
            return response()->json(['message' => 'Cannot impersonate yourself'], 422);
        }

        $user = User::findOrFail($id);

        // Log the impersonation for audit trail
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'impersonated',
            'description' => 'Admin impersonated user: ' . $user->name,
        ]);

        // Generate token with is_impersonated custom claim
        $token = auth()->claims(['is_impersonated' => true])->login($user);

        return $this->respondWithToken($token, $user);
    }

    protected function respondWithToken($token, $user, $status = 200)
    {
        $user->load(['educations', 'activeLeave.leaveType']);
        $user->append('profile_completion');

        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth()->factory()->getTTL() * 60,
            'user' => $user,
        ], $status);
    }
}
