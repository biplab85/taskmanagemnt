<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Drop old text-based address columns
            $table->dropColumn(['present_address', 'permanent_address']);
        });

        Schema::table('users', function (Blueprint $table) {
            // Present address structured fields
            $table->string('present_village')->nullable()->after('location');
            $table->string('present_city')->nullable()->after('present_village');
            $table->string('present_thana')->nullable()->after('present_city');
            $table->string('present_post_office')->nullable()->after('present_thana');
            $table->string('present_division')->nullable()->after('present_post_office');
            $table->string('present_country')->nullable()->after('present_division');

            // Permanent address structured fields
            $table->string('permanent_village')->nullable()->after('present_country');
            $table->string('permanent_city')->nullable()->after('permanent_village');
            $table->string('permanent_thana')->nullable()->after('permanent_city');
            $table->string('permanent_post_office')->nullable()->after('permanent_thana');
            $table->string('permanent_division')->nullable()->after('permanent_post_office');
            $table->string('permanent_country')->nullable()->after('permanent_division');

            // Sync flag
            $table->boolean('same_as_permanent')->default(false)->after('permanent_country');

            // Password changed tracking
            $table->boolean('password_changed')->default(false)->after('same_as_permanent');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'present_village', 'present_city', 'present_thana',
                'present_post_office', 'present_division', 'present_country',
                'permanent_village', 'permanent_city', 'permanent_thana',
                'permanent_post_office', 'permanent_division', 'permanent_country',
                'same_as_permanent', 'password_changed',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->text('present_address')->nullable()->after('location');
            $table->text('permanent_address')->nullable()->after('present_address');
        });
    }
};
