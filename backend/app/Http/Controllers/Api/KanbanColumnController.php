<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreKanbanColumnRequest;
use App\Models\KanbanColumn;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class KanbanColumnController extends Controller
{
    public function index()
    {
        return response()->json(
            KanbanColumn::orderBy('position')->get()
        );
    }

    public function store(StoreKanbanColumnRequest $request)
    {
        // Generate unique slug from label
        $baseSlug = Str::slug($request->label, '_');
        $slug = $baseSlug;
        $i = 1;
        while (KanbanColumn::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '_' . $i++;
        }

        $maxPosition = KanbanColumn::max('position') ?? -1;

        $column = KanbanColumn::create([
            'slug' => $slug,
            'label' => $request->label,
            'color' => $request->color,
            'position' => $maxPosition + 1,
            'is_default' => false,
        ]);

        return response()->json($column, 201);
    }

    public function update(Request $request, $id)
    {
        $column = KanbanColumn::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'label' => 'sometimes|required|string|max:50',
            'color' => 'sometimes|required|string|max:7|regex:/^#[0-9a-fA-F]{6}$/',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $column->update($request->only(['label', 'color']));

        return response()->json($column);
    }

    public function reorder(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'columns' => 'required|array',
            'columns.*.id' => 'required|exists:kanban_columns,id',
            'columns.*.position' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        foreach ($request->columns as $col) {
            KanbanColumn::where('id', $col['id'])->update(['position' => $col['position']]);
        }

        return response()->json(['message' => 'Columns reordered successfully']);
    }

    public function destroy(Request $request, $id)
    {
        $column = KanbanColumn::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'reassign_to' => 'required|string|exists:kanban_columns,slug',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->reassign_to === $column->slug) {
            return response()->json(['error' => 'Cannot reassign tasks to the column being deleted'], 422);
        }

        Task::where('status', $column->slug)->update(['status' => $request->reassign_to]);
        $column->delete();

        return response()->json(['message' => 'Column deleted and tasks reassigned']);
    }
}
