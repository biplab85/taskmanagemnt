<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::with('creator:id,name,email,avatar');

        $user = auth()->user();
        if (!$user->isAdmin()) {
            $query->where('created_by', $user->id);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $query->withCount('invoices');
        $query->orderBy('created_at', 'desc');

        if ($request->has('per_page')) {
            return response()->json($query->paginate(min((int) $request->per_page, 100)));
        }

        return response()->json($query->get());
    }

    public function store(StoreClientRequest $request)
    {
        $client = Client::create([
            ...$request->validated(),
            'created_by' => auth()->id(),
        ]);

        $client->load('creator:id,name,email,avatar');

        return response()->json($client, 201);
    }

    public function show($id)
    {
        $client = Client::with('creator:id,name,email,avatar')
            ->withCount('invoices')
            ->findOrFail($id);

        $user = auth()->user();
        if (!$user->isAdmin() && $client->created_by !== $user->id) {
            return response()->json(['message' => 'You are not authorized to view this client'], 403);
        }

        return response()->json($client);
    }

    public function update(StoreClientRequest $request, $id)
    {
        $client = Client::findOrFail($id);

        $user = auth()->user();
        if (!$user->isAdmin() && $client->created_by !== $user->id) {
            return response()->json(['message' => 'You are not authorized to update this client'], 403);
        }

        $client->update($request->validated());
        $client->load('creator:id,name,email,avatar');

        return response()->json($client);
    }

    public function destroy($id)
    {
        $client = Client::findOrFail($id);

        $user = auth()->user();
        if (!$user->isAdmin() && $client->created_by !== $user->id) {
            return response()->json(['message' => 'You are not authorized to delete this client'], 403);
        }

        if ($client->invoices()->count() > 0) {
            return response()->json(['message' => 'Cannot delete client with existing invoices'], 422);
        }

        $client->delete();

        return response()->json(['message' => 'Client deleted successfully']);
    }

    public function invoiceHistory($id)
    {
        $client = Client::findOrFail($id);

        $invoices = $client->invoices()
            ->with('creator:id,name,email,avatar')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($invoices);
    }
}
