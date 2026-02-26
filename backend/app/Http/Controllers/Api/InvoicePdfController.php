<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceSetting;
use Barryvdh\DomPDF\Facade\Pdf;

class InvoicePdfController extends Controller
{
    public function download($id)
    {
        $invoice = Invoice::with(['client', 'items', 'payments', 'creator:id,name,email'])->findOrFail($id);
        $settings = InvoiceSetting::getSettings();

        $pdf = Pdf::loadView('invoices.pdf', compact('invoice', 'settings'));
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download("invoice-{$invoice->invoice_number}.pdf");
    }

    public function stream($id)
    {
        $invoice = Invoice::with(['client', 'items', 'payments', 'creator:id,name,email'])->findOrFail($id);
        $settings = InvoiceSetting::getSettings();

        $pdf = Pdf::loadView('invoices.pdf', compact('invoice', 'settings'));
        $pdf->setPaper('a4', 'portrait');

        return $pdf->stream("invoice-{$invoice->invoice_number}.pdf");
    }
}
