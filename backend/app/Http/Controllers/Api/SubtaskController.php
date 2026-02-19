<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSubtaskRequest;
use App\Http\Requests\UpdateSubtaskRequest;
use App\Models\Subtask;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SubtaskController extends Controller
{
    public function index($taskId)
    {
        $task = Task::findOrFail($taskId);
        return response()->json($task->subtasks);
    }

    public function store(StoreSubtaskRequest $request, $taskId)
    {
        $task = Task::findOrFail($taskId);
        $maxPosition = $task->subtasks()->max('position') ?? -1;

        $subtask = Subtask::create([
            'task_id' => $task->id,
            'title' => $request->title,
            'position' => $maxPosition + 1,
        ]);

        return response()->json($subtask, 201);
    }

    public function update(UpdateSubtaskRequest $request, $id)
    {
        $subtask = Subtask::findOrFail($id);
        $subtask->update($request->only(['title', 'is_completed']));

        return response()->json($subtask);
    }

    public function destroy($id)
    {
        $subtask = Subtask::findOrFail($id);
        $subtask->delete();

        return response()->json(['message' => 'Subtask deleted']);
    }

    public function reorder(Request $request, $taskId)
    {
        $validator = Validator::make($request->all(), [
            'subtasks' => 'required|array',
            'subtasks.*.id' => 'required|exists:subtasks,id',
            'subtasks.*.position' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        foreach ($request->subtasks as $data) {
            Subtask::where('id', $data['id'])->update(['position' => $data['position']]);
        }

        return response()->json(['message' => 'Subtasks reordered']);
    }
}
