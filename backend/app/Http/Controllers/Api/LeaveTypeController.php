<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLeaveTypeRequest;
use App\Models\LeaveType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LeaveTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $types = LeaveType::orderBy('name')->get();
        return response()->json($types);
    }

    public function store(StoreLeaveTypeRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['slug'] = Str::slug($data['name']);

        // Ensure unique slug
        $baseSlug = $data['slug'];
        $counter = 1;
        while (LeaveType::where('slug', $data['slug'])->exists()) {
            $data['slug'] = $baseSlug . '-' . $counter++;
        }

        $type = LeaveType::create($data);
        return response()->json($type, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $type = LeaveType::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:100|unique:leave_types,name,' . $id,
            'max_days' => 'sometimes|integer|min:0|max:365',
            'is_paid' => 'boolean',
            'carry_forward' => 'boolean',
            'is_active' => 'boolean',
            'description' => 'nullable|string|max:500',
        ]);

        $type->update($data);
        return response()->json($type);
    }

    public function destroy(int $id): JsonResponse
    {
        $type = LeaveType::findOrFail($id);
        $type->delete();
        return response()->json(['message' => 'Leave type deleted']);
    }
}
