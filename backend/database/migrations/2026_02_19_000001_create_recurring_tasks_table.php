<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status')->default('todo');
            $table->string('priority')->default('medium');
            $table->unsignedBigInteger('created_by');
            $table->string('frequency'); // daily, weekly, monthly
            $table->integer('day_of_week')->nullable(); // 0-6 for weekly
            $table->integer('day_of_month')->nullable(); // 1-31 for monthly
            $table->time('time_of_day')->default('09:00');
            $table->date('next_run')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('assignee_ids')->nullable();
            $table->json('label_ids')->nullable();
            $table->timestamps();
            $table->foreign('created_by')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_tasks');
    }
};
