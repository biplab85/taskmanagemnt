<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeaveType extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'max_days',
        'is_paid',
        'carry_forward',
        'is_active',
        'description',
    ];

    protected $casts = [
        'max_days' => 'integer',
        'is_paid' => 'boolean',
        'carry_forward' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function leaves(): HasMany
    {
        return $this->hasMany(Leave::class);
    }

    public function balances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class);
    }
}
