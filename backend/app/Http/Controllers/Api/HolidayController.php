<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHolidayRequest;
use App\Models\Holiday;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HolidayController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Holiday::orderBy('date');

        if ($request->filled('year')) {
            $query->whereYear('date', $request->year);
        }

        return response()->json($query->get());
    }

    public function store(StoreHolidayRequest $request): JsonResponse
    {
        $holiday = Holiday::create($request->validated());
        return response()->json($holiday, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $holiday = Holiday::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'date' => 'sometimes|date',
            'is_recurring' => 'boolean',
        ]);

        $holiday->update($data);
        return response()->json($holiday);
    }

    public function destroy(int $id): JsonResponse
    {
        Holiday::findOrFail($id)->delete();
        return response()->json(['message' => 'Holiday deleted']);
    }
}
