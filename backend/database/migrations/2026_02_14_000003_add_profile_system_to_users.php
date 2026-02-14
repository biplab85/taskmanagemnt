<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone2')->nullable()->after('phone');
            $table->text('present_address')->nullable()->after('location');
            $table->text('permanent_address')->nullable()->after('present_address');
            $table->string('cv_path')->nullable()->after('permanent_address');
            $table->json('skills')->nullable()->after('cv_path');
            $table->boolean('profile_completed')->default(false)->after('skills');
        });

        Schema::create('user_educations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('level'); // ssc, hsc, honors, masters, etc.
            $table->string('institution');
            $table->string('passing_year')->nullable();
            $table->string('result')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_educations');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone2', 'present_address', 'permanent_address', 'cv_path', 'skills', 'profile_completed']);
        });
    }
};
