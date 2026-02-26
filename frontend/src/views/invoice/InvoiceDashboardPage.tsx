'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/api/axios';
import { InvoiceDashboardStats, INVOICE_STATUSES } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { FileText, DollarSign, AlertTriangle, CheckCircle2, Clock, Plus, ArrowRight, TrendingUp, Receipt } from 'lucide-react';
import { format } from 'date-fns';

export function InvoiceDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<InvoiceDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<InvoiceDashboardStats>('/invoice-reports/dashboard')
      .then(res => setStats(res.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const s = INVOICE_STATUSES.find(s => s.value === status);
    return (
      <Badge variant="outline" className="text-xs" style={{ backgroundColor: s?.color + '18', color: s?.color, borderColor: s?.color + '40' }}>
        {s?.label || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: 'Total Invoices', value: stats.total_invoices, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Paid', value: stats.paid_invoices, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Unpaid', value: stats.unpaid_invoices, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Overdue', value: stats.overdue_invoices, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  // Build monthly revenue chart data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = months.map((m, i) => ({
    month: m,
    revenue: Number(stats.monthly_revenue[i + 1] || 0),
  }));
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoice Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your invoicing activity</p>
        </div>
        <Button onClick={() => router.push('/invoice/create')} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> New Invoice
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <Card key={card.label} className="border-0 shadow-md">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(stats.total_revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(stats.total_outstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Chart */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly Revenue ({new Date().getFullYear()})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-48">
            {monthlyData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {d.revenue > 0 ? formatCurrency(d.revenue) : ''}
                </span>
                <div
                  className="w-full rounded-t-md bg-brand-500/80 transition-all duration-500 min-h-[2px]"
                  style={{ height: `${Math.max((d.revenue / maxRevenue) * 160, 2)}px` }}
                />
                <span className="text-[10px] text-muted-foreground">{d.month}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/invoice')} className="cursor-pointer text-brand-600">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recent_invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No invoices yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Invoice</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Client</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_invoices.map(inv => (
                  <tr
                    key={inv.id}
                    className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/invoice/${inv.id}`)}
                  >
                    <td className="px-4 py-3 text-sm font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{inv.client?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(Number(inv.total_amount))}</td>
                    <td className="px-4 py-3">{getStatusBadge(inv.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
