<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // tasks.priority index for priority-based filtering
        if (Schema::hasTable('tasks') && Schema::hasColumn('tasks', 'priority')) {
            $indexes = DB::select("SHOW INDEX FROM tasks WHERE Key_name = 'tasks_priority_index'");
            if (empty($indexes)) {
                Schema::table('tasks', function (Blueprint $table) {
                    $table->index('priority');
                });
            }
        }

        // tasks.created_by index for creator-based queries
        if (Schema::hasTable('tasks') && Schema::hasColumn('tasks', 'created_by')) {
            $indexes = DB::select("SHOW INDEX FROM tasks WHERE Key_name = 'tasks_created_by_index'");
            if (empty($indexes)) {
                Schema::table('tasks', function (Blueprint $table) {
                    $table->index('created_by');
                });
            }
        }

        // tasks.end_date index for overdue and date-range queries
        if (Schema::hasTable('tasks') && Schema::hasColumn('tasks', 'end_date')) {
            $indexes = DB::select("SHOW INDEX FROM tasks WHERE Key_name = 'tasks_end_date_index'");
            if (empty($indexes)) {
                Schema::table('tasks', function (Blueprint $table) {
                    $table->index('end_date');
                });
            }
        }

        // notifications.is_read index for unread count queries
        if (Schema::hasTable('notifications') && Schema::hasColumn('notifications', 'is_read')) {
            $indexes = DB::select("SHOW INDEX FROM notifications WHERE Key_name = 'notifications_is_read_index'");
            if (empty($indexes)) {
                Schema::table('notifications', function (Blueprint $table) {
                    $table->index('is_read');
                });
            }
        }

        // notifications composite index on user_id + is_read for per-user unread queries
        if (Schema::hasTable('notifications') && Schema::hasColumn('notifications', 'user_id') && Schema::hasColumn('notifications', 'is_read')) {
            $indexes = DB::select("SHOW INDEX FROM notifications WHERE Key_name = 'notifications_user_id_is_read_index'");
            if (empty($indexes)) {
                Schema::table('notifications', function (Blueprint $table) {
                    $table->index(['user_id', 'is_read']);
                });
            }
        }
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['priority']);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['created_by']);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['end_date']);
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['is_read']);
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'is_read']);
        });
    }
};
