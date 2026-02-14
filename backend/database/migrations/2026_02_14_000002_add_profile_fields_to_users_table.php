<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->after('avatar');
            $table->string('department', 100)->nullable()->after('phone');
            $table->string('location', 150)->nullable()->after('department');
        });

        // Seed profile data for existing users
        DB::table('users')->where('id', 1)->update([
            'phone' => '+1 (555) 100-0001',
            'department' => 'Engineering',
            'location' => 'San Francisco, CA',
        ]);
        DB::table('users')->where('id', 2)->update([
            'phone' => '+1 (555) 200-0023',
            'department' => 'Design',
            'location' => 'New York, NY',
        ]);
        DB::table('users')->where('id', 3)->update([
            'phone' => '+1 (555) 300-0045',
            'department' => 'Backend Engineering',
            'location' => 'Austin, TX',
        ]);
        DB::table('users')->where('id', 4)->update([
            'phone' => '+1 (555) 400-0067',
            'department' => 'Product Management',
            'location' => 'Seattle, WA',
        ]);
        DB::table('users')->where('id', 5)->update([
            'phone' => '+1 (555) 500-0089',
            'department' => 'Frontend Engineering',
            'location' => 'Chicago, IL',
        ]);
        DB::table('users')->where('id', 6)->update([
            'phone' => '+1 (555) 600-0012',
            'department' => 'QA & Testing',
            'location' => 'Denver, CO',
        ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'department', 'location']);
        });
    }
};
