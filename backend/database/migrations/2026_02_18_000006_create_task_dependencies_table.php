<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('task_dependencies')) {
            Schema::create('task_dependencies', function (Blueprint $table) {
                $table->id();
                $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
                $table->foreignId('depends_on_id')->constrained('tasks')->cascadeOnDelete();
                $table->timestamp('created_at')->useCurrent();

                $table->unique(['task_id', 'depends_on_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('task_dependencies');
    }
};
