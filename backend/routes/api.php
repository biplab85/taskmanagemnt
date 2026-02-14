<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Public routes (registration removed - admin creates users)
Route::post('/login', [AuthController::class, 'login']);

// Authenticated routes
Route::middleware('auth:api')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/refresh', [AuthController::class, 'refresh']);

    // Profile
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/address', [ProfileController::class, 'updateAddress']);
    Route::put('/profile/password', [ProfileController::class, 'changePassword']);
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);
    Route::post('/profile/cv', [ProfileController::class, 'uploadCv']);
    Route::delete('/profile/cv', [ProfileController::class, 'deleteCv']);

    // Education
    Route::get('/profile/educations', [ProfileController::class, 'educations']);
    Route::post('/profile/educations', [ProfileController::class, 'storeEducation']);
    Route::put('/profile/educations/{id}', [ProfileController::class, 'updateEducation']);
    Route::delete('/profile/educations/{id}', [ProfileController::class, 'destroyEducation']);

    // Tasks
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::get('/tasks/{id}', [TaskController::class, 'show']);
    Route::put('/tasks/{id}', [TaskController::class, 'update']);
    Route::delete('/tasks/{id}', [TaskController::class, 'destroy']);
    Route::put('/tasks-reorder', [TaskController::class, 'reorder']);

    // Comments
    Route::post('/tasks/{taskId}/comments', [CommentController::class, 'store']);
    Route::delete('/comments/{id}', [CommentController::class, 'destroy']);

    // Attachments
    Route::post('/tasks/{taskId}/attachments', [AttachmentController::class, 'store']);
    Route::delete('/attachments/{id}', [AttachmentController::class, 'destroy']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/clear-read', [NotificationController::class, 'destroyAll']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/{id}/unread', [NotificationController::class, 'markAsUnread']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // Users list (all authenticated users can fetch basic user info)
    Route::get('/users-list', function () {
        return response()->json(
            \App\Models\User::select('id', 'name', 'email', 'avatar', 'status', 'profile_completed')->orderBy('name')->get()
        );
    });

    // Activity Logs
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    Route::get('/tasks/{taskId}/activity-logs', [ActivityLogController::class, 'forTask']);

    // Admin: User Management
    Route::middleware('admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{id}', [UserController::class, 'show']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
        Route::post('/users/{id}/impersonate', [AuthController::class, 'impersonate']);
    });
});
