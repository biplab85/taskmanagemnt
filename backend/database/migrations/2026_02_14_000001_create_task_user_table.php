<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['task_id', 'user_id']);
        });

        // Migrate existing assigned_to data into the pivot table
        DB::statement('INSERT INTO task_user (task_id, user_id) SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL');

        // Drop the old assigned_to column
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['assigned_to']);
            $table->dropColumn('assigned_to');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
        });

        // Migrate back: pick the first assignee for each task
        $pivotRows = DB::table('task_user')
            ->select('task_id', DB::raw('MIN(user_id) as user_id'))
            ->groupBy('task_id')
            ->get();

        foreach ($pivotRows as $row) {
            DB::table('tasks')->where('id', $row->task_id)->update(['assigned_to' => $row->user_id]);
        }

        Schema::dropIfExists('task_user');
    }
};
