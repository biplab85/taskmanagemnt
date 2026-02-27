<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'sender_id',
        'recipient_id',
        'subject',
        'body',
        'attachment_path',
        'attachment_name',
        'is_read',
        'deleted_by_sender',
        'deleted_by_recipient',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'deleted_by_sender' => 'boolean',
            'deleted_by_recipient' => 'boolean',
        ];
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient()
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function scopeInboxFor($query, $userId)
    {
        return $query->where('recipient_id', $userId)->where('deleted_by_recipient', false);
    }

    public function scopeSentBy($query, $userId)
    {
        return $query->where('sender_id', $userId)->where('deleted_by_sender', false);
    }

    public function scopeTrashFor($query, $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where(function ($q2) use ($userId) {
                $q2->where('recipient_id', $userId)->where('deleted_by_recipient', true);
            })->orWhere(function ($q2) use ($userId) {
                $q2->where('sender_id', $userId)->where('deleted_by_sender', true);
            });
        });
    }
}
