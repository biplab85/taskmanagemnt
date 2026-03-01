<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tasks') && Schema::hasColumn('tasks', 'priority')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->index('priority');
            });
        }

        if (Schema::hasTable('tasks') && Schema::hasColumn('tasks', 'created_by')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->index('created_by');
            });
        }

        if (Schema::hasTable('tasks') && Schema::hasColumn('tasks', 'end_date')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->index('end_date');
            });
        }

        if (Schema::hasTable('notifications') && Schema::hasColumn('notifications', 'is_read')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->index('is_read');
            });
        }

        if (Schema::hasTable('notifications') && Schema::hasColumn('notifications', 'user_id') && Schema::hasColumn('notifications', 'is_read')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->index(['user_id', 'is_read']);
            });
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
