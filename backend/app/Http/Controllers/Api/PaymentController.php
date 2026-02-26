<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Models\Invoice;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = Payment::with(['invoice:id,invoice_number,client_id,total_amount,status,created_by', 'invoice.client:id,name,company_name']);

        // Non-admin users only see payments for their own invoices
        $user = auth()->user();
        if (!$user->isAdmin()) {
            $query->whereHas('invoice', fn($q) => $q->where('created_by', $user->id));
        }

        if ($request->has('invoice_id') && $request->invoice_id) {
            $query->where('invoice_id', $request->invoice_id);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->where('payment_date', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->where('payment_date', '<=', $request->date_to);
        }

        $query->orderBy('created_at', 'desc');

        if ($request->has('per_page')) {
            return response()->json($query->paginate(min((int) $request->per_page, 100)));
        }

        return response()->json($query->get());
    }

    public function store(StorePaymentRequest $request)
    {
        $payment = Payment::create($request->validated());

        // Auto-update invoice status if fully paid
        $this->updateInvoicePaymentStatus($payment->invoice_id);

        $payment->load(['invoice:id,invoice_number,client_id,total_amount,status', 'invoice.client:id,name,company_name']);

        // Notify invoice creator + all admins
        $invoice = Invoice::find($payment->invoice_id);
        $notifyUserIds = User::where('role', 'admin')->pluck('id');
        if ($invoice->created_by) {
            $notifyUserIds = $notifyUserIds->merge([$invoice->created_by]);
        }
        foreach ($notifyUserIds->unique() as $uid) {
            Notification::create([
                'user_id' => $uid,
                'title' => 'Payment Received',
                'message' => "Payment of {$payment->amount} received for invoice {$invoice->invoice_number}",
                'type' => 'payment_received',
            ]);
        }

        return response()->json($payment, 201);
    }

    public function show($id)
    {
        $payment = Payment::with(['invoice:id,invoice_number,client_id,total_amount,status', 'invoice.client:id,name,company_name'])
            ->findOrFail($id);

        return response()->json($payment);
    }

    public function update(StorePaymentRequest $request, $id)
    {
        $payment = Payment::findOrFail($id);
        $payment->update($request->validated());

        $this->updateInvoicePaymentStatus($payment->invoice_id);

        $payment->load(['invoice:id,invoice_number,client_id,total_amount,status', 'invoice.client:id,name,company_name']);

        return response()->json($payment);
    }

    private function updateInvoicePaymentStatus(int $invoiceId): void
    {
        $invoice = Invoice::find($invoiceId);
        if (!$invoice) return;

        $totalPaid = $invoice->payments()->where('status', 'paid')->sum('amount');

        if ($totalPaid >= $invoice->total_amount) {
            $invoice->update(['status' => 'paid']);
        } elseif ($totalPaid > 0 && $invoice->status === 'draft') {
            $invoice->update(['status' => 'unpaid']);
        }
    }
}
