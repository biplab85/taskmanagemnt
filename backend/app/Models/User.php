<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'can_view_all_tasks',
        'avatar',
        'status',
        'phone',
        'phone2',
        'department',
        'location',
        'present_village',
        'present_city',
        'present_thana',
        'present_post_office',
        'present_division',
        'present_country',
        'permanent_village',
        'permanent_city',
        'permanent_thana',
        'permanent_post_office',
        'permanent_division',
        'permanent_country',
        'same_as_permanent',
        'password_changed',
        'cv_path',
        'skills',
        'profile_completed',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'can_view_all_tasks' => 'boolean',
            'skills' => 'array',
            'profile_completed' => 'boolean',
            'same_as_permanent' => 'boolean',
            'password_changed' => 'boolean',
        ];
    }

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function tasks()
    {
        return $this->belongsToMany(Task::class, 'task_user');
    }

    public function createdTasks()
    {
        return $this->hasMany(Task::class, 'created_by');
    }

    public function permissions()
    {
        return $this->hasMany(Permission::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function educations()
    {
        return $this->hasMany(Education::class);
    }

    public function getProfileCompletionAttribute(): int
    {
        $score = 0;

        // Name & Email — 10%
        if (!empty($this->name) && !empty($this->email)) $score += 10;

        // Phone — 8%
        if (!empty($this->phone)) $score += 8;

        // Avatar — 12%
        if (!empty($this->avatar)) $score += 12;

        // Present address (at least village + city filled) — 10%
        if (!empty($this->present_village) && !empty($this->present_city)) $score += 10;

        // Permanent address — 5%
        if (!empty($this->permanent_village) && !empty($this->permanent_city)) $score += 5;

        // CV — 15%
        if (!empty($this->cv_path)) $score += 15;

        // Skills — 15%
        if (!empty($this->skills) && count($this->skills) > 0) $score += 15;

        // Education — 10%
        if ($this->educations()->count() > 0) $score += 10;

        // Password changed — 15%
        if ($this->password_changed) $score += 15;

        return min($score, 100);
    }
}
