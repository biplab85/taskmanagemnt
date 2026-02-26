<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\KanbanColumnController;
use App\Http\Controllers\Api\LabelController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SubtaskController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskTemplateController;
use App\Http\Controllers\Api\RecurringTaskController;
use App\Http\Controllers\Api\TaskWatcherController;
use App\Http\Controllers\Api\TimeEntryController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\LeaveTypeController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\LeaveBalanceController;
use App\Http\Controllers\Api\HolidayController;
use App\Http\Controllers\Api\LeaveReportController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\InvoiceReportController;
use App\Http\Controllers\Api\InvoiceSettingController;
use App\Http\Controllers\Api\InvoicePdfController;
use Illuminate\Support\Facades\Route;

// Public routes (registration removed - admin creates users)
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

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
    Route::post('/tasks/{id}/duplicate', [TaskController::class, 'duplicate']);
    Route::put('/tasks/{id}/dependencies', [TaskController::class, 'updateDependencies']);
    Route::put('/tasks-reorder', [TaskController::class, 'reorder']);
    Route::post('/tasks-bulk', [TaskController::class, 'bulkUpdate']);
    Route::get('/tasks-archived', [TaskController::class, 'archived']);
    Route::post('/tasks/{id}/restore', [TaskController::class, 'restore']);
    Route::delete('/tasks/{id}/force', [TaskController::class, 'forceDestroy']);

    // Subtasks
    Route::get('/tasks/{taskId}/subtasks', [SubtaskController::class, 'index']);
    Route::post('/tasks/{taskId}/subtasks', [SubtaskController::class, 'store']);
    Route::put('/subtasks/{id}', [SubtaskController::class, 'update']);
    Route::delete('/subtasks/{id}', [SubtaskController::class, 'destroy']);
    Route::put('/tasks/{taskId}/subtasks-reorder', [SubtaskController::class, 'reorder']);

    // Task Templates
    Route::get('/task-templates', [TaskTemplateController::class, 'index']);
    Route::post('/task-templates', [TaskTemplateController::class, 'store']);
    Route::put('/task-templates/{id}', [TaskTemplateController::class, 'update']);
    Route::delete('/task-templates/{id}', [TaskTemplateController::class, 'destroy']);

    // Labels
    Route::get('/labels', [LabelController::class, 'index']);
    Route::post('/labels', [LabelController::class, 'store']);
    Route::put('/labels/{id}', [LabelController::class, 'update']);
    Route::delete('/labels/{id}', [LabelController::class, 'destroy']);

    // Reports & Analytics
    Route::get('/reports/stats', [ReportController::class, 'stats']);
    Route::get('/reports/completion-trends', [ReportController::class, 'completionTrends']);
    Route::get('/reports/team-workload', [ReportController::class, 'teamWorkload']);
    Route::get('/reports/overdue', [ReportController::class, 'overdueTasks']);
    Route::get('/reports/export-csv', [ReportController::class, 'exportCsv']);

    // Global Search
    Route::get('/search', [ReportController::class, 'globalSearch'])->middleware('throttle:30,1');

    // Recurring Tasks
    Route::get('/recurring-tasks', [RecurringTaskController::class, 'index']);
    Route::post('/recurring-tasks', [RecurringTaskController::class, 'store']);
    Route::put('/recurring-tasks/{id}', [RecurringTaskController::class, 'update']);
    Route::delete('/recurring-tasks/{id}', [RecurringTaskController::class, 'destroy']);
    Route::post('/recurring-tasks/{id}/generate', [RecurringTaskController::class, 'generate']);

    // Time Entries
    Route::get('/tasks/{taskId}/time-entries', [TimeEntryController::class, 'index']);
    Route::post('/tasks/{taskId}/time-entries/start', [TimeEntryController::class, 'start']);
    Route::post('/tasks/{taskId}/time-entries', [TimeEntryController::class, 'store']);
    Route::put('/time-entries/{id}/stop', [TimeEntryController::class, 'stop']);
    Route::delete('/time-entries/{id}', [TimeEntryController::class, 'destroy']);
    Route::get('/time-entries/my-active', [TimeEntryController::class, 'myActive']);

    // Task Watchers
    Route::post('/tasks/{taskId}/watchers/toggle', [TaskWatcherController::class, 'toggle']);
    Route::get('/tasks/{taskId}/watchers', [TaskWatcherController::class, 'watchers']);

    // Comments
    Route::post('/tasks/{taskId}/comments', [CommentController::class, 'store']);
    Route::put('/comments/{id}', [CommentController::class, 'update']);
    Route::delete('/comments/{id}', [CommentController::class, 'destroy']);
    Route::post('/comments/{id}/reactions', [CommentController::class, 'toggleReaction']);

    // Attachments
    Route::post('/tasks/{taskId}/attachments', [AttachmentController::class, 'store']);
    Route::delete('/attachments/{id}', [AttachmentController::class, 'destroy']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::get('/notifications/trash', [NotificationController::class, 'trash']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::post('/notifications/bulk-read', [NotificationController::class, 'bulkMarkRead']);
    Route::post('/notifications/bulk-unread', [NotificationController::class, 'bulkMarkUnread']);
    Route::post('/notifications/bulk-delete', [NotificationController::class, 'bulkDelete']);
    Route::delete('/notifications/clear-read', [NotificationController::class, 'destroyAll']);
    Route::post('/notifications/{id}/restore', [NotificationController::class, 'restore']);
    Route::delete('/notifications/{id}/force', [NotificationController::class, 'forceDestroy']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/{id}/unread', [NotificationController::class, 'markAsUnread']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // Messages
    Route::get('/messages/inbox', [MessageController::class, 'inbox']);
    Route::get('/messages/sent', [MessageController::class, 'sent']);
    Route::get('/messages/trash', [MessageController::class, 'trash']);
    Route::get('/messages/unread-count', [MessageController::class, 'unreadCount']);
    Route::post('/messages', [MessageController::class, 'store']);
    Route::post('/messages/bulk-read', [MessageController::class, 'bulkMarkRead']);
    Route::post('/messages/bulk-unread', [MessageController::class, 'bulkMarkUnread']);
    Route::post('/messages/bulk-delete', [MessageController::class, 'bulkDelete']);
    Route::get('/messages/{id}', [MessageController::class, 'show']);
    Route::put('/messages/{id}/read', [MessageController::class, 'markAsRead']);
    Route::put('/messages/{id}/unread', [MessageController::class, 'markAsUnread']);
    Route::delete('/messages/{id}', [MessageController::class, 'destroy']);
    Route::post('/messages/{id}/restore', [MessageController::class, 'restore']);
    Route::delete('/messages/{id}/force', [MessageController::class, 'forceDestroy']);

    // Users list (all authenticated users can fetch basic user info)
    Route::get('/users-list', function () {
        return response()->json(
            \App\Models\User::select('id', 'name', 'email', 'avatar', 'status', 'profile_completed')
                ->with('activeLeave.leaveType')
                ->orderBy('name')
                ->get()
        );
    });

    // Kanban Columns (all authenticated users can read)
    Route::get('/kanban-columns', [KanbanColumnController::class, 'index']);

    // Activity Logs
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    Route::get('/tasks/{taskId}/activity-logs', [ActivityLogController::class, 'forTask']);

    // Leave Module
    Route::get('/leave-types', [LeaveTypeController::class, 'index']);
    Route::get('/leaves', [LeaveController::class, 'index']);
    Route::post('/leaves', [LeaveController::class, 'store']);
    Route::post('/leaves/{id}/cancel', [LeaveController::class, 'cancel']);
    Route::get('/leave-balances', [LeaveBalanceController::class, 'index']);
    Route::get('/leave-calendar', [LeaveController::class, 'calendar']);
    Route::get('/leave-conflicts', [LeaveController::class, 'conflicts']);
    Route::get('/leave-reports/stats', [LeaveReportController::class, 'stats']);
    Route::get('/holidays', [HolidayController::class, 'index']);

    // Clients
    Route::get('/clients', [ClientController::class, 'index']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::get('/clients/{id}', [ClientController::class, 'show']);
    Route::put('/clients/{id}', [ClientController::class, 'update']);
    Route::delete('/clients/{id}', [ClientController::class, 'destroy']);
    Route::get('/clients/{id}/invoices', [ClientController::class, 'invoiceHistory']);

    // Invoices
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::post('/invoices', [InvoiceController::class, 'store']);
    Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
    Route::put('/invoices/{id}', [InvoiceController::class, 'update']);
    Route::delete('/invoices/{id}', [InvoiceController::class, 'destroy']);
    Route::put('/invoices/{id}/status', [InvoiceController::class, 'updateStatus']);
    Route::post('/invoices/{id}/duplicate', [InvoiceController::class, 'duplicate']);
    Route::get('/invoices/{id}/pdf', [InvoicePdfController::class, 'download']);
    Route::get('/invoices/{id}/pdf/stream', [InvoicePdfController::class, 'stream']);

    // Payments
    Route::get('/payments', [PaymentController::class, 'index']);
    Route::post('/payments', [PaymentController::class, 'store']);
    Route::get('/payments/{id}', [PaymentController::class, 'show']);
    Route::put('/payments/{id}', [PaymentController::class, 'update']);

    // Invoice Reports
    Route::get('/invoice-reports/dashboard', [InvoiceReportController::class, 'dashboard']);

    // Invoice Settings
    Route::get('/invoice-settings', [InvoiceSettingController::class, 'show']);

    // Admin: User Management & Kanban Columns
    Route::middleware('admin')->group(function () {
        // Kanban Columns (admin only for mutations)
        Route::post('/kanban-columns', [KanbanColumnController::class, 'store']);
        Route::put('/kanban-columns/reorder', [KanbanColumnController::class, 'reorder']);
        Route::put('/kanban-columns/{id}', [KanbanColumnController::class, 'update']);
        Route::delete('/kanban-columns/{id}', [KanbanColumnController::class, 'destroy']);

        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{id}', [UserController::class, 'show']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
        Route::post('/users/{id}/impersonate', [AuthController::class, 'impersonate']);
        Route::post('/users/{id}/toggle-active', [UserController::class, 'toggleActive']);

        // Leave Admin
        Route::post('/leave-types', [LeaveTypeController::class, 'store']);
        Route::put('/leave-types/{id}', [LeaveTypeController::class, 'update']);
        Route::delete('/leave-types/{id}', [LeaveTypeController::class, 'destroy']);
        Route::post('/leaves/{id}/status', [LeaveController::class, 'updateStatus']);
        Route::post('/leave-balances', [LeaveBalanceController::class, 'update']);
        Route::post('/leave-balances/initialize', [LeaveBalanceController::class, 'initializeYear']);
        Route::post('/holidays', [HolidayController::class, 'store']);
        Route::put('/holidays/{id}', [HolidayController::class, 'update']);
        Route::delete('/holidays/{id}', [HolidayController::class, 'destroy']);
        Route::get('/leave-reports/users', [LeaveReportController::class, 'userReport']);
        Route::get('/leave-reports/departments', [LeaveReportController::class, 'departmentReport']);
        Route::get('/leave-reports/export-csv', [LeaveReportController::class, 'exportCsv']);

        // Invoice Settings (admin only for mutations)
        Route::put('/invoice-settings', [InvoiceSettingController::class, 'update']);
    });
});
