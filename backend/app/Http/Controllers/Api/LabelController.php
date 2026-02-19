<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLabelRequest;
use App\Http\Requests\UpdateLabelRequest;
use App\Models\Label;

class LabelController extends Controller
{
    public function index()
    {
        return response()->json(Label::orderBy('name')->get());
    }

    public function store(StoreLabelRequest $request)
    {
        $label = Label::create([
            'name' => $request->name,
            'color' => $request->color ?? '#6b7280',
        ]);

        return response()->json($label, 201);
    }

    public function update(UpdateLabelRequest $request, $id)
    {
        $label = Label::findOrFail($id);
        $label->update($request->only(['name', 'color']));

        return response()->json($label);
    }

    public function destroy($id)
    {
        $label = Label::findOrFail($id);
        $label->delete();

        return response()->json(['message' => 'Label deleted']);
    }
}
