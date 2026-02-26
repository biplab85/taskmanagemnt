<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Clients table
        if (!Schema::hasTable('clients')) {
            Schema::create('clients', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('company_name')->nullable();
                $table->string('email')->nullable();
                $table->string('phone')->nullable();
                $table->text('address')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
                $table->index('created_by');
            });
        }

        // Invoice settings table
        if (!Schema::hasTable('invoice_settings')) {
            Schema::create('invoice_settings', function (Blueprint $table) {
                $table->id();
                $table->string('company_name')->nullable();
                $table->string('company_logo')->nullable();
                $table->string('currency')->default('USD');
                $table->decimal('tax_percentage', 5, 2)->default(0);
                $table->string('invoice_prefix')->default('INV-');
                $table->text('footer_note')->nullable();
                $table->timestamps();
            });
        }

        // Invoices table
        if (!Schema::hasTable('invoices')) {
            Schema::create('invoices', function (Blueprint $table) {
                $table->id();
                $table->string('invoice_number', 50)->unique();
                $table->unsignedBigInteger('client_id');
                $table->date('invoice_date');
                $table->date('due_date');
                $table->enum('status', ['draft', 'sent', 'paid', 'unpaid', 'overdue', 'cancelled'])->default('draft');
                $table->decimal('subtotal', 12, 2)->default(0);
                $table->decimal('tax_amount', 12, 2)->default(0);
                $table->decimal('discount_amount', 12, 2)->default(0);
                $table->decimal('total_amount', 12, 2)->default(0);
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();
                $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
                $table->index('status');
                $table->index('client_id');
                $table->index('created_by');
                $table->index('due_date');
            });
        }

        // Invoice items table
        if (!Schema::hasTable('invoice_items')) {
            Schema::create('invoice_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('invoice_id');
                $table->string('name');
                $table->text('description')->nullable();
                $table->integer('quantity')->default(1);
                $table->decimal('rate', 12, 2)->default(0);
                $table->decimal('tax', 12, 2)->default(0);
                $table->decimal('discount', 12, 2)->default(0);
                $table->decimal('subtotal', 12, 2)->default(0);
                $table->timestamps();

                $table->foreign('invoice_id')->references('id')->on('invoices')->cascadeOnDelete();
                $table->index('invoice_id');
            });
        }

        // Payments table
        if (!Schema::hasTable('payments')) {
            Schema::create('payments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('invoice_id');
                $table->enum('payment_method', ['cash', 'bank_transfer', 'mobile_banking'])->default('cash');
                $table->date('payment_date');
                $table->string('transaction_id')->nullable();
                $table->decimal('amount', 12, 2)->default(0);
                $table->enum('status', ['pending', 'paid', 'failed', 'refunded'])->default('pending');
                $table->timestamps();

                $table->foreign('invoice_id')->references('id')->on('invoices')->cascadeOnDelete();
                $table->index('invoice_id');
                $table->index('status');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('invoice_settings');
        Schema::dropIfExists('clients');
    }
};
