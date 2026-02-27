<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeaveTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:100|unique:leave_types,name',
            'max_days' => 'required|integer|min:0|max:365',
            'is_paid' => 'boolean',
            'carry_forward' => 'boolean',
            'is_active' => 'boolean',
            'description' => 'nullable|string|max:500',
        ];
    }
}
