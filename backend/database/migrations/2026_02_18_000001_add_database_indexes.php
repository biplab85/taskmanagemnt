<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // task_user.user_id
        $indexes = DB::select("SHOW INDEX FROM task_user WHERE Column_name = 'user_id' AND Key_name != 'PRIMARY'");
        if (empty($indexes)) {
            Schema::table('task_user', function (Blueprint $table) {
                $table->index('user_id');
            });
        }

        // activity_logs composite: user_id + created_at for user activity queries
        if (Schema::hasTable('activity_logs') && Schema::hasColumn('activity_logs', 'user_id')) {
            $indexes = DB::select("SHOW INDEX FROM activity_logs WHERE Key_name = 'activity_logs_user_id_created_at_index'");
            if (empty($indexes)) {
                Schema::table('activity_logs', function (Blueprint $table) {
                    $table->index(['user_id', 'created_at']);
                });
            }
        }

        // notifications: created_at for ordering
        if (Schema::hasTable('notifications') && Schema::hasColumn('notifications', 'created_at')) {
            $indexes = DB::select("SHOW INDEX FROM notifications WHERE Key_name = 'notifications_created_at_index'");
            if (empty($indexes)) {
                Schema::table('notifications', function (Blueprint $table) {
                    $table->index('created_at');
                });
            }
        }

        // tasks: composite for common filter+sort queries
        if (Schema::hasTable('tasks')) {
            $indexes = DB::select("SHOW INDEX FROM tasks WHERE Key_name = 'tasks_status_position_index'");
            if (empty($indexes)) {
                Schema::table('tasks', function (Blueprint $table) {
                    $table->index(['status', 'position']);
                });
            }
        }

        // comments: user_id for "my comments" queries
        if (Schema::hasTable('comments') && Schema::hasColumn('comments', 'user_id')) {
            $indexes = DB::select("SHOW INDEX FROM comments WHERE Key_name = 'comments_user_id_index'");
            if (empty($indexes)) {
                Schema::table('comments', function (Blueprint $table) {
                    $table->index('user_id');
                });
            }
        }
    }

    public function down(): void
    {
        Schema::table('task_user', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
        });
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'created_at']);
        });
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['status', 'position']);
        });
        Schema::table('comments', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
        });
    }
};
