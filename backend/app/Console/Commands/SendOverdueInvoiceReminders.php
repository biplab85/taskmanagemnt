<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Notification;
use Illuminate\Console\Command;

class SendOverdueInvoiceReminders extends Command
{
    protected $signature = 'invoices:send-overdue-reminders';
    protected $description = 'Mark overdue invoices and send reminder notifications';

    public function handle(): int
    {
        $overdueInvoices = Invoice::whereIn('status', ['sent', 'unpaid'])
            ->where('due_date', '<', now()->toDateString())
            ->get();

        $count = 0;

        foreach ($overdueInvoices as $invoice) {
            $invoice->update(['status' => 'overdue']);

            if ($invoice->created_by) {
                Notification::create([
                    'user_id' => $invoice->created_by,
                    'title' => 'Invoice Overdue',
                    'message' => "Invoice {$invoice->invoice_number} is overdue (due {$invoice->due_date->format('M d, Y')})",
                    'type' => 'invoice_overdue',
                ]);
            }

            $count++;
        }

        $this->info("Marked {$count} invoices as overdue and sent reminders.");

        return self::SUCCESS;
    }
}
