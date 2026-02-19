<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|exists:kanban_columns,slug',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'assignees' => 'sometimes|nullable|array',
            'assignees.*' => 'exists:users,id',
            'labels' => 'sometimes|nullable|array',
            'labels.*' => 'exists:labels,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ];
    }
}
