'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import { Payment, PAYMENT_METHODS, PAYMENT_STATUSES } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Search, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

export function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchPayments = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await api.get<Payment[]>('/payments', { params });
      setPayments(res.data);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment History</h1>
        <p className="text-sm text-muted-foreground mt-1">Track all payments across invoices</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground">Total Payments</p>
            <p className="text-2xl font-bold mt-1">{payments.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground">Total Received</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {payments.filter(p => p.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] cursor-pointer">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">All Statuses</SelectItem>
                {PAYMENT_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value} className="cursor-pointer">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" className="sm:w-[160px]" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" className="sm:w-[160px]" />
          </div>
        </CardContent>
      </Card>

      {/* Payment Table */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">No payments found</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">Payments will appear here when recorded</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Invoice</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Client</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Method</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Transaction ID</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const ps = PAYMENT_STATUSES.find(s => s.value === payment.status);
                    const pm = PAYMENT_METHODS.find(m => m.value === payment.payment_method);
                    return (
                      <tr key={payment.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-sm">{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</td>
                        <td className="px-4 py-3 text-sm font-medium">{payment.invoice?.invoice_number || '-'}</td>
                        <td className="px-4 py-3 text-sm">{payment.invoice?.client?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm">{pm?.label || payment.payment_method}</td>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
