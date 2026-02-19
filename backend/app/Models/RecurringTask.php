<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecurringTask extends Model
{
    protected $fillable = [
        'title',
        'description',
        'status',
        'priority',
        'created_by',
        'frequency',
        'day_of_week',
        'day_of_month',
        'time_of_day',
        'next_run',
        'is_active',
        'assignee_ids',
        'label_ids',
    ];

    protected function casts(): array
    {
        return [
            'assignee_ids' => 'array',
            'label_ids' => 'array',
            'is_active' => 'boolean',
            'next_run' => 'date',
            'day_of_week' => 'integer',
            'day_of_month' => 'integer',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
