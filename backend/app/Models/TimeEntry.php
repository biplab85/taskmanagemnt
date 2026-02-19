<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimeEntry extends Model
{
    protected $fillable = [
        'task_id',
        'user_id',
        'description',
        'started_at',
        'stopped_at',
        'duration_minutes',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'stopped_at' => 'datetime',
            'duration_minutes' => 'integer',
        ];
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get calculated duration in minutes (live for active timers).
     */
    public function getCalculatedDurationAttribute(): ?int
    {
        if ($this->duration_minutes) {
            return $this->duration_minutes;
        }

        if ($this->started_at && !$this->stopped_at) {
            return (int) now()->diffInMinutes($this->started_at);
        }

        return null;
    }
}
