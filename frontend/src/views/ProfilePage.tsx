import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import type { User, UserStatus, Education } from '@/types';
import { USER_STATUSES } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatusDot } from '@/components/shared/UserStatusDot';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Camera, Save, Shield, Laptop, Coffee, Phone, Palmtree, WifiOff,
  Pencil, ImageIcon, Palette, Blend, Trash2, Check, Loader2,
  Upload, FileText, X, Plus, GraduationCap, Sparkles, MapPin,
  CheckCircle2, AlertCircle, Lock, Home, Copy, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types & Constants ────────────────────────────────────────

type BannerType = 'solid' | 'gradient' | 'image';

interface BannerConfig {
  type: BannerType;
  solidColor: string;
  gradientFrom: string;
  gradientTo: string;
  gradientDirection: string;
  imageUrl: string | null;
}

interface AddressFields {
  village: string;
  city: string;
  thana: string;
  post_office: string;
  division: string;
  country: string;
}

const EMPTY_ADDRESS: AddressFields = { village: '', city: '', thana: '', post_office: '', division: '', country: '' };

const DEFAULT_BANNER: BannerConfig = {
  type: 'gradient',
  solidColor: '#4f46e5',
  gradientFrom: '',
  gradientTo: '',
  gradientDirection: 'to right',
  imageUrl: null,
};

const GRADIENT_DIRECTIONS = [
  { label: 'Right', value: 'to right' },
  { label: 'Left', value: 'to left' },
  { label: 'Bottom', value: 'to bottom' },
  { label: 'Top Right', value: 'to top right' },
  { label: 'Bottom Right', value: 'to bottom right' },
];

const AVAILABLE_SKILLS = [
  'C++', 'C#', 'PHP', 'HTML', 'CSS', 'JavaScript', 'TypeScript', 'Python',
  'Java', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'React', 'Vue.js',
  'Angular', 'Node.js', 'Laravel', 'Django', 'Spring Boot', 'Docker',
  'Kubernetes', 'AWS', 'Azure', 'GCP', 'MySQL', 'PostgreSQL', 'MongoDB',
  'Redis', 'GraphQL', 'REST API', 'Git', 'Linux', 'Figma', 'Tailwind CSS',
];

const EDUCATION_LEVELS = ['SSC', 'HSC', 'Diploma', 'Honors', 'Masters', 'PhD'];

