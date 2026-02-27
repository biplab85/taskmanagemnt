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
            // Delete old logo if exists
            if ($settings->company_logo && \Storage::disk('public')->exists($settings->company_logo)) {
                \Storage::disk('public')->delete($settings->company_logo);
            }
            $path = $request->file('company_logo')->store('invoice-logos', 'public');
            $settings->company_logo = $path;
        } elseif ($request->boolean('remove_logo')) {
            if ($settings->company_logo && \Storage::disk('public')->exists($settings->company_logo)) {
                \Storage::disk('public')->delete($settings->company_logo);
            }
            $settings->company_logo = null;
        }

        $settings->update($request->only([
            'company_name', 'currency', 'tax_percentage', 'invoice_prefix', 'footer_note',
        ]));

        return response()->json($settings);
    }
}
