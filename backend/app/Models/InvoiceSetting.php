<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceSetting extends Model
{
    protected $fillable = [
        'company_name',
        'company_logo',
        'currency',
        'tax_percentage',
        'invoice_prefix',
        'footer_note',
    ];

    protected function casts(): array
    {
        return [
            'tax_percentage' => 'decimal:2',
        ];
    }

    public static function getSettings(): self
    {
        return self::firstOrCreate([], [
            'currency' => 'USD',
            'tax_percentage' => 0,
            'invoice_prefix' => 'INV-',
        ]);
    }
}
