<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 12px; color: #1a1a2e; line-height: 1.5; }

        .invoice-wrapper { padding: 40px; }

        /* Header */
        .header { display: table; width: 100%; margin-bottom: 40px; }
        .header-left { display: table-cell; width: 60%; vertical-align: top; }
        .header-right { display: table-cell; width: 40%; vertical-align: top; text-align: right; }
        .company-name { font-size: 22px; font-weight: bold; color: #1a1a2e; margin-bottom: 4px; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #4f46e5; letter-spacing: 1px; }
        .invoice-number { font-size: 14px; color: #64748b; margin-top: 4px; }

        /* Info Section */
        .info-section { display: table; width: 100%; margin-bottom: 30px; }
        .info-block { display: table-cell; width: 33%; vertical-align: top; }
        .info-label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 6px; }
        .info-value { font-size: 12px; color: #334155; }
        .info-value strong { color: #1a1a2e; }

        /* Status Badge */
        .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status-draft { background: #f1f5f9; color: #64748b; }
        .status-sent { background: #dbeafe; color: #2563eb; }
        .status-paid { background: #dcfce7; color: #16a34a; }
        .status-unpaid { background: #fef3c7; color: #d97706; }
        .status-overdue { background: #fee2e2; color: #dc2626; }
        .status-cancelled { background: #f1f5f9; color: #64748b; }

        /* Items Table */
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .items-table thead th {
            background: #4f46e5;
            color: #ffffff;
            padding: 10px 12px;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
        }
        .items-table thead th:first-child { border-radius: 6px 0 0 0; }
        .items-table thead th:last-child { border-radius: 0 6px 0 0; text-align: right; }
        .items-table tbody td {
            padding: 10px 12px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 11px;
        }
        .items-table tbody tr:last-child td { border-bottom: none; }
        .items-table .text-right { text-align: right; }
        .items-table .item-name { font-weight: 600; color: #1a1a2e; }
        .items-table .item-desc { color: #94a3b8; font-size: 10px; margin-top: 2px; }

        /* Totals */
        .totals-section { display: table; width: 100%; margin-bottom: 30px; }
        .totals-spacer { display: table-cell; width: 55%; }
        .totals-box { display: table-cell; width: 45%; }
        .totals-table { width: 100%; }
        .totals-table td { padding: 6px 12px; font-size: 12px; }
        .totals-table .label { color: #64748b; }
        .totals-table .value { text-align: right; font-weight: 500; }
        .totals-table .total-row td {
            border-top: 2px solid #4f46e5;
            font-size: 16px;
            font-weight: bold;
            color: #4f46e5;
            padding-top: 10px;
        }

        /* Notes */
        .notes-section {
            background: #f8fafc;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 30px;
        }
        .notes-title { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 6px; }
        .notes-text { font-size: 11px; color: #475569; }

        /* Footer */
        .footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <div class="invoice-wrapper">
        {{-- Header --}}
        <div class="header">
            <div class="header-left">
                @if($settings->company_name)
                    <div class="company-name">{{ $settings->company_name }}</div>
                @endif
            </div>
            <div class="header-right">
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-number">{{ $invoice->invoice_number }}</div>
                <div style="margin-top: 8px;">
                    <span class="status-badge status-{{ $invoice->status }}">{{ ucfirst($invoice->status) }}</span>
                </div>
            </div>
        </div>

        {{-- Info Section --}}
        <div class="info-section">
            <div class="info-block">
                <div class="info-label">Bill To</div>
                <div class="info-value">
                    <strong>{{ $invoice->client->name }}</strong><br>
                    @if($invoice->client->company_name){{ $invoice->client->company_name }}<br>@endif
                    @if($invoice->client->email){{ $invoice->client->email }}<br>@endif
                    @if($invoice->client->phone){{ $invoice->client->phone }}<br>@endif
                    @if($invoice->client->address){{ $invoice->client->address }}@endif
                </div>
            </div>
            <div class="info-block">
                <div class="info-label">Invoice Date</div>
                <div class="info-value">{{ \Carbon\Carbon::parse($invoice->invoice_date)->format('M d, Y') }}</div>
                <br>
                <div class="info-label">Due Date</div>
                <div class="info-value">{{ \Carbon\Carbon::parse($invoice->due_date)->format('M d, Y') }}</div>
            </div>
            <div class="info-block" style="text-align: right;">
                <div class="info-label">Amount Due</div>
                <div style="font-size: 24px; font-weight: bold; color: #4f46e5;">
                    {{ $settings->currency }} {{ number_format($invoice->total_amount, 2) }}
                </div>
            </div>
        </div>

        {{-- Items Table --}}
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 30%;">Item</th>
                    <th style="width: 20%;">Description</th>
                    <th class="text-right" style="width: 10%;">Qty</th>
                    <th class="text-right" style="width: 15%;">Rate</th>
                    <th class="text-right" style="width: 10%;">Tax</th>
                    <th class="text-right" style="width: 10%;">Discount</th>
                    <th class="text-right" style="width: 15%;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->items as $item)
                <tr>
                    <td>
                        <div class="item-name">{{ $item->name }}</div>
                    </td>
                    <td>
                        <div class="item-desc">{{ $item->description ?: '-' }}</div>
                    </td>
                    <td class="text-right">{{ $item->quantity }}</td>
                    <td class="text-right">{{ $settings->currency }} {{ number_format($item->rate, 2) }}</td>
                    <td class="text-right">{{ $settings->currency }} {{ number_format($item->tax, 2) }}</td>
                    <td class="text-right">{{ $settings->currency }} {{ number_format($item->discount, 2) }}</td>
                    <td class="text-right" style="font-weight: 600;">{{ $settings->currency }} {{ number_format($item->subtotal, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        {{-- Totals --}}
        <div class="totals-section">
            <div class="totals-spacer"></div>
            <div class="totals-box">
                <table class="totals-table">
                    <tr>
                        <td class="label">Subtotal</td>
                        <td class="value">{{ $settings->currency }} {{ number_format($invoice->subtotal, 2) }}</td>
                    </tr>
                    <tr>
                        <td class="label">Tax</td>
                        <td class="value">{{ $settings->currency }} {{ number_format($invoice->tax_amount, 2) }}</td>
                    </tr>
                    <tr>
                        <td class="label">Discount</td>
                        <td class="value">-{{ $settings->currency }} {{ number_format($invoice->discount_amount, 2) }}</td>
                    </tr>
                    <tr class="total-row">
                        <td>Total</td>
                        <td class="value">{{ $settings->currency }} {{ number_format($invoice->total_amount, 2) }}</td>
                    </tr>
                </table>
            </div>
        </div>

        {{-- Notes --}}
        @if($invoice->notes)
        <div class="notes-section">
            <div class="notes-title">Notes</div>
            <div class="notes-text">{{ $invoice->notes }}</div>
        </div>
        @endif

        {{-- Footer --}}
        <div class="footer">
            @if($settings->footer_note)
                <p style="margin-bottom: 8px; color: #475569;">{{ $settings->footer_note }}</p>
            @endif
            <p>Generated on {{ now()->format('M d, Y \a\t h:i A') }}</p>
        </div>
    </div>
</body>
</html>
