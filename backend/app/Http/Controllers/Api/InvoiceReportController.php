<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceReportController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = auth()->user();
        $query = Invoice::query();

        if (!$user->isAdmin()) {
            $query->where('created_by', $user->id);
        }

        $totalInvoices = (clone $query)->count();
        $paidInvoices = (clone $query)->where('status', 'paid')->count();
        $unpaidInvoices = (clone $query)->where('status', 'unpaid')->count();
        $overdueInvoices = (clone $query)->where('status', 'overdue')->count();
        $draftInvoices = (clone $query)->where('status', 'draft')->count();

        $totalRevenue = (clone $query)->where('status', 'paid')->sum('total_amount');
        $totalOutstanding = (clone $query)->whereIn('status', ['sent', 'unpaid', 'overdue'])->sum('total_amount');

        // Monthly revenue for current year
        $monthlyRevenue = Invoice::where('status', 'paid')
            ->whereYear('invoice_date', now()->year)
            ->when(!$user->isAdmin(), fn($q) => $q->where('created_by', $user->id))
            ->select(
                DB::raw('MONTH(invoice_date) as month'),
                DB::raw('SUM(total_amount) as revenue')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->pluck('revenue', 'month');

        // Yearly revenue
        $yearlyRevenue = Invoice::where('status', 'paid')
            ->when(!$user->isAdmin(), fn($q) => $q->where('created_by', $user->id))
            ->select(
                DB::raw('YEAR(invoice_date) as year'),
                DB::raw('SUM(total_amount) as revenue')
            )
            ->groupBy('year')
            ->orderBy('year')
            ->get();

        // Recent invoices
        $recentInvoices = Invoice::with(['client:id,name,company_name'])
            ->when(!$user->isAdmin(), fn($q) => $q->where('created_by', $user->id))
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'total_invoices' => $totalInvoices,
            'paid_invoices' => $paidInvoices,
            'unpaid_invoices' => $unpaidInvoices,
            'overdue_invoices' => $overdueInvoices,
            'draft_invoices' => $draftInvoices,
            'total_revenue' => (float) $totalRevenue,
            'total_outstanding' => (float) $totalOutstanding,
            'monthly_revenue' => $monthlyRevenue,
            'yearly_revenue' => $yearlyRevenue,
            'recent_invoices' => $recentInvoices,
        ]);
    }
}
