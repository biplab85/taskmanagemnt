'use client';

import { useState, useEffect } from 'react';
import api from '@/api/axios';
import type { LeaveType, Holiday, User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Settings,
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  Users,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export function LeaveSettingsPage() {
  // Leave Types
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [typeDialog, setTypeDialog] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeMaxDays, setTypeMaxDays] = useState('0');
  const [typeIsPaid, setTypeIsPaid] = useState(true);
  const [typeCarryForward, setTypeCarryForward] = useState(false);
  const [typeIsActive, setTypeIsActive] = useState(true);
  const [typeDescription, setTypeDescription] = useState('');
  const [typeSaving, setTypeSaving] = useState(false);

  // Holidays
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayDialog, setHolidayDialog] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayRecurring, setHolidayRecurring] = useState(false);
  const [holidaySaving, setHolidaySaving] = useState(false);

  // Balance initialization
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [balanceDays, setBalanceDays] = useState('');
  const [balanceYear, setBalanceYear] = useState(String(new Date().getFullYear()));
  const [initYear, setInitYear] = useState(String(new Date().getFullYear()));

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [typesRes, holidaysRes, usersRes] = await Promise.all([
        api.get<LeaveType[]>('/leave-types'),
        api.get<Holiday[]>('/holidays'),
        api.get<User[]>('/users-list'),
      ]);
      setLeaveTypes(typesRes.data);
      setHolidays(holidaysRes.data);
      setUsers(usersRes.data);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // ---- Leave Type CRUD ----
  const resetTypeForm = () => {
    setTypeName('');
    setTypeMaxDays('0');
    setTypeIsPaid(true);
    setTypeCarryForward(false);
    setTypeIsActive(true);
    setTypeDescription('');
    setEditingType(null);
  };

  const openCreateType = () => { resetTypeForm(); setTypeDialog(true); };

  const openEditType = (t: LeaveType) => {
    setEditingType(t);
    setTypeName(t.name);
    setTypeMaxDays(String(t.max_days));
    setTypeIsPaid(t.is_paid);
    setTypeCarryForward(t.carry_forward);
    setTypeIsActive(t.is_active);
    setTypeDescription(t.description || '');
    setTypeDialog(true);
  };

  const handleSaveType = async () => {
    if (!typeName.trim()) { toast.error('Name is required'); return; }
    setTypeSaving(true);
    const payload = {
      name: typeName,
      max_days: parseInt(typeMaxDays) || 0,
      is_paid: typeIsPaid,
      carry_forward: typeCarryForward,
      is_active: typeIsActive,
      description: typeDescription || null,
    };
    try {
      if (editingType) {
        await api.put(`/leave-types/${editingType.id}`, payload);
        toast.success('Leave type updated');
      } else {
        await api.post('/leave-types', payload);
        toast.success('Leave type created');
      }
      setTypeDialog(false);
      resetTypeForm();
      fetchAll();
    } catch {
      toast.error('Failed to save leave type');
    } finally {
      setTypeSaving(false);
    }
  };

  const handleDeleteType = async (id: number) => {
    try {
      await api.delete(`/leave-types/${id}`);
      setLeaveTypes((prev) => prev.filter((t) => t.id !== id));
      toast.success('Leave type deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ---- Holiday CRUD ----
  const resetHolidayForm = () => {
    setHolidayName('');
    setHolidayDate('');
    setHolidayRecurring(false);
    setEditingHoliday(null);
  };

  const openCreateHoliday = () => { resetHolidayForm(); setHolidayDialog(true); };

  const openEditHoliday = (h: Holiday) => {
    setEditingHoliday(h);
    setHolidayName(h.name);
    setHolidayDate(h.date.slice(0, 10));
    setHolidayRecurring(h.is_recurring);
    setHolidayDialog(true);
  };

  const handleSaveHoliday = async () => {
    if (!holidayName.trim() || !holidayDate) { toast.error('Name and date required'); return; }
    setHolidaySaving(true);
    const payload = { name: holidayName, date: holidayDate, is_recurring: holidayRecurring };
    try {
      if (editingHoliday) {
        await api.put(`/holidays/${editingHoliday.id}`, payload);
        toast.success('Holiday updated');
      } else {
        await api.post('/holidays', payload);
        toast.success('Holiday created');
      }
      setHolidayDialog(false);
      resetHolidayForm();
      fetchAll();
    } catch {
      toast.error('Failed to save holiday');
    } finally {
      setHolidaySaving(false);
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    try {
      await api.delete(`/holidays/${id}`);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      toast.success('Holiday deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ---- Balance ----
  const handleSetBalance = async () => {
    if (!selectedUserId || !selectedLeaveTypeId || !balanceDays) {
      toast.error('All fields required');
      return;
    }
    try {
      await api.post('/leave-balances', {
        user_id: parseInt(selectedUserId),
        leave_type_id: parseInt(selectedLeaveTypeId),
        year: parseInt(balanceYear),
        total_days: parseFloat(balanceDays),
      });
      toast.success('Balance updated');
      setBalanceDays('');
    } catch {
      toast.error('Failed to update balance');
    }
  };

  const handleInitYear = async () => {
    try {
      const res = await api.post('/leave-balances/initialize', { year: parseInt(initYear) });
      toast.success(res.data.message);
    } catch {
      toast.error('Failed to initialize balances');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/leave">
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Settings className="h-5 w-5 text-brand-600" />
        <h1 className="text-xl font-bold tracking-tight">Leave Settings</h1>
      </div>

      {/* Leave Types */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-brand-500" />
              Leave Types
            </CardTitle>
            <Button size="sm" onClick={openCreateType} className="bg-brand-600 hover:bg-brand-700 gap-1.5 cursor-pointer">
              <Plus className="h-3.5 w-3.5" /> New Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {leaveTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No leave types configured</p>
          ) : (
            <div className="space-y-2">
              {leaveTypes.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{t.name}</span>
                      <span className="text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full px-1.5 py-0.5">
                        {t.max_days} days
                      </span>
                      {t.is_paid && (
                        <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full px-1.5 py-0.5">
                          Paid
                        </span>
                      )}
                      {t.carry_forward && (
                        <span className="text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 rounded-full px-1.5 py-0.5">
                          Carry Forward
                        </span>
                      )}
                      {!t.is_active && (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-full px-1.5 py-0.5">
                          Inactive
                        </span>
                      )}
                    </div>
                    {t.description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditType(t)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteType(t.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-red-600 hover:bg-muted cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Holidays */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-brand-500" />
              Public Holidays
            </CardTitle>
            <Button size="sm" onClick={openCreateHoliday} className="bg-brand-600 hover:bg-brand-700 gap-1.5 cursor-pointer">
              <Plus className="h-3.5 w-3.5" /> Add Holiday
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No holidays configured</p>
          ) : (
            <div className="space-y-2">
              {holidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 hover:bg-muted/30 transition-colors">
                  <div>
                    <span className="text-sm font-semibold">{h.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {h.is_recurring && (
                      <span className="text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full px-1.5 py-0.5 ml-2">
                        Recurring
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditHoliday(h)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteHoliday(h.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-red-600 hover:bg-muted cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Balance Management */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-brand-500" />
            Leave Balance Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Set Individual Balance */}
          <div>
            <Label className="text-xs font-semibold">Set Individual Balance</Label>
            <div className="flex items-end gap-2 mt-2">
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground">User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)} className="text-xs">{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Label className="text-[10px] text-muted-foreground">Leave Type</Label>
                <Select value={selectedLeaveTypeId} onValueChange={setSelectedLeaveTypeId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)} className="text-xs">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-20">
                <Label className="text-[10px] text-muted-foreground">Year</Label>
                <Input className="h-8 text-xs" value={balanceYear} onChange={(e) => setBalanceYear(e.target.value)} />
              </div>
              <div className="w-20">
                <Label className="text-[10px] text-muted-foreground">Days</Label>
                <Input className="h-8 text-xs" type="number" value={balanceDays} onChange={(e) => setBalanceDays(e.target.value)} />
              </div>
              <Button size="sm" onClick={handleSetBalance} className="bg-brand-600 hover:bg-brand-700 h-8 cursor-pointer">
                Set
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-xs font-semibold">Initialize Year Balances</Label>
            <p className="text-[10px] text-muted-foreground mb-2">
              Create balances for all users based on leave type defaults. Includes carry-forward from previous year.
            </p>
            <div className="flex items-center gap-2">
              <Input className="h-8 text-xs w-24" value={initYear} onChange={(e) => setInitYear(e.target.value)} />
              <Button size="sm" onClick={handleInitYear} className="bg-brand-600 hover:bg-brand-700 gap-1.5 h-8 cursor-pointer">
                <RefreshCw className="h-3 w-3" /> Initialize
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Type Dialog */}
      <Dialog open={typeDialog} onOpenChange={setTypeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit' : 'New'} Leave Type</DialogTitle>
            <DialogDescription>Configure a leave type for employees</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="e.g., Sick Leave" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Max Days / Year</Label>
                <Input type="number" value={typeMaxDays} onChange={(e) => setTypeMaxDays(e.target.value)} min="0" />
              </div>
              <div className="space-y-2 pt-5">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isPaid" checked={typeIsPaid} onChange={(e) => setTypeIsPaid(e.target.checked)} className="rounded" />
                  <Label htmlFor="isPaid" className="text-xs cursor-pointer">Paid Leave</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="carryForward" checked={typeCarryForward} onChange={(e) => setTypeCarryForward(e.target.checked)} className="rounded" />
                  <Label htmlFor="carryForward" className="text-xs cursor-pointer">Carry Forward</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={typeIsActive} onChange={(e) => setTypeIsActive(e.target.checked)} className="rounded" />
                  <Label htmlFor="isActive" className="text-xs cursor-pointer">Active</Label>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={typeDescription} onChange={(e) => setTypeDescription(e.target.value)} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialog(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleSaveType} disabled={typeSaving} className="bg-brand-600 hover:bg-brand-700 cursor-pointer">
              {typeSaving ? 'Saving...' : editingType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holiday Dialog */}
      <Dialog open={holidayDialog} onOpenChange={setHolidayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Edit' : 'New'} Holiday</DialogTitle>
            <DialogDescription>Add a public holiday to the calendar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Holiday Name</Label>
              <Input value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="e.g., Independence Day" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="recurring" checked={holidayRecurring} onChange={(e) => setHolidayRecurring(e.target.checked)} className="rounded" />
              <Label htmlFor="recurring" className="text-xs cursor-pointer">Recurring every year</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHolidayDialog(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleSaveHoliday} disabled={holidaySaving} className="bg-brand-600 hover:bg-brand-700 cursor-pointer">
              {holidaySaving ? 'Saving...' : editingHoliday ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
