<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'status',
        'priority',
        'created_by',
        'start_date',
        'end_date',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function assignees()
    {
        return $this->belongsToMany(User::class, 'task_user');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function attachments()
    {
        return $this->hasMany(Attachment::class);
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function subtasks()
    {
        return $this->hasMany(Subtask::class)->orderBy('position');
    }

    public function labels()
    {
        return $this->belongsToMany(Label::class, 'task_label');
    }

    /** Tasks this task depends on (blocked by) */
    public function dependencies()
    {
        return $this->belongsToMany(self::class, 'task_dependencies', 'task_id', 'depends_on_id');
    }

    /** Tasks that depend on this task (blocks) */
    public function dependents()
    {
        return $this->belongsToMany(self::class, 'task_dependencies', 'depends_on_id', 'task_id');
    }

    public function watchers()
    {
        return $this->belongsToMany(User::class, 'task_watchers')->withTimestamps();
    }

    public function timeEntries()
    {
        return $this->hasMany(TimeEntry::class);
    }
}
