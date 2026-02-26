<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoiceSettingRequest;
use App\Models\InvoiceSetting;
use Illuminate\Http\Request;

class InvoiceSettingController extends Controller
{
    public function show()
    {
        return response()->json(InvoiceSetting::getSettings());
    }

    public function update(StoreInvoiceSettingRequest $request)
    {
        $settings = InvoiceSetting::getSettings();

        if ($request->hasFile('company_logo')) {
            $path = $request->file('company_logo')->store('invoice-logos', 'public');
            $settings->company_logo = $path;
        }

        $settings->update($request->only([
            'company_name', 'currency', 'tax_percentage', 'invoice_prefix', 'footer_note',
        ]));

        return response()->json($settings);
    }
}
