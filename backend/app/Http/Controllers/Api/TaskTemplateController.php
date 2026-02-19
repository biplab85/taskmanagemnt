<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaskTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TaskTemplateController extends Controller
{
    public function index()
    {
        $templates = TaskTemplate::with('creator:id,name')
            ->orderBy('name')
            ->get();

        return response()->json($templates);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'title_pattern' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $template = TaskTemplate::create([
            'name' => $request->name,
            'title_pattern' => $request->title_pattern,
            'description' => $request->description,
            'priority' => $request->priority ?? 'medium',
            'created_by' => auth()->id(),
        ]);

        $template->load('creator:id,name');

        return response()->json($template, 201);
    }

    public function update(Request $request, $id)
    {
        $template = TaskTemplate::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:100',
            'title_pattern' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $template->update($request->only(['name', 'title_pattern', 'description', 'priority']));

        return response()->json($template);
    }

    public function destroy($id)
    {
        $template = TaskTemplate::findOrFail($id);
        $template->delete();

        return response()->json(['message' => 'Template deleted']);
    }
}
