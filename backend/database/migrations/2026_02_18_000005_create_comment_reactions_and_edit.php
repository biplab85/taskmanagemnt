<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Comment reactions
        if (!Schema::hasTable('comment_reactions')) {
            Schema::create('comment_reactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('comment_id')->constrained('comments')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('emoji', 10);
                $table->timestamp('created_at')->useCurrent();

                $table->unique(['comment_id', 'user_id', 'emoji']);
            });
        }

        // Add edited_at to comments
        if (Schema::hasTable('comments') && !Schema::hasColumn('comments', 'edited_at')) {
            Schema::table('comments', function (Blueprint $table) {
                $table->timestamp('edited_at')->nullable()->after('updated_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_reactions');

        if (Schema::hasTable('comments') && Schema::hasColumn('comments', 'edited_at')) {
            Schema::table('comments', function (Blueprint $table) {
                $table->dropColumn('edited_at');
            });
        }
    }
};
