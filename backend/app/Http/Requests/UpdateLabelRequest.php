<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLabelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:100|unique:labels,name,' . $this->route('id'),
            'color' => 'sometimes|string|max:7|regex:/^#[0-9a-fA-F]{6}$/',
        ];
    }
}
