<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'invoice_id' => 'required|exists:invoices,id',
            'payment_method' => 'required|in:cash,bank_transfer,mobile_banking',
            'payment_date' => 'required|date',
            'transaction_id' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'status' => 'nullable|in:pending,paid,failed,refunded',
        ];
    }
}