function loadBanner(): BannerConfig {
  try {
    const raw = localStorage.getItem('profile-banner');
    if (raw) return { ...DEFAULT_BANNER, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_BANNER;
}

function saveBanner(config: BannerConfig) {
  localStorage.setItem('profile-banner', JSON.stringify(config));
}

const STATUS_ICONS: Record<UserStatus, typeof Laptop> = {
  working: Laptop,
  busy: Coffee,
  in_meeting: Phone,
  vacation: Palmtree,
  offline: WifiOff,
};

function getCompletionColor(pct: number): string {
  if (pct >= 100) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 80) return 'text-blue-600 dark:text-blue-400';
  if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

function getCompletionBg(pct: number): string {
  if (pct >= 100) return 'bg-emerald-600';
  if (pct >= 80) return 'bg-blue-600';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function getPasswordStrength(pw: string): { label: string; color: string; pct: number } {
  if (!pw) return { label: '', color: '', pct: 0 };
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { label: 'Weak', color: 'bg-red-500', pct: 20 };
  if (s === 2) return { label: 'Fair', color: 'bg-orange-500', pct: 40 };
  if (s === 3) return { label: 'Good', color: 'bg-amber-500', pct: 60 };
  if (s === 4) return { label: 'Strong', color: 'bg-blue-500', pct: 80 };
  return { label: 'Very Strong', color: 'bg-emerald-500', pct: 100 };
}

function extractAddress(user: User | null, prefix: 'present' | 'permanent'): AddressFields {
  if (!user) return { ...EMPTY_ADDRESS };
  const record = user as unknown as Record<string, unknown>;
  return {
    village: record[`${prefix}_village`] as string || '',
    city: record[`${prefix}_city`] as string || '',
    thana: record[`${prefix}_thana`] as string || '',
    post_office: record[`${prefix}_post_office`] as string || '',
    division: record[`${prefix}_division`] as string || '',
    country: record[`${prefix}_country`] as string || '',
  };
}

// ─── Address Fields Grid (stable reference — defined outside component) ───

function AddressFieldsGrid({ addr, onChange, disabled }: { addr: AddressFields; onChange: (f: keyof AddressFields, v: string) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Village / Area</Label>
        <Input value={addr.village} onChange={e => onChange('village', e.target.value)} placeholder="Village or area name" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>City</Label>
        <Input value={addr.city} onChange={e => onChange('city', e.target.value)} placeholder="City name" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Thana / Upazila</Label>
        <Input value={addr.thana} onChange={e => onChange('thana', e.target.value)} placeholder="Thana name" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Post Office</Label>
        <Input value={addr.post_office} onChange={e => onChange('post_office', e.target.value)} placeholder="Post office name" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Division / State</Label>
        <Input value={addr.division} onChange={e => onChange('division', e.target.value)} placeholder="Division or state" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Country</Label>
        <Input value={addr.country} onChange={e => onChange('country', e.target.value)} placeholder="Country" disabled={disabled} />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────

export function ProfilePage() {
  const { user, refreshUser, updateUserStatus, needsProfileCompletion } = useAuth();

  // Personal info
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [status, setStatus] = useState<UserStatus>(user?.status || 'offline');
  const [phone, setPhone] = useState(user?.phone || '');
  const [phone2, setPhone2] = useState(user?.phone2 || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [location, setLocation] = useState(user?.location || '');
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [skillSearch, setSkillSearch] = useState('');
  const [educations, setEducations] = useState<Education[]>(user?.educations || []);

  // Address
  const [presentAddr, setPresentAddr] = useState<AddressFields>(extractAddress(user, 'present'));
  const [permanentAddr, setPermanentAddr] = useState<AddressFields>(extractAddress(user, 'permanent'));
  const [sameAsPermanent, setSameAsPermanent] = useState(user?.same_as_permanent ?? false);

  // Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [cvPath, setCvPath] = useState(user?.cv_path || '');
  const [profileCompletion, setProfileCompletion] = useState(user?.profile_completion ?? 0);
  const [bannerConfig, setBannerConfig] = useState<BannerConfig>(loadBanner);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [draftBanner, setDraftBanner] = useState<BannerConfig>(bannerConfig);
  const [eduDialogOpen, setEduDialogOpen] = useState(false);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);
  const [eduForm, setEduForm] = useState({ level: 'SSC', institution: '', passing_year: '', result: '' });
  const [savingEdu, setSavingEdu] = useState(false);
  const bannerImageRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  // ─── Sync from user ─────────────────────────

  useEffect(() => {
    if (user?.status) setStatus(user.status);
  }, [user?.status]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setPhone2(user.phone2 || '');
      setDepartment(user.department || '');
      setLocation(user.location || '');
      setSkills(user.skills || []);
      setEducations(user.educations || []);
      setCvPath(user.cv_path || '');
      setProfileCompletion(user.profile_completion ?? 0);
      setAvatarUrl(user.avatar || '');
      setPresentAddr(extractAddress(user, 'present'));
      setPermanentAddr(extractAddress(user, 'permanent'));
      setSameAsPermanent(user.same_as_permanent ?? false);
    }
  }, [user]);

  // Sync permanent address when "same as" is checked
  useEffect(() => {
    if (sameAsPermanent) {
      setPermanentAddr({ ...presentAddr });
    }
  }, [sameAsPermanent, presentAddr]);

  const hasStatusChanged = status !== user?.status;

  const handleStatusSave = async () => {
    setSavingStatus(true);
    await updateUserStatus(status);
    setSavingStatus(false);
  };

  // ─── Banner ─────────────────────────────────

  useEffect(() => {
    if (!bannerConfig.gradientFrom) {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      const from = style.getPropertyValue('--color-brand-600').trim() || '#4f46e5';
      const to = style.getPropertyValue('--color-brand-800').trim() || '#3730a3';
      setBannerConfig(prev => ({ ...prev, gradientFrom: prev.gradientFrom || from, gradientTo: prev.gradientTo || to }));
      setDraftBanner(prev => ({ ...prev, gradientFrom: prev.gradientFrom || from, gradientTo: prev.gradientTo || to }));
    }
  }, []);

  const getBannerStyle = (config: BannerConfig): React.CSSProperties => {
    switch (config.type) {
      case 'solid': return { backgroundColor: config.solidColor };
      case 'gradient': return { background: `linear-gradient(${config.gradientDirection}, ${config.gradientFrom}, ${config.gradientTo})` };
      case 'image': return config.imageUrl
        ? { backgroundImage: `url(${config.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: `linear-gradient(to right, ${config.gradientFrom}, ${config.gradientTo})` };
      default: return {};
    }
  };

  const handleBannerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Banner image must be under 3MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 1200);
        canvas.height = Math.min(img.height, 400);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setDraftBanner(prev => ({ ...prev, type: 'image', imageUrl: canvas.toDataURL('image/jpeg', 0.85) }));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const applyBanner = () => { setBannerConfig(draftBanner); saveBanner(draftBanner); setBannerDialogOpen(false); toast.success('Banner updated'); };
  const resetBanner = () => {
    const reset = { ...DEFAULT_BANNER, gradientFrom: bannerConfig.gradientFrom || '#4f46e5', gradientTo: bannerConfig.gradientTo || '#3730a3' };
    setDraftBanner(reset); setBannerConfig(reset); saveBanner(reset); setBannerDialogOpen(false); toast.success('Banner reset to default');
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  // ─── Personal Info Submit ───────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put<User>('/profile', {
        name, email, status, phone, phone2, department, location, skills,
      });
      setProfileCompletion(res.data.profile_completion ?? 0);
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // ─── Address Submit ─────────────────────────

  const handleAddressSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const payload: Record<string, unknown> = {
        present_village: presentAddr.village,
        present_city: presentAddr.city,
        present_thana: presentAddr.thana,
        present_post_office: presentAddr.post_office,
        present_division: presentAddr.division,
        present_country: presentAddr.country,
        permanent_village: permanentAddr.village,
        permanent_city: permanentAddr.city,
        permanent_thana: permanentAddr.thana,
        permanent_post_office: permanentAddr.post_office,
        permanent_division: permanentAddr.division,
        permanent_country: permanentAddr.country,
        same_as_permanent: sameAsPermanent,
      };
      const res = await api.put<User>('/profile/address', payload);
      setProfileCompletion(res.data.profile_completion ?? 0);
      await refreshUser();
      toast.success('Address updated successfully');
    } catch {
      toast.error('Failed to update address');
    } finally {
      setSavingAddress(false);
    }
  };

  // ─── Password Submit ────────────────────────

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword;

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPassword(true);
    try {
      const res = await api.put<{ message: string; user: User }>('/profile/password', {
        old_password: oldPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setProfileCompletion(res.data.user.profile_completion ?? 0);
      await refreshUser();
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (err: unknown) {
      const errors = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors;
      if (errors) {
        const first = Object.values(errors)[0]?.[0];
        toast.error(first || 'Failed to change password');
      } else {
        toast.error('Failed to change password');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  // ─── Avatar upload ──────────────────────────

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await api.post<{ avatar: string; user: User }>('/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAvatarUrl(res.data.avatar);
      setProfileCompletion(res.data.user.profile_completion ?? 0);
      await refreshUser();
      toast.success('Avatar updated');
    } catch { toast.error('Failed to upload avatar'); }
    finally { setUploading(false); }
  };

  // ─── CV upload ──────────────────────────────

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('CV must be under 10MB'); return; }
    setUploadingCv(true);
    const formData = new FormData();
    formData.append('cv', file);
    try {
      const res = await api.post<{ cv_path: string; user: User }>('/profile/cv', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCvPath(res.data.cv_path);
      setProfileCompletion(res.data.user.profile_completion ?? 0);
      await refreshUser();
      toast.success('CV uploaded successfully');
    } catch { toast.error('Failed to upload CV'); }
    finally { setUploadingCv(false); if (cvInputRef.current) cvInputRef.current.value = ''; }
  };

  const handleDeleteCv = async () => {
    try { await api.delete('/profile/cv'); setCvPath(''); await refreshUser(); toast.success('CV removed'); }
    catch { toast.error('Failed to remove CV'); }
  };

  // ─── Skills ─────────────────────────────────

  const toggleSkill = (skill: string) => setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  const addCustomSkill = () => { const t = skillSearch.trim(); if (t && !skills.includes(t)) { setSkills(prev => [...prev, t]); setSkillSearch(''); } };
  const filteredSkills = AVAILABLE_SKILLS.filter(s => s.toLowerCase().includes(skillSearch.toLowerCase()) && !skills.includes(s));

  // ─── Education ──────────────────────────────

  const openEduDialog = (edu?: Education) => {
    if (edu) { setEditingEdu(edu); setEduForm({ level: edu.level, institution: edu.institution, passing_year: edu.passing_year || '', result: edu.result || '' }); }
    else { setEditingEdu(null); setEduForm({ level: 'SSC', institution: '', passing_year: '', result: '' }); }
    setEduDialogOpen(true);
  };

  const handleEduSubmit = async () => {
    if (!eduForm.level.trim()) { toast.error('Education level is required'); return; }
    if (!eduForm.institution.trim()) { toast.error('Institution name is required'); return; }
    if (eduForm.passing_year && (!/^\d{4}$/.test(eduForm.passing_year) || Number(eduForm.passing_year) < 1950 || Number(eduForm.passing_year) > new Date().getFullYear() + 5)) {
      toast.error('Passing year must be a valid 4-digit year'); return;
    }
    if (eduForm.result && !/^\d+(\.\d+)?(\/\d+(\.\d+)?)?$/.test(eduForm.result.trim())) {
      toast.error('Grade/GPA must be numeric (e.g. 3.85 or 3.85/4.00)'); return;
    }
    setSavingEdu(true);
    try {
      if (editingEdu) { const res = await api.put<Education>(`/profile/educations/${editingEdu.id}`, eduForm); setEducations(prev => prev.map(e => e.id === editingEdu.id ? res.data : e)); }
      else { const res = await api.post<Education>('/profile/educations', eduForm); setEducations(prev => [...prev, res.data]); }
      await refreshUser();
      setEduDialogOpen(false);
      toast.success(editingEdu ? 'Education updated' : 'Education added');
    } catch { toast.error('Failed to save education'); }
    finally { setSavingEdu(false); }
  };

  const handleDeleteEdu = async (id: number) => {
    try { await api.delete(`/profile/educations/${id}`); setEducations(prev => prev.filter(e => e.id !== id)); await refreshUser(); toast.success('Education removed'); }
    catch { toast.error('Failed to remove education'); }
  };

  // ─── Address field helpers ──────────────────

  const updatePresent = (field: keyof AddressFields, val: string) => {
    setPresentAddr(prev => {
      const next = { ...prev, [field]: val };
      if (sameAsPermanent) setPermanentAddr(next);
      return next;
    });
  };

  // ─── Render ─────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in pb-10">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your account settings and profile information</p>
        </div>
        {profileCompletion >= 100 && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Profile Complete
          </div>
        )}
      </div>

      {/* Profile Completion Banner */}
      {needsProfileCompletion && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 shadow-md">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/50">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Complete Your Profile</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Please fill in your profile information to continue using the system.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={profileCompletion} className="flex-1 h-2.5" />
                  <span className={`text-sm font-bold ${getCompletionColor(profileCompletion)}`}>{profileCompletion}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Completion Progress */}
      <Card className="border-0 shadow-md">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className={`text-sm font-bold ${getCompletionColor(profileCompletion)}`}>{profileCompletion}%</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full transition-all duration-700 ease-out ${getCompletionBg(profileCompletion)}`} style={{ width: `${profileCompletion}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {[
              { label: 'Name & Email', done: !!(user?.name && user?.email) },
              { label: 'Phone', done: !!user?.phone },
              { label: 'Avatar', done: !!avatarUrl },
              { label: 'Address', done: !!(user?.present_village && user?.present_city) },
              { label: 'CV', done: !!cvPath },
              { label: 'Skills', done: !!(user?.skills && user.skills.length > 0) },
              { label: 'Education', done: educations.length > 0 },
              { label: 'Password', done: !!user?.password_changed },
            ].map(item => (
              <span key={item.label} className={`flex items-center gap-1 ${item.done ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {item.done ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current inline-block" />}
                {item.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Avatar card with banner */}
      <Card className="relative border-0 shadow-md overflow-hidden" style={getBannerStyle(bannerConfig)}>
        <button onClick={() => { setDraftBanner(bannerConfig); setBannerDialogOpen(true); }} className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 rounded-lg bg-black/40 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black/60 cursor-pointer">
          <Pencil className="h-3.5 w-3.5" />
          Edit Cover
        </button>
        <CardContent className="relative pt-10 pb-6">
          <div className="flex items-end gap-4">
            <div className="relative group">
              <Avatar className="h-24 w-24 ring-4 ring-white/20 shadow-xl">
                {avatarUrl && <AvatarImage src={`/storage/${avatarUrl}`} />}
                <AvatarFallback className="bg-white/20 text-white text-2xl font-bold backdrop-blur-sm">{initials}</AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-6 w-6 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
              </label>
              <UserStatusDot status={status} className="absolute bottom-1 right-1 h-4 w-4 ring-3 ring-white/30" />
              {profileCompletion >= 100 && (
                <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-2 ring-white/30">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </div>
              )}
            </div>
            <div className="mb-1">
              <h2 className="text-xl font-bold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{user?.name}</h2>
              <div className="flex items-center gap-2 text-sm text-white/90" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                <Shield className="h-3.5 w-3.5" />
                <span className="capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Banner editor dialog */}
      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Cover Background</DialogTitle>
            <DialogDescription>Choose a solid color, gradient, or upload an image.</DialogDescription>
          </DialogHeader>
          <div className="h-20 rounded-lg overflow-hidden border" style={getBannerStyle(draftBanner)} />
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {([
              { type: 'solid' as BannerType, icon: Palette, label: 'Solid' },
              { type: 'gradient' as BannerType, icon: Blend, label: 'Gradient' },
              { type: 'image' as BannerType, icon: ImageIcon, label: 'Image' },
            ]).map(({ type, icon: Icon, label }) => (
              <button key={type} onClick={() => setDraftBanner(prev => ({ ...prev, type }))} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all cursor-pointer ${draftBanner.type === type ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>
          {draftBanner.type === 'solid' && (
            <div className="space-y-3">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={draftBanner.solidColor} onChange={e => setDraftBanner(prev => ({ ...prev, solidColor: e.target.value }))} className="h-10 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                <Input value={draftBanner.solidColor} onChange={e => setDraftBanner(prev => ({ ...prev, solidColor: e.target.value }))} className="font-mono uppercase" maxLength={7} />
              </div>
              <div className="flex flex-wrap gap-2">
                {['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#1e293b'].map(c => (
                  <button key={c} onClick={() => setDraftBanner(prev => ({ ...prev, solidColor: c }))} className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer" style={{ backgroundColor: c, borderColor: draftBanner.solidColor === c ? 'white' : 'transparent', boxShadow: draftBanner.solidColor === c ? `0 0 0 2px ${c}` : 'none' }} />
                ))}
              </div>
            </div>
          )}
          {draftBanner.type === 'gradient' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">From</Label><div className="flex items-center gap-2"><input type="color" value={draftBanner.gradientFrom} onChange={e => setDraftBanner(prev => ({ ...prev, gradientFrom: e.target.value }))} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0" /><Input value={draftBanner.gradientFrom} onChange={e => setDraftBanner(prev => ({ ...prev, gradientFrom: e.target.value }))} className="font-mono text-xs uppercase" maxLength={7} /></div></div>
                <div className="space-y-1.5"><Label className="text-xs">To</Label><div className="flex items-center gap-2"><input type="color" value={draftBanner.gradientTo} onChange={e => setDraftBanner(prev => ({ ...prev, gradientTo: e.target.value }))} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0" /><Input value={draftBanner.gradientTo} onChange={e => setDraftBanner(prev => ({ ...prev, gradientTo: e.target.value }))} className="font-mono text-xs uppercase" maxLength={7} /></div></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Direction</Label><div className="flex flex-wrap gap-1.5">{GRADIENT_DIRECTIONS.map(d => (<button key={d.value} onClick={() => setDraftBanner(prev => ({ ...prev, gradientDirection: d.value }))} className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${draftBanner.gradientDirection === d.value ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400' : 'border-border hover:bg-accent'}`}>{d.label}</button>))}</div></div>
              <div className="flex flex-wrap gap-2">{[['#4f46e5', '#3730a3'], ['#0891b2', '#0e7490'], ['#059669', '#047857'], ['#f43f5e', '#e11d48'], ['#8b5cf6', '#6d28d9'], ['#f97316', '#ea580c']].map(([from, to]) => (<button key={from + to} onClick={() => setDraftBanner(prev => ({ ...prev, gradientFrom: from, gradientTo: to }))} className="h-8 w-12 rounded-lg border-2 border-transparent transition-transform hover:scale-110 cursor-pointer" style={{ background: `linear-gradient(to right, ${from}, ${to})` }} />))}</div>
            </div>
          )}
          {draftBanner.type === 'image' && (
            <div className="space-y-3">
              <input ref={bannerImageRef} type="file" accept="image/*" onChange={handleBannerImageUpload} className="hidden" />
              <button onClick={() => bannerImageRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-6 text-sm text-muted-foreground transition-colors hover:border-brand-500 hover:text-brand-600 cursor-pointer"><ImageIcon className="h-5 w-5" />{draftBanner.imageUrl ? 'Change Image' : 'Upload Image'}</button>
              <p className="text-xs text-muted-foreground text-center">Max 3MB. JPEG or PNG recommended.</p>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <button onClick={resetBanner} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" />Reset</button>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setBannerDialogOpen(false)} className="cursor-pointer">Cancel</Button><Button onClick={applyBanner} className="bg-brand-600 hover:bg-brand-700 cursor-pointer">Apply</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status selector */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status</CardTitle>
            {hasStatusChanged && (
              <Button size="sm" onClick={handleStatusSave} disabled={savingStatus} className="h-7 gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-xs shadow-md shadow-brand-600/25 cursor-pointer animate-fade-in">
                {savingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {savingStatus ? 'Saving...' : 'Apply'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {USER_STATUSES.map((s) => {
              const Icon = STATUS_ICONS[s.value]; const isSelected = status === s.value;
              return (
                <button key={s.value} onClick={() => setStatus(s.value)} className={`relative flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all cursor-pointer ${isSelected ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500 dark:bg-brand-950/30 dark:text-brand-400' : 'border-border hover:bg-accent hover:shadow-sm'}`}>
                  {isSelected && hasStatusChanged && (<span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm animate-fade-in"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>)}
                  <Icon className="h-4 w-4" style={{ color: s.color }} /><span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ═══════ Personal Information Card ═══════ */}
      <form onSubmit={handleSubmit}>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Full Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Contact Number</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+880 1XXX-XXXXXX" /></div>
              <div className="space-y-2"><Label>Second Contact <span className="text-muted-foreground">(optional)</span></Label><Input value={phone2} onChange={e => setPhone2(e.target.value)} placeholder="+880 1XXX-XXXXXX" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Department</Label><Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Engineering" /></div>
              <div className="space-y-2"><Label>Location</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Dhaka, Bangladesh" /></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" className="bg-brand-600 hover:bg-brand-700 transition-all hover:shadow-lg hover:shadow-brand-600/25 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save Info'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* ═══════ Address Card ═══════ */}
      <form onSubmit={handleAddressSubmit}>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Home className="h-4.5 w-4.5 text-brand-600" />
              <div>
                <CardTitle className="text-base">Address Information</CardTitle>
                <CardDescription className="text-xs mt-0.5">Manage your present and permanent address</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Present Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <h4 className="text-sm font-semibold">Present Address</h4>
              </div>
              <AddressFieldsGrid addr={presentAddr} onChange={updatePresent} />
            </div>

            {/* Same as permanent checkbox */}
            <div className="flex items-center gap-3 rounded-xl border bg-accent/30 px-4 py-3">
              <button
                type="button"
                onClick={() => setSameAsPermanent(!sameAsPermanent)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all cursor-pointer ${
                  sameAsPermanent
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-muted-foreground/40 hover:border-brand-500'
                }`}
              >
                {sameAsPermanent && <Check className="h-3 w-3" strokeWidth={3} />}
              </button>
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Present address is same as permanent address</span>
              </div>
            </div>

            {/* Permanent Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <h4 className="text-sm font-semibold">Permanent Address</h4>
                {sameAsPermanent && (
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Auto-synced</span>
                )}
              </div>
              <AddressFieldsGrid
                addr={permanentAddr}
                onChange={(f, v) => setPermanentAddr(prev => ({ ...prev, [f]: v }))}
                disabled={sameAsPermanent}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" className="bg-brand-600 hover:bg-brand-700 transition-all hover:shadow-lg hover:shadow-brand-600/25 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer" disabled={savingAddress}>
                <Save className="mr-2 h-4 w-4" />{savingAddress ? 'Saving...' : 'Save Address'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* ═══════ Password Card ═══════ */}
      <form onSubmit={handlePasswordSubmit}>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4.5 w-4.5 text-brand-600" />
                <div>
                  <CardTitle className="text-base">Change Password</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Update your password to keep your account secure</CardDescription>
                </div>
              </div>
              {user?.password_changed ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  <ShieldCheck className="h-3 w-3" />
                  Updated
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3" />
                  Required
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <PasswordInput value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Enter your current password" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>New Password</Label>
                <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" minLength={6} required />
                {/* Strength indicator */}
                {newPassword && (
                  <div className="space-y-1.5 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: `${passwordStrength.pct}%` }} />
                      </div>
                      <span className={`text-[11px] font-semibold ${passwordStrength.pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : passwordStrength.pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                      <li className={newPassword.length >= 6 ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                        {newPassword.length >= 6 ? <Check className="h-3 w-3 inline mr-1" /> : <span className="inline-block h-3 w-3 mr-1" />}
                        At least 6 characters
                      </li>
                      <li className={/[A-Z]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                        {/[A-Z]/.test(newPassword) ? <Check className="h-3 w-3 inline mr-1" /> : <span className="inline-block h-3 w-3 mr-1" />}
                        One uppercase letter
                      </li>
                      <li className={/[0-9]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                        {/[0-9]/.test(newPassword) ? <Check className="h-3 w-3 inline mr-1" /> : <span className="inline-block h-3 w-3 mr-1" />}
                        One number
                      </li>
                      <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                        {/[^A-Za-z0-9]/.test(newPassword) ? <Check className="h-3 w-3 inline mr-1" /> : <span className="inline-block h-3 w-3 mr-1" />}
                        One special character
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <PasswordInput value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" required />
                {confirmPassword && (
                  <p className={`text-[11px] font-medium animate-fade-in ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {passwordsMatch ? (
                      <><Check className="h-3 w-3 inline mr-1" />Passwords match</>
                    ) : (
                      <><X className="h-3 w-3 inline mr-1" />Passwords do not match</>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingPassword || !oldPassword || !newPassword || !confirmPassword || !passwordsMatch} className="bg-brand-600 hover:bg-brand-700 transition-all hover:shadow-lg hover:shadow-brand-600/25 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50">
                <Lock className="mr-2 h-4 w-4" />{savingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* ═══════ CV Upload Card ═══════ */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Resume / CV</CardTitle>
        </CardHeader>
        <CardContent>
          <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleCvUpload} className="hidden" />
          {cvPath ? (
            <div className="flex items-center gap-3 rounded-xl border bg-accent/30 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400"><FileText className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{cvPath.split('/').pop()}</p>
                <p className="text-xs text-muted-foreground">Click to download or replace</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button type="button" variant="outline" size="sm" onClick={() => window.open(`/storage/${cvPath}`, '_blank')} className="h-8 cursor-pointer"><FileText className="h-3.5 w-3.5 mr-1" />View</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => cvInputRef.current?.click()} disabled={uploadingCv} className="h-8 cursor-pointer">{uploadingCv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}Replace</Button>
                <Button type="button" variant="outline" size="sm" onClick={handleDeleteCv} className="h-8 text-red-500 hover:text-red-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => cvInputRef.current?.click()} disabled={uploadingCv} className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/20 py-8 text-muted-foreground transition-all hover:border-brand-500 hover:text-brand-600 cursor-pointer">
              {uploadingCv ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
              <div className="text-left"><p className="text-sm font-medium">{uploadingCv ? 'Uploading...' : 'Upload your CV'}</p><p className="text-xs">PDF, DOC or DOCX (max 10MB)</p></div>
            </button>
          )}
        </CardContent>
      </Card>

      {/* ═══════ Skills Card ═══════ */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" />Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map(skill => (
                <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                  {skill}
                  <button type="button" onClick={() => toggleSkill(skill)} className="rounded-full p-0.5 hover:bg-brand-200 dark:hover:bg-brand-800 transition-colors cursor-pointer"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input value={skillSearch} onChange={e => setSkillSearch(e.target.value)} placeholder="Search or type a skill..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }} />
            {skillSearch.trim() && !AVAILABLE_SKILLS.includes(skillSearch.trim()) && !skills.includes(skillSearch.trim()) && (
              <Button type="button" variant="outline" onClick={addCustomSkill} className="shrink-0 cursor-pointer"><Plus className="h-4 w-4 mr-1" />Add</Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(skillSearch ? filteredSkills : AVAILABLE_SKILLS.filter(s => !skills.includes(s))).slice(0, 20).map(skill => (
              <button key={skill} type="button" onClick={() => toggleSkill(skill)} className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 cursor-pointer">
                <Plus className="h-3 w-3 inline mr-0.5 -mt-0.5" />{skill}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Skills are saved with personal information above.</p>
        </CardContent>
      </Card>

      {/* ═══════ Education Card ═══════ */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4.5 w-4.5 text-brand-600" />
              <div>
                <CardTitle className="text-base">Education</CardTitle>
                <CardDescription className="text-xs mt-0.5">Your academic qualifications</CardDescription>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => openEduDialog()} className="h-8 cursor-pointer"><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
          </div>
        </CardHeader>
        <CardContent>
          {educations.length === 0 ? (
            <button type="button" onClick={() => openEduDialog()} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 py-8 text-muted-foreground transition-all hover:border-brand-500 hover:text-brand-600 cursor-pointer">
              <GraduationCap className="h-6 w-6" />
              <div className="text-left"><p className="text-sm font-medium">Add your education</p><p className="text-xs">SSC, HSC, Honors, Masters, etc.</p></div>
            </button>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Institute</TableHead>
                      <TableHead className="font-semibold">Grade / GPA</TableHead>
                      <TableHead className="font-semibold">Passing Year</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {educations.map((edu) => (
                      <TableRow key={edu.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400 shrink-0">
                              <GraduationCap className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-sm">{edu.level}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                          <span className="truncate block">{edu.institution}</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {edu.result ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                              {edu.result}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{edu.passing_year || '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => openEduDialog(edu)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-brand-600 cursor-pointer transition-colors">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDeleteEdu(edu.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-red-600 cursor-pointer transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {educations.map((edu) => (
                  <div key={edu.id} className="rounded-xl border bg-accent/20 px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-sm">{edu.level}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button type="button" onClick={() => openEduDialog(edu)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-brand-600 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleDeleteEdu(edu.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-red-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Institute</span>
                        <p className="font-medium truncate">{edu.institution}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Grade / GPA</span>
                        <p className="font-medium">{edu.result || '—'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Passing Year</span>
                        <p className="font-medium">{edu.passing_year || '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Education dialog */}
      <Dialog open={eduDialogOpen} onOpenChange={setEduDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEdu ? 'Edit Education' : 'Add Education'}</DialogTitle>
            <DialogDescription>Enter your educational qualification details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Level <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-1.5">
                {EDUCATION_LEVELS.map(level => (
                  <button key={level} type="button" onClick={() => setEduForm(prev => ({ ...prev, level }))} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all cursor-pointer ${eduForm.level === level ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500 dark:bg-brand-950/30 dark:text-brand-400' : 'border-border hover:bg-accent'}`}>{level}</button>
                ))}
              </div>
              <Input value={EDUCATION_LEVELS.includes(eduForm.level) ? '' : eduForm.level} onChange={e => setEduForm(prev => ({ ...prev, level: e.target.value }))} placeholder="Or type custom level..." className="mt-1" />
            </div>
            <div className="space-y-2">
              <Label>Institution Name <span className="text-red-500">*</span></Label>
              <Input value={eduForm.institution} onChange={e => setEduForm(prev => ({ ...prev, institution: e.target.value }))} placeholder="University / College / School name" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Passing Year</Label>
                <Input
                  value={eduForm.passing_year}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setEduForm(prev => ({ ...prev, passing_year: val }));
                  }}
                  placeholder="e.g. 2024"
                  maxLength={4}
                  inputMode="numeric"
                />
                {eduForm.passing_year && !/^\d{4}$/.test(eduForm.passing_year) && (
                  <p className="text-[11px] text-red-500">Must be a 4-digit year</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Grade / GPA</Label>
                <Input
                  value={eduForm.result}
                  onChange={e => setEduForm(prev => ({ ...prev, result: e.target.value }))}
                  placeholder="e.g. 3.85 or 4.50/5.00"
                />
                {eduForm.result && !/^\d+(\.\d+)?(\/\d+(\.\d+)?)?$/.test(eduForm.result.trim()) && (
                  <p className="text-[11px] text-red-500">Must be numeric (e.g. 3.85 or 3.85/4.00)</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEduDialogOpen(false)} className="cursor-pointer">Cancel</Button>
              <Button onClick={handleEduSubmit} disabled={savingEdu} className="bg-brand-600 hover:bg-brand-700 cursor-pointer">{savingEdu ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}{editingEdu ? 'Update' : 'Add'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
