<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add role, can_view_all_tasks, avatar, status to users if not exists
        if (!Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('role')->default('user')->after('password');
                $table->boolean('can_view_all_tasks')->default(false)->after('role');
                $table->string('avatar')->nullable()->after('can_view_all_tasks');
                $table->string('status')->nullable()->after('avatar');
            });
        }

        if (!Schema::hasTable('tasks')) {
            Schema::create('tasks', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('status')->default('backlog');
                $table->string('priority')->default('medium');
                $table->unsignedBigInteger('created_by')->nullable();
                $table->date('start_date')->nullable();
                $table->date('end_date')->nullable();
                $table->integer('position')->default(0);
                $table->timestamps();

                $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
                $table->index('status');
                $table->index('priority');
                $table->index('created_by');
            });
        }

        if (!Schema::hasTable('permissions')) {
            Schema::create('permissions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('permission_name');
                $table->timestamp('created_at')->nullable();

                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->index('user_id');
            });
        }

        if (!Schema::hasTable('comments')) {
            Schema::create('comments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('task_id');
                $table->unsignedBigInteger('user_id');
                $table->text('body');
                $table->timestamps();

                $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->index('task_id');
            });
        }

        if (!Schema::hasTable('attachments')) {
            Schema::create('attachments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('task_id');
                $table->unsignedBigInteger('user_id');
                $table->string('file_name');
                $table->string('file_path');
                $table->string('file_type')->nullable();
                $table->integer('file_size')->default(0);
                $table->timestamp('created_at')->nullable();

                $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->index('task_id');
            });
        }

        if (!Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('task_id')->nullable();
                $table->string('title');
                $table->text('message');
                $table->string('type')->default('info');
                $table->boolean('is_read')->default(false);
                $table->timestamp('created_at')->nullable();

                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->foreign('task_id')->references('id')->on('tasks')->nullOnDelete();
                $table->index(['user_id', 'is_read']);
            });
        }

        if (!Schema::hasTable('activity_logs')) {
            Schema::create('activity_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('task_id')->nullable();
                $table->string('action');
                $table->text('description');
                $table->timestamp('created_at')->nullable();

                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->foreign('task_id')->references('id')->on('tasks')->nullOnDelete();
                $table->index('task_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('tasks');

        if (Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn(['role', 'can_view_all_tasks', 'avatar', 'status']);
            });
        }
    }
};
