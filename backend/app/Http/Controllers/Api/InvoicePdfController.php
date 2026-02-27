<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceSetting;
use Barryvdh\DomPDF\Facade\Pdf;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;

class InvoicePdfController extends Controller
{
    private function buildPdfData($id)
    {
        $invoice = Invoice::with(['client', 'items', 'payments', 'creator:id,name,email'])->findOrFail($id);
        $settings = InvoiceSetting::getSettings();

        // Convert logo to base64 for DomPDF
        $logoBase64 = null;
        if ($settings->company_logo && \Storage::disk('public')->exists($settings->company_logo)) {
            $logoContent = \Storage::disk('public')->get($settings->company_logo);
            $mime = \Storage::disk('public')->mimeType($settings->company_logo);
            $logoBase64 = 'data:' . $mime . ';base64,' . base64_encode($logoContent);
        }

        // Build QR code data
        $totalPaid = $invoice->payments->where('status', 'paid')->sum('amount');
        $balanceDue = $invoice->total_amount - $totalPaid;

        $qrData = implode("\n", array_filter([
            '=== INVOICE ===',
            'Invoice: ' . $invoice->invoice_number,
            'Status: ' . strtoupper($invoice->status),
            'Date: ' . \Carbon\Carbon::parse($invoice->invoice_date)->format('M d, Y'),
            'Due: ' . \Carbon\Carbon::parse($invoice->due_date)->format('M d, Y'),
            '',
            '--- CLIENT ---',
            'Name: ' . $invoice->client->name,
            $invoice->client->company_name ? 'Company: ' . $invoice->client->company_name : null,
            $invoice->client->email ? 'Email: ' . $invoice->client->email : null,
            $invoice->client->phone ? 'Phone: ' . $invoice->client->phone : null,
            $invoice->client->address ? 'Address: ' . $invoice->client->address : null,
            '',
            '--- SUMMARY ---',
            'Subtotal: ' . $settings->currency . ' ' . number_format($invoice->subtotal, 2),
            'Tax: ' . $settings->currency . ' ' . number_format($invoice->tax_amount, 2),
            'Discount: ' . $settings->currency . ' ' . number_format($invoice->discount_amount, 2),
            'Total: ' . $settings->currency . ' ' . number_format($invoice->total_amount, 2),
            '',
            '--- PAYMENT ---',
            'Paid: ' . $settings->currency . ' ' . number_format($totalPaid, 2),
            'Balance Due: ' . $settings->currency . ' ' . number_format($balanceDue, 2),
            $settings->company_name ? '' : null,
            $settings->company_name ? 'From: ' . $settings->company_name : null,
        ]));

        // Generate QR code as base64 PNG using GD
        $options = new QROptions([
            'outputType' => QRCode::OUTPUT_IMAGE_PNG,
            'scale' => 5,
            'quietzoneSize' => 1,
        ]);
        $qrCodeBase64 = (new QRCode($options))->render($qrData);

        return compact('invoice', 'settings', 'logoBase64', 'qrCodeBase64');
    }

    public function download($id)
    {
        $data = $this->buildPdfData($id);

        $pdf = Pdf::loadView('invoices.pdf', $data);
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download("invoice-{$data['invoice']->invoice_number}.pdf");
    }

    public function stream($id)
    {
        $data = $this->buildPdfData($id);

        $pdf = Pdf::loadView('invoices.pdf', $data);
        $pdf->setPaper('a4', 'portrait');

        return $pdf->stream("invoice-{$data['invoice']->invoice_number}.pdf");
    }
}
