'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/api/axios';
import { Invoice, INVOICE_STATUSES, Payment, PAYMENT_METHODS, PAYMENT_STATUSES } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Copy, Printer, Download, CreditCard, FileText, Building2, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  id: number;
}

export function InvoiceDetailPage({ id }: Props) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'cash' as string,
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: '',
    amount: '',
    status: 'paid' as string,
  });

  const fetchInvoice = async () => {
    try {
      const res = await api.get<Invoice>(`/invoices/${id}`);
      setInvoice(res.data);
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleStatusChange = async (status: string) => {
    try {
      await api.put(`/invoices/${id}/status`, { status });
      toast.success('Status updated');
      fetchInvoice();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleAddPayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setPaymentSaving(true);
    try {
      await api.post('/payments', {
        invoice_id: id,
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        transaction_id: paymentForm.transaction_id || null,
        amount: Number(paymentForm.amount),
        status: paymentForm.status,
      });
      toast.success('Payment recorded');
      setPaymentDialog(false);
      setPaymentForm({
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        transaction_id: '',
        amount: '',
        status: 'paid',
      });
      fetchInvoice();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoice?.invoice_number || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const s = INVOICE_STATUSES.find(s => s.value === status);
    return (
      <Badge variant="outline" className="text-xs font-medium" style={{ backgroundColor: s?.color + '18', color: s?.color, borderColor: s?.color + '40' }}>
        {s?.label || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-muted-foreground">Invoice not found</p>
        <Button onClick={() => router.push('/invoice')} className="mt-4 cursor-pointer">Back to Invoices</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/invoice')} className="cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{invoice.invoice_number}</h1>
              {getStatusBadge(invoice.status)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Created {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloading} className="cursor-pointer">
            {downloading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="cursor-pointer">
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/invoice/${id}/edit`)} className="cursor-pointer">
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>
          <Button size="sm" onClick={() => setPaymentDialog(true)} className="cursor-pointer">
            <CreditCard className="mr-1 h-4 w-4" /> Record Payment
          </Button>
        </div>
      </div>

      {/* Status Change & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-brand-500" /> Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{invoice.client?.name}</p>
            {invoice.client?.company_name && <p className="text-muted-foreground">{invoice.client.company_name}</p>}
            {invoice.client?.email && <p className="text-muted-foreground">{invoice.client.email}</p>}
            {invoice.client?.phone && <p className="text-muted-foreground">{invoice.client.phone}</p>}
            {invoice.client?.address && <p className="text-muted-foreground mt-2">{invoice.client.address}</p>}
          </CardContent>
        </Card>

        {/* Dates */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-brand-500" /> Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Date</span>
              <span className="font-medium">{format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span className="font-medium">{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</span>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs">Change Status</Label>
              <Select value={invoice.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value} className="cursor-pointer">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Amounts */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-brand-500" /> Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(Number(invoice.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(Number(invoice.tax_amount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatCurrency(Number(invoice.discount_amount))}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(Number(invoice.total_amount))}</span>
            </div>
            {invoice.total_paid !== undefined && (
              <>
                <div className="flex justify-between text-emerald-600">
                  <span>Paid</span>
                  <span>{formatCurrency(Number(invoice.total_paid))}</span>
                </div>
                <div className="flex justify-between font-semibold text-amber-600">
                  <span>Balance Due</span>
                  <span>{formatCurrency(Number(invoice.balance_due))}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-brand-500" /> Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Item</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Description</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Qty</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Rate</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Tax</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Discount</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{item.description || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(Number(item.rate))}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(Number(item.tax))}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(Number(item.discount))}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(Number(item.subtotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-brand-500" /> Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Method</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Transaction ID</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => {
                  const ps = PAYMENT_STATUSES.find(s => s.value === payment.status);
                  return (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-sm">{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</td>
                      <td className="px-4 py-3 text-sm capitalize">{payment.payment_method.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{payment.transaction_id || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(Number(payment.amount))}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs" style={{ backgroundColor: ps?.color + '18', color: ps?.color, borderColor: ps?.color + '40' }}>
                          {ps?.label || payment.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Add Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentForm.payment_method} onValueChange={v => setPaymentForm(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value} className="cursor-pointer">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={paymentForm.status} onValueChange={v => setPaymentForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value} className="cursor-pointer">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(p => ({ ...p, payment_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Transaction ID (optional)</Label>
              <Input value={paymentForm.transaction_id} onChange={e => setPaymentForm(p => ({ ...p, transaction_id: e.target.value }))} placeholder="e.g. TXN-123456" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleAddPayment} disabled={paymentSaving} className="cursor-pointer">Save Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
