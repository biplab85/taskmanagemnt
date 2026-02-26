'use client';

import { useState, useEffect } from 'react';
import api from '@/api/axios';
import { InvoiceSetting } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Settings, Building2, DollarSign, FileText, Save } from 'lucide-react';

export function InvoiceSettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    currency: 'USD',
    tax_percentage: '0',
    invoice_prefix: 'INV-',
    footer_note: '',
  });

  useEffect(() => {
    api.get<InvoiceSetting>('/invoice-settings').then(res => {
      const s = res.data;
      setForm({
        company_name: s.company_name || '',
        currency: s.currency || 'USD',
        tax_percentage: String(s.tax_percentage || 0),
        invoice_prefix: s.invoice_prefix || 'INV-',
        footer_note: s.footer_note || '',
      });
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load settings');
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/invoice-settings', {
        company_name: form.company_name || null,
        currency: form.currency,
        tax_percentage: Number(form.tax_percentage),
        invoice_prefix: form.invoice_prefix,
        footer_note: form.footer_note || null,
      });
      toast.success('Invoice settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoice Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your invoice defaults and company info</p>
      </div>

      {/* Company Info */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-brand-500" /> Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              value={form.company_name}
              onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              placeholder="Your Company Name"
              disabled={!isAdmin}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Defaults */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-brand-500" /> Invoice Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Invoice Prefix</Label>
              <Input
                value={form.invoice_prefix}
                onChange={e => setForm(f => ({ ...f, invoice_prefix: e.target.value }))}
                placeholder="INV-"
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">e.g. INV-00001</p>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                placeholder="USD"
                disabled={!isAdmin}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Default Tax Percentage (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={form.tax_percentage}
              onChange={e => setForm(f => ({ ...f, tax_percentage: e.target.value }))}
              disabled={!isAdmin}
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-brand-500" /> Footer Note
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.footer_note}
            onChange={e => setForm(f => ({ ...f, footer_note: e.target.value }))}
            placeholder="Thank you for your business!"
            rows={3}
            disabled={!isAdmin}
          />
          <p className="text-xs text-muted-foreground mt-1">This note appears at the bottom of every invoice PDF</p>
        </CardContent>
      </Card>

      {/* Save */}
      {isAdmin && (
        <div className="flex justify-end pb-6">
          <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
            <Save className="mr-2 h-4 w-4" /> Save Settings
          </Button>
        </div>
      )}

      {!isAdmin && (
        <p className="text-sm text-muted-foreground text-center py-4">Only admins can modify invoice settings.</p>
      )}
    </div>
  );
}
