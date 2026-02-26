<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    protected $fillable = [
        'invoice_id',
        'name',
        'description',
        'quantity',
        'rate',
        'tax',
        'discount',
        'subtotal',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'rate' => 'decimal:2',
            'tax' => 'decimal:2',
            'discount' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (InvoiceItem $item) {
            $item->subtotal = ($item->quantity * $item->rate) + $item->tax - $item->discount;
        });
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
