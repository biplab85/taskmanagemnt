<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'permission_name',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
