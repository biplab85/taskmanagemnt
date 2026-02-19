<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subtask extends Model
{
    protected $fillable = [
        'task_id',
        'title',
        'is_completed',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'is_completed' => 'boolean',
            'position' => 'integer',
        ];
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
}
