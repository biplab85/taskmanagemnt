<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|exists:kanban_columns,slug',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'assignees' => 'nullable|array',
            'assignees.*' => 'exists:users,id',
            'labels' => 'nullable|array',
            'labels.*' => 'exists:labels,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ];
    }
}
