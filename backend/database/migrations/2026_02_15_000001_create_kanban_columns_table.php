<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kanban_columns', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 100)->unique();
            $table->string('label');
            $table->string('color', 7)->default('#6b7280');
            $table->integer('position')->default(0);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        // Seed default columns matching existing statuses
        DB::table('kanban_columns')->insert([
            ['slug' => 'backlog',     'label' => 'Backlog',     'color' => '#6b7280', 'position' => 0, 'is_default' => true, 'created_at' => now(), 'updated_at' => now()],
            ['slug' => 'todo',        'label' => 'To Do',       'color' => '#3b82f6', 'position' => 1, 'is_default' => false, 'created_at' => now(), 'updated_at' => now()],
            ['slug' => 'in_progress', 'label' => 'In Progress', 'color' => '#f59e0b', 'position' => 2, 'is_default' => false, 'created_at' => now(), 'updated_at' => now()],
            ['slug' => 'review',      'label' => 'Review',      'color' => '#8b5cf6', 'position' => 3, 'is_default' => false, 'created_at' => now(), 'updated_at' => now()],
            ['slug' => 'complete',    'label' => 'Complete',     'color' => '#10b981', 'position' => 4, 'is_default' => false, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('kanban_columns');
    }
};
