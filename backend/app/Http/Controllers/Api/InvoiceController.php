<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoiceRequest;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Notification;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['client:id,name,company_name,email', 'creator:id,name,email,avatar']);

        $user = auth()->user();
        if (!$user->isAdmin()) {
            $query->where('created_by', $user->id);
        }

        if ($request->has('status') && $request->status) {
            $statuses = explode(',', $request->status);
            $query->whereIn('status', $statuses);
        }

        if ($request->has('client_id') && $request->client_id) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->where('invoice_date', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->where('invoice_date', '<=', $request->date_to);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($q2) use ($search) {
                      $q2->where('name', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%");
                  });
            });
        }

        $query->orderBy('created_at', 'desc');

        if ($request->has('per_page')) {
            return response()->json($query->paginate(min((int) $request->per_page, 100)));
        }

        return response()->json($query->get());
    }

    public function store(StoreInvoiceRequest $request)
    {
        $invoice = Invoice::create([
            'client_id' => $request->client_id,
            'invoice_date' => $request->invoice_date,
            'due_date' => $request->due_date,
            'status' => $request->status ?? 'draft',
            'notes' => $request->notes,
            'created_by' => auth()->id(),
        ]);

        // Create invoice items
        if ($request->has('items')) {
            foreach ($request->items as $itemData) {
                $invoice->items()->create($itemData);
            }
        }

        // Recalculate totals
        $invoice->recalculateTotals();

        $invoice->load(['client', 'items', 'creator:id,name,email,avatar']);

        // Notification
        Notification::create([
            'user_id' => auth()->id(),
            'title' => 'Invoice Created',
            'message' => 'You created invoice ' . $invoice->invoice_number,
            'type' => 'invoice_created',
        ]);

        return response()->json($invoice, 201);
    }

    public function show($id)
    {
        $invoice = Invoice::with([
            'client',
            'items',
            'payments',
            'creator:id,name,email,avatar',
        ])->findOrFail($id);

        $user = auth()->user();
        if (!$user->isAdmin() && $invoice->created_by !== $user->id) {
            return response()->json(['message' => 'You are not authorized to view this invoice'], 403);
        }

        $invoice->append(['total_paid', 'balance_due']);

        return response()->json($invoice);
    }

    public function update(StoreInvoiceRequest $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        $user = auth()->user();
        if (!$user->isAdmin() && $invoice->created_by !== $user->id) {
            return response()->json(['message' => 'You are not authorized to update this invoice'], 403);
        }

        $invoice->update($request->only([
            'client_id', 'invoice_date', 'due_date', 'status', 'notes',
        ]));

        // Update items if provided
        if ($request->has('items')) {
            // Remove old items and recreate
            $invoice->items()->delete();
            foreach ($request->items as $itemData) {
                $invoice->items()->create($itemData);
            }
        }

        $invoice->recalculateTotals();
        $invoice->load(['client', 'items', 'creator:id,name,email,avatar']);

        return response()->json($invoice);
    }

    public function destroy($id)
    {
        $invoice = Invoice::findOrFail($id);

        $user = auth()->user();
        if (!$user->isAdmin() && $invoice->created_by !== $user->id) {
            return response()->json(['message' => 'You are not authorized to delete this invoice'], 403);
        }

        $invoiceNumber = $invoice->invoice_number;
        $invoice->delete();

        return response()->json(['message' => "Invoice {$invoiceNumber} deleted successfully"]);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:draft,sent,paid,unpaid,overdue,cancelled',
        ]);

        $invoice = Invoice::findOrFail($id);

        $user = auth()->user();
        if (!$user->isAdmin() && $invoice->created_by !== $user->id) {
            return response()->json(['message' => 'You are not authorized to update this invoice'], 403);
        }

        $oldStatus = $invoice->status;
        $invoice->update(['status' => $request->status]);

        Notification::create([
            'user_id' => auth()->id(),
            'title' => 'Invoice Status Changed',
            'message' => "Invoice {$invoice->invoice_number} changed from {$oldStatus} to {$request->status}",
            'type' => 'invoice_status_changed',
        ]);

        $invoice->load(['client', 'items', 'creator:id,name,email,avatar']);

        return response()->json($invoice);
    }

    public function duplicate($id)
    {
        $invoice = Invoice::with('items')->findOrFail($id);

        $user = auth()->user();
        if (!$user->isAdmin() && $invoice->created_by !== $user->id) {
            return response()->json(['message' => 'You are not authorized to duplicate this invoice'], 403);
        }

        $newInvoice = Invoice::create([
            'client_id' => $invoice->client_id,
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'status' => 'draft',
            'notes' => $invoice->notes,
            'created_by' => auth()->id(),
        ]);

        foreach ($invoice->items as $item) {
            $newInvoice->items()->create([
                'name' => $item->name,
                'description' => $item->description,
                'quantity' => $item->quantity,
                'rate' => $item->rate,
                'tax' => $item->tax,
                'discount' => $item->discount,
            ]);
        }

        $newInvoice->recalculateTotals();
        $newInvoice->load(['client', 'items', 'creator:id,name,email,avatar']);

        return response()->json($newInvoice, 201);
    }
}
