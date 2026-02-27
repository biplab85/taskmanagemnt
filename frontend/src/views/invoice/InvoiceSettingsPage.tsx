'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Settings, Building2, DollarSign, FileText, Save, Upload, X, Image } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function InvoiceSettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingLogo, setExistingLogo] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      if (s.company_logo) {
        setExistingLogo(`${API_BASE}/storage/${s.company_logo}`);
      }
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load settings');
      setLoading(false);
    });
  }, []);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }
    setLogoFile(file);
    setRemoveLogo(false);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('company_name', form.company_name || '');
      formData.append('currency', form.currency);
      formData.append('tax_percentage', form.tax_percentage);
      formData.append('invoice_prefix', form.invoice_prefix);
      formData.append('footer_note', form.footer_note || '');
      if (logoFile) {
        formData.append('company_logo', logoFile);
      }
      if (removeLogo) {
        formData.append('remove_logo', '1');
      }
      formData.append('_method', 'PUT');

      await api.post('/invoice-settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Invoice settings saved');
      if (logoFile) {
        setExistingLogo(logoPreview);
        setLogoFile(null);
      }
      if (removeLogo) {
        setExistingLogo(null);
        setRemoveLogo(false);
      }
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

          {/* Company Logo */}
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <p className="text-xs text-muted-foreground">Appears on invoice headers. Max 2MB (JPG, PNG, SVG).</p>
            <div className="flex items-start gap-4">
              {(logoPreview || (existingLogo && !removeLogo)) && (
                <div className="relative group shrink-0">
                  <div className="h-20 w-20 rounded-lg border bg-white flex items-center justify-center overflow-hidden p-1.5">
                    <img
                      src={logoPreview || existingLogo!}
                      alt="Company logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  {isAdmin && (
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
              {isAdmin && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/svg+xml"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {existingLogo && !removeLogo ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                </div>
              )}
              {!isAdmin && !existingLogo && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm h-20">
                  <Image className="h-5 w-5" /> No logo uploaded
                </div>
              )}
            </div>
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
