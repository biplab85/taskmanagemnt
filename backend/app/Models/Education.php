<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Education extends Model
{
    protected $table = 'user_educations';

    protected $fillable = [
        'user_id',
        'level',
        'institution',
        'passing_year',
        'result',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
