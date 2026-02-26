'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/api/axios';
import { Client, Invoice, InvoiceItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Save, Send, FileText } from 'lucide-react';

interface Props {
  editId?: number;
}

const emptyItem: Omit<InvoiceItem, 'id' | 'invoice_id'> = {
  name: '',
  description: null,
  quantity: 1,
  rate: 0,
  tax: 0,
  discount: 0,
  subtotal: 0,
};

export function InvoiceFormPage({ editId }: Props) {
  const router = useRouter();
  const isEdit = !!editId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  const [clientId, setClientId] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Omit<InvoiceItem, 'id' | 'invoice_id'>[]>([{ ...emptyItem }]);

  useEffect(() => {
    // Set default due date to 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().split('T')[0]);

    api.get<Client[]>('/clients').then(res => setClients(res.data));

    if (editId) {
      api.get<Invoice>(`/invoices/${editId}`).then(res => {
        const inv = res.data;
        setClientId(String(inv.client_id));
        setInvoiceDate(inv.invoice_date);
        setDueDate(inv.due_date);
        setNotes(inv.notes || '');
        if (inv.items && inv.items.length > 0) {
          setItems(inv.items.map(i => ({
            name: i.name,
            description: i.description,
            quantity: i.quantity,
            rate: Number(i.rate),
            tax: Number(i.tax),
            discount: Number(i.discount),
            subtotal: Number(i.subtotal),
          })));
        }
        setLoading(false);
      });
    }
  }, [editId]);

  const updateItem = (index: number, field: string, value: string | number) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Recalculate subtotal
      const item = updated[index];
      item.subtotal = (item.quantity * item.rate) + item.tax - item.discount;
      return updated;
    });
  };

  const addItem = () => setItems(prev => [...prev, { ...emptyItem }]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalSubtotal = items.reduce((sum, i) => sum + (i.quantity * i.rate), 0);
  const totalTax = items.reduce((sum, i) => sum + i.tax, 0);
  const totalDiscount = items.reduce((sum, i) => sum + i.discount, 0);
  const totalAmount = totalSubtotal + totalTax - totalDiscount;

  const handleSubmit = async (status: 'draft' | 'sent' = 'draft') => {
    if (!clientId) { toast.error('Please select a client'); return; }
    if (!invoiceDate || !dueDate) { toast.error('Please set invoice and due dates'); return; }
    if (items.some(i => !i.name)) { toast.error('All items must have a name'); return; }

    setSaving(true);
    try {
      const payload = {
        client_id: Number(clientId),
        invoice_date: invoiceDate,
        due_date: dueDate,
        status,
        notes: notes || null,
        items: items.map(i => ({
          name: i.name,
          description: i.description,
          quantity: i.quantity,
          rate: i.rate,
          tax: i.tax,
          discount: i.discount,
        })),
      };

      if (isEdit) {
        await api.put(`/invoices/${editId}`, payload);
        toast.success('Invoice updated');
      } else {
        await api.post('/invoices', payload);
        toast.success(`Invoice ${status === 'sent' ? 'created & sent' : 'saved as draft'}`);
      }
      router.push('/invoice');
    } catch {
      toast.error('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isEdit ? 'Edit Invoice' : 'Create Invoice'}</h1>
          <p className="text-sm text-muted-foreground mt-1">Fill in the details below</p>
        </div>
      </div>

      {/* Invoice Details */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-brand-500" />
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={String(c.id)} className="cursor-pointer">
                      {c.name} {c.company_name ? `(${c.company_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div />
            <div className="space-y-2">
              <Label>Invoice Date *</Label>
              <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-500" />
              Line Items
            </span>
            <Button variant="outline" size="sm" onClick={addItem} className="cursor-pointer">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Header */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
            <div className="col-span-3">Item Name</div>
            <div className="col-span-2">Description</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-2">Rate</div>
            <div className="col-span-1">Tax</div>
            <div className="col-span-1">Discount</div>
            <div className="col-span-1">Subtotal</div>
            <div className="col-span-1" />
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start p-3 rounded-lg bg-muted/30">
              <div className="sm:col-span-3">
                <Input
                  placeholder="Item name"
                  value={item.name}
                  onChange={e => updateItem(idx, 'name', e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  placeholder="Description"
                  value={item.description || ''}
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="sm:col-span-1">
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                  className="text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.rate}
                  onChange={e => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
              <div className="sm:col-span-1">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.tax}
                  onChange={e => updateItem(idx, 'tax', parseFloat(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
              <div className="sm:col-span-1">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.discount}
                  onChange={e => updateItem(idx, 'discount', parseFloat(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
              <div className="sm:col-span-1 flex items-center">
                <span className="text-sm font-semibold">
                  ${((item.quantity * item.rate) + item.tax - item.discount).toFixed(2)}
                </span>
              </div>
              <div className="sm:col-span-1 flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(idx)}
                  disabled={items.length <= 1}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Totals */}
          <div className="flex justify-end pt-4 border-t">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${totalSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>${totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-${totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => router.back()} className="cursor-pointer">
          Cancel
        </Button>
        <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={saving} className="cursor-pointer">
          <Save className="mr-2 h-4 w-4" /> Save Draft
        </Button>
        <Button onClick={() => handleSubmit('sent')} disabled={saving} className="cursor-pointer">
          <Send className="mr-2 h-4 w-4" /> {isEdit ? 'Update & Send' : 'Create & Send'}
        </Button>
      </div>
    </div>
  );
}
