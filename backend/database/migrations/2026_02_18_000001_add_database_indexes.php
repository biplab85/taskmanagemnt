<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_user', function (Blueprint $table) {
            $table->index('user_id');
        });

        if (Schema::hasTable('activity_logs') && Schema::hasColumn('activity_logs', 'user_id')) {
            Schema::table('activity_logs', function (Blueprint $table) {
                $table->index(['user_id', 'created_at']);
            });
        }

        if (Schema::hasTable('notifications') && Schema::hasColumn('notifications', 'created_at')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->index('created_at');
            });
        }

        if (Schema::hasTable('tasks')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->index(['status', 'position']);
            });
        }

        if (Schema::hasTable('comments') && Schema::hasColumn('comments', 'user_id')) {
            Schema::table('comments', function (Blueprint $table) {
                $table->index('user_id');
            });
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
