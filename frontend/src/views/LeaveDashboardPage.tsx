'use client';

import { useState, useEffect } from 'react';
import api from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import type { LeaveRequest, LeaveType, LeaveBalance, LeaveStatus } from '@/types';
import { LEAVE_STATUSES } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CalendarDays,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarRange,
  Settings,
  FileText,
  Filter,
  Eye,
  Paperclip,
  User as UserIcon,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { sanitizeHtml } from '@/lib/sanitize';

function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const s = LEAVE_STATUSES.find((ls) => ls.value === status);
  const colorMap: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${colorMap[status] || ''}`}>
      {s?.label || status}
    </span>
  );
}

export function LeaveDashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Apply leave dialog
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [formLeaveTypeId, setFormLeaveTypeId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formIsHalfDay, setFormIsHalfDay] = useState(false);
  const [formHalfDayPeriod, setFormHalfDayPeriod] = useState('first_half');
  const [formReason, setFormReason] = useState('');
  const [formAttachment, setFormAttachment] = useState<File | null>(null);

  // Leave detail view (admin reads full reason here)
  const [detailLeave, setDetailLeave] = useState<LeaveRequest | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [actioning, setActioning] = useState(false);

  // Cancel confirm
  const [cancelId, setCancelId] = useState<number | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [leavesRes, typesRes, balancesRes, statsRes] = await Promise.all([
        api.get<LeaveRequest[]>('/leaves'),
        api.get<LeaveType[]>('/leave-types'),
        api.get<LeaveBalance[]>('/leave-balances'),
        api.get('/leave-reports/stats'),
      ]);
      setLeaves(leavesRes.data);
      setLeaveTypes(typesRes.data.filter((t) => t.is_active));
      setBalances(balancesRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormLeaveTypeId('');
    setFormStartDate('');
    setFormEndDate('');
    setFormIsHalfDay(false);
    setFormHalfDayPeriod('first_half');
    setFormReason('');
    setFormAttachment(null);
  };

  const handleApply = async () => {
    // Strip HTML tags to check if reason is truly empty
    const plainText = formReason.replace(/<[^>]*>/g, '').trim();
    if (!formLeaveTypeId || !formStartDate || !formEndDate || !plainText) {
      toast.error('Please fill all required fields');
      return;
    }
    setApplying(true);
    try {
      const formData = new FormData();
      formData.append('leave_type_id', formLeaveTypeId);
      formData.append('start_date', formStartDate);
      formData.append('end_date', formEndDate);
      formData.append('is_half_day', formIsHalfDay ? '1' : '0');
      if (formIsHalfDay) {
        formData.append('half_day_period', formHalfDayPeriod);
      }
      formData.append('reason', formReason);
      if (formAttachment) {
        formData.append('attachment', formAttachment);
      }

      await api.post('/leaves', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Leave request submitted');
      setApplyOpen(false);
      resetForm();
      fetchAll();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to apply leave');
    } finally {
      setApplying(false);
    }
  };

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!detailLeave) return;
    setActioning(true);
    try {
      await api.post(`/leaves/${detailLeave.id}/status`, {
        status,
        admin_comment: adminComment || null,
      });
      toast.success(`Leave ${status}`);
      setDetailLeave(null);
      setAdminComment('');
      fetchAll();
    } catch {
      toast.error('Failed to update leave');
    } finally {
      setActioning(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      await api.post(`/leaves/${cancelId}/cancel`);
      toast.success('Leave cancelled');
      setCancelId(null);
      fetchAll();
    } catch {
      toast.error('Failed to cancel leave');
    }
  };

  const openDetail = (leave: LeaveRequest) => {
    setDetailLeave(leave);
    setAdminComment('');
  };

  const filtered = leaves.filter((l) => {
    const matchesSearch =
      l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.leave_type?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.reason?.replace(/<[^>]*>/g, '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statCards = [
    { label: 'Total Requests', value: stats.total_requests || 0, icon: FileText, color: 'text-blue-500' },
    { label: 'Pending', value: stats.pending || 0, icon: Clock, color: 'text-amber-500' },
    { label: 'Approved', value: stats.approved || 0, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Rejected', value: stats.rejected || 0, icon: XCircle, color: 'text-red-500' },
  ];

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/30">
            <CalendarDays className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Leave Management</h1>
            <p className="text-sm text-muted-foreground">Apply, track, and manage leave requests</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leave/calendar">
            <Button variant="outline" className="gap-2 cursor-pointer">
              <CalendarRange className="h-4 w-4" /> Calendar
            </Button>
          </Link>
          {isAdmin && (
            <Link href="/leave/settings">
              <Button variant="outline" className="gap-2 cursor-pointer">
                <Settings className="h-4 w-4" /> Settings
              </Button>
            </Link>
          )}
          <Button onClick={() => setApplyOpen(true)} className="gap-2 bg-brand-600 hover:bg-brand-700 cursor-pointer">
            <Plus className="h-4 w-4" /> Apply Leave
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-20`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leave Balance Cards */}
      {balances.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Leave Balance ({new Date().getFullYear()})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {balances.map((b) => {
                const total = (b.total_days || 0) + (b.carried_forward || 0);
                const used = b.used_days || 0;
                const remaining = b.remaining_days ?? (total - used);
                const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
                return (
                  <div key={b.id} className="rounded-xl border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{b.leave_type?.name || 'Leave'}</span>
                      {b.leave_type?.is_paid && (
                        <span className="text-[9px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full px-1.5 py-0.5">Paid</span>
                      )}
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-lg font-bold">{remaining}</span>
                      <span className="text-xs text-muted-foreground mb-0.5">/ {total} days</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{used} used{b.carried_forward > 0 ? ` · ${b.carried_forward} carried` : ''}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leaves..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {LEAVE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leave List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No leave requests found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Apply for leave using the button above</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((leave) => {
            const reasonPreview = leave.reason?.replace(/<[^>]*>/g, ' ').trim().slice(0, 80);
            return (
              <Card
                key={leave.id}
                className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openDetail(leave)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {isAdmin && leave.user && (
                      <Avatar className="h-9 w-9 shrink-0">
                        {leave.user.avatar && <AvatarImage src={`/storage/${leave.user.avatar}`} />}
                        <AvatarFallback className="text-xs">{leave.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isAdmin && leave.user && (
                          <span className="text-sm font-semibold">{leave.user.name}</span>
                        )}
                        <span className="text-sm font-medium text-brand-600">{leave.leave_type?.name}</span>
                        <LeaveStatusBadge status={leave.status} />
                        {leave.is_half_day && (
                          <span className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 rounded-full px-1.5 py-0.5 font-medium">
                            Half Day
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{new Date(leave.start_date).toLocaleDateString()} — {new Date(leave.end_date).toLocaleDateString()}</span>
                        <span>{leave.total_days} day{Number(leave.total_days) !== 1 ? 's' : ''}</span>
                        {reasonPreview && (
                          <span className="truncate max-w-[200px] text-muted-foreground/60">{reasonPreview}…</span>
                        )}
                      </div>
                      {leave.admin_comment && (
                        <p className="text-[11px] text-muted-foreground/70 mt-1 italic flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> {leave.admin_comment}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {leave.attachment && (
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); openDetail(leave); }}
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===================== APPLY LEAVE DIALOG ===================== */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>Submit a leave request for approval</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Leave Type</Label>
              <Select value={formLeaveTypeId} onValueChange={setFormLeaveTypeId}>
                <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.max_days} days/yr)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="halfDay"
                  checked={formIsHalfDay}
                  onChange={(e) => setFormIsHalfDay(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="halfDay" className="text-xs cursor-pointer">Half Day</Label>
              </div>
              {formIsHalfDay && (
                <Select value={formHalfDayPeriod} onValueChange={setFormHalfDayPeriod}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_half">First Half</SelectItem>
                    <SelectItem value="second_half">Second Half</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <RichTextEditor
                content={formReason}
                onChange={setFormReason}
                placeholder="Explain your reason for leave..."
              />
            </div>
            <div>
              <Label className="text-xs">Attachment (optional)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFormAttachment(e.target.files?.[0] || null)}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">PDF, JPG, PNG up to 5MB</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleApply} disabled={applying} className="bg-brand-600 hover:bg-brand-700 cursor-pointer">
              {applying ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== LEAVE DETAIL DIALOG ===================== */}
      <Dialog open={!!detailLeave} onOpenChange={() => { setDetailLeave(null); setAdminComment(''); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailLeave && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <DialogTitle className="text-lg">Leave Request Details</DialogTitle>
                  <LeaveStatusBadge status={detailLeave.status} />
                </div>
                <DialogDescription className="sr-only">
                  View leave request details and take action
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* Employee Info */}
                <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                  <Avatar className="h-10 w-10">
                    {detailLeave.user?.avatar && <AvatarImage src={`/storage/${detailLeave.user.avatar}`} />}
                    <AvatarFallback>{detailLeave.user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{detailLeave.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{detailLeave.user?.department || detailLeave.user?.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Applied on</p>
                    <p className="text-xs font-medium">{new Date(detailLeave.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Leave Info Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Type</p>
                    <p className="text-sm font-semibold mt-0.5 text-brand-600">{detailLeave.leave_type?.name}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Duration</p>
                    <p className="text-sm font-semibold mt-0.5">
                      {detailLeave.total_days} day{Number(detailLeave.total_days) !== 1 ? 's' : ''}
                      {detailLeave.is_half_day && (
                        <span className="text-xs font-normal text-violet-600 ml-1">
                          ({detailLeave.half_day_period === 'first_half' ? '1st half' : '2nd half'})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">From</p>
                    <p className="text-sm font-semibold mt-0.5">{new Date(detailLeave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">To</p>
                    <p className="text-sm font-semibold mt-0.5">{new Date(detailLeave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>

                {/* Reason (rich text rendered) */}
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Reason</Label>
                  <div
                    className="tiptap prose prose-sm max-w-none rounded-xl border bg-muted/30 p-4 mt-1.5 dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(detailLeave.reason || '') }}
                  />
                </div>

                {/* Attachment */}
                {detailLeave.attachment && (
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Attachment</Label>
                    <a
                      href={`/storage/${detailLeave.attachment}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 flex items-center gap-2 rounded-lg border p-3 text-sm text-brand-600 hover:bg-muted/40 transition-colors"
                    >
                      <Paperclip className="h-4 w-4" />
                      <span className="underline">View Attachment</span>
                    </a>
                  </div>
                )}

                {/* Admin comment (if already acted) */}
                {detailLeave.admin_comment && (
                  <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Admin Note</span>
                      {detailLeave.approver && (
                        <span className="text-[10px] text-muted-foreground">by {detailLeave.approver.name}</span>
                      )}
                    </div>
                    <p className="text-sm text-amber-900 dark:text-amber-200">{detailLeave.admin_comment}</p>
                  </div>
                )}

                {detailLeave.approved_at && (
                  <p className="text-[11px] text-muted-foreground">
                    {detailLeave.status === 'approved' ? 'Approved' : 'Reviewed'} on {new Date(detailLeave.approved_at).toLocaleString()}
                    {detailLeave.approver && ` by ${detailLeave.approver.name}`}
                  </p>
                )}

                {/* Admin Action Section — only for pending leaves */}
                {isAdmin && detailLeave.status === 'pending' && (
                  <div className="border-t pt-4 space-y-3">
                    <Label className="text-xs font-semibold">Admin Response</Label>
                    <textarea
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      placeholder="Add a note (e.g., why you're approving or rejecting this request)..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:hover:bg-red-950/30 cursor-pointer"
                        onClick={() => handleAction('rejected')}
                        disabled={actioning}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                        onClick={() => handleAction('approved')}
                        disabled={actioning}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                    </div>
                  </div>
                )}

                {/* User cancel — only for own pending leaves */}
                {!isAdmin && detailLeave.status === 'pending' && detailLeave.user_id === user?.id && (
                  <div className="border-t pt-4 flex justify-end">
                    <Button
                      variant="outline"
                      className="gap-1.5 text-red-600 hover:bg-red-50 cursor-pointer"
                      onClick={() => { setDetailLeave(null); setCancelId(detailLeave.id); }}
                    >
                      Cancel this request
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={cancelId !== null} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel leave request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel your pending leave request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
              Yes, cancel it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
