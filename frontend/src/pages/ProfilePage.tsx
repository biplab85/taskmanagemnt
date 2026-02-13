import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import type { User, UserStatus } from '@/types';
import { USER_STATUSES } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatusDot } from '@/components/shared/UserStatusDot';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Camera, Save, Shield, Laptop, Coffee, Phone, Palmtree, WifiOff, Pencil, ImageIcon, Palette, Blend, Trash2, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type BannerType = 'solid' | 'gradient' | 'image';

interface BannerConfig {
  type: BannerType;
  solidColor: string;
  gradientFrom: string;
  gradientTo: string;
  gradientDirection: string;
  imageUrl: string | null;
}

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

export function ProfilePage() {
  const { user, refreshUser, updateUserStatus } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [status, setStatus] = useState<UserStatus>(user?.status || 'offline');
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [bannerConfig, setBannerConfig] = useState<BannerConfig>(loadBanner);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [draftBanner, setDraftBanner] = useState<BannerConfig>(bannerConfig);
  const bannerImageRef = useRef<HTMLInputElement>(null);

  // Keep local status in sync when changed from header dropdown
  useEffect(() => {
    if (user?.status) {
      setStatus(user.status);
    }
  }, [user?.status]);

  const hasStatusChanged = status !== user?.status;

  const handleStatusSave = async () => {
    setSavingStatus(true);
    await updateUserStatus(status);
    setSavingStatus(false);
  };

  // Compute brand color defaults for gradient
  useEffect(() => {
    if (!bannerConfig.gradientFrom) {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      // Try to read brand CSS vars, fall back to nice defaults
      const from = style.getPropertyValue('--color-brand-600').trim() || '#4f46e5';
      const to = style.getPropertyValue('--color-brand-800').trim() || '#3730a3';
      setBannerConfig(prev => ({
        ...prev,
        gradientFrom: prev.gradientFrom || from,
        gradientTo: prev.gradientTo || to,
      }));
      setDraftBanner(prev => ({
        ...prev,
        gradientFrom: prev.gradientFrom || from,
        gradientTo: prev.gradientTo || to,
      }));
    }
  }, []);

  const getBannerStyle = (config: BannerConfig): React.CSSProperties => {
    switch (config.type) {
      case 'solid':
        return { backgroundColor: config.solidColor };
      case 'gradient':
        return { background: `linear-gradient(${config.gradientDirection}, ${config.gradientFrom}, ${config.gradientTo})` };
      case 'image':
        return config.imageUrl
          ? { backgroundImage: `url(${config.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: `linear-gradient(to right, ${config.gradientFrom}, ${config.gradientTo})` };
      default:
        return {};
    }
  };

  const handleBannerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Banner image must be under 3MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 1200);
        canvas.height = Math.min(img.height, 400);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setDraftBanner(prev => ({ ...prev, type: 'image', imageUrl: dataUrl }));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const applyBanner = () => {
    setBannerConfig(draftBanner);
    saveBanner(draftBanner);
    setBannerDialogOpen(false);
    toast.success('Banner updated');
  };

  const resetBanner = () => {
    const reset = { ...DEFAULT_BANNER, gradientFrom: bannerConfig.gradientFrom || '#4f46e5', gradientTo: bannerConfig.gradientTo || '#3730a3' };
    setDraftBanner(reset);
    setBannerConfig(reset);
    saveBanner(reset);
    setBannerDialogOpen(false);
    toast.success('Banner reset to default');
  };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data: Record<string, unknown> = { name, email, status };
    if (password) {
      if (password !== passwordConfirmation) {
        toast.error('Passwords do not match');
        setSaving(false);
        return;
      }
      data.password = password;
      data.password_confirmation = passwordConfirmation;
    }

    try {
      await api.put<User>('/profile', data);
      await refreshUser();
      toast.success('Profile updated successfully');
      setPassword('');
      setPasswordConfirmation('');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.post<{ avatar: string; user: User }>('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarUrl(res.data.avatar);
      await refreshUser();
      toast.success('Avatar updated');
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings</p>
      </div>

      {/* Avatar card */}
      <Card className="relative avatarContainer border-0 shadow-md overflow-hidden" style={getBannerStyle(bannerConfig)}>
        <button
          onClick={() => { setDraftBanner(bannerConfig); setBannerDialogOpen(true); }}
          className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 rounded-lg bg-black/40 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black/60 cursor-pointer"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit Cover
        </button>
        <CardContent className="relative pt-10 pb-6">
          <div className="flex items-end gap-4">
            <div className="relative group">
              <Avatar className="h-24 w-24 ring-4 ring-white/20 shadow-xl">
                {avatarUrl && <AvatarImage src={`/storage/${avatarUrl}`} />}
                <AvatarFallback className="bg-white/20 text-white text-2xl font-bold backdrop-blur-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-6 w-6 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
              </label>
              <UserStatusDot
                status={status}
                className="absolute bottom-1 right-1 h-4 w-4 ring-3 ring-white/30"
              />
            </div>
            <div className="mb-1">
              <h2 className="text-xl font-bold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5), 0 0 8px rgba(0,0,0,0.3)' }}>{user?.name}</h2>
              <div className="flex items-center gap-2 text-sm text-white/90" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5), 0 0 6px rgba(0,0,0,0.3)' }}>
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

          {/* Preview */}
          <div className="h-20 rounded-lg overflow-hidden border" style={getBannerStyle(draftBanner)} />

          {/* Type tabs */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {([
              { type: 'solid' as BannerType, icon: Palette, label: 'Solid' },
              { type: 'gradient' as BannerType, icon: Blend, label: 'Gradient' },
              { type: 'image' as BannerType, icon: ImageIcon, label: 'Image' },
            ]).map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => setDraftBanner(prev => ({ ...prev, type }))}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all cursor-pointer ${draftBanner.type === type
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Solid color */}
          {draftBanner.type === 'solid' && (
            <div className="space-y-3">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={draftBanner.solidColor}
                  onChange={(e) => setDraftBanner(prev => ({ ...prev, solidColor: e.target.value }))}
                  className="h-10 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                />
                <Input
                  value={draftBanner.solidColor}
                  onChange={(e) => setDraftBanner(prev => ({ ...prev, solidColor: e.target.value }))}
                  className="font-mono uppercase"
                  maxLength={7}
                />
              </div>
              {/* Quick presets */}
              <div className="flex flex-wrap gap-2">
                {['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#1e293b'].map(c => (
                  <button
                    key={c}
                    onClick={() => setDraftBanner(prev => ({ ...prev, solidColor: c }))}
                    className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer"
                    style={{ backgroundColor: c, borderColor: draftBanner.solidColor === c ? 'white' : 'transparent', boxShadow: draftBanner.solidColor === c ? `0 0 0 2px ${c}` : 'none' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Gradient */}
          {draftBanner.type === 'gradient' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">From</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draftBanner.gradientFrom}
                      onChange={(e) => setDraftBanner(prev => ({ ...prev, gradientFrom: e.target.value }))}
                      className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <Input
                      value={draftBanner.gradientFrom}
                      onChange={(e) => setDraftBanner(prev => ({ ...prev, gradientFrom: e.target.value }))}
                      className="font-mono text-xs uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">To</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draftBanner.gradientTo}
                      onChange={(e) => setDraftBanner(prev => ({ ...prev, gradientTo: e.target.value }))}
                      className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <Input
                      value={draftBanner.gradientTo}
                      onChange={(e) => setDraftBanner(prev => ({ ...prev, gradientTo: e.target.value }))}
                      className="font-mono text-xs uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Direction</Label>
                <div className="flex flex-wrap gap-1.5">
                  {GRADIENT_DIRECTIONS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setDraftBanner(prev => ({ ...prev, gradientDirection: d.value }))}
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${draftBanner.gradientDirection === d.value
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400'
                          : 'border-border hover:bg-accent'
                        }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Gradient presets */}
              <div className="flex flex-wrap gap-2">
                {[
                  ['#4f46e5', '#3730a3'], ['#0891b2', '#0e7490'], ['#059669', '#047857'],
                  ['#f43f5e', '#e11d48'], ['#8b5cf6', '#6d28d9'], ['#f97316', '#ea580c'],
                ].map(([from, to]) => (
                  <button
                    key={from + to}
                    onClick={() => setDraftBanner(prev => ({ ...prev, gradientFrom: from, gradientTo: to }))}
                    className="h-8 w-12 rounded-lg border-2 border-transparent transition-transform hover:scale-110 cursor-pointer"
                    style={{ background: `linear-gradient(to right, ${from}, ${to})` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Image */}
          {draftBanner.type === 'image' && (
            <div className="space-y-3">
              <input ref={bannerImageRef} type="file" accept="image/*" onChange={handleBannerImageUpload} className="hidden" />
              <button
                onClick={() => bannerImageRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-6 text-sm text-muted-foreground transition-colors hover:border-brand-500 hover:text-brand-600 cursor-pointer"
              >
                <ImageIcon className="h-5 w-5" />
                {draftBanner.imageUrl ? 'Change Image' : 'Upload Image'}
              </button>
              <p className="text-xs text-muted-foreground text-center">Max 3MB. JPEG or PNG recommended.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={resetBanner}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Reset
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBannerDialogOpen(false)} className="cursor-pointer">Cancel</Button>
              <Button onClick={applyBanner} className="bg-brand-600 hover:bg-brand-700 cursor-pointer">Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status selector */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status</CardTitle>
            {hasStatusChanged && (
              <Button
                size="sm"
                onClick={handleStatusSave}
                disabled={savingStatus}
                className="h-7 gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-xs shadow-md shadow-brand-600/25 transition-all hover:shadow-lg hover:shadow-brand-600/30 cursor-pointer animate-fade-in"
              >
                {savingStatus ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {savingStatus ? 'Saving...' : 'Apply'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {USER_STATUSES.map((s) => {
              const Icon = STATUS_ICONS[s.value];
              const isSelected = status === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={`relative flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all cursor-pointer ${isSelected
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500 dark:bg-brand-950/30 dark:text-brand-400'
                      : 'border-border hover:bg-accent hover:shadow-sm'
                    }`}
                >
                  {isSelected && hasStatusChanged && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm animate-fade-in">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                  <Icon className="h-4 w-4" style={{ color: s.color }} />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>New Password <span className="text-muted-foreground">(optional)</span></Label>
                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep" minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <PasswordInput value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} placeholder="Confirm new password" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" className="bg-brand-600 hover:bg-brand-700 transition-all hover:shadow-lg hover:shadow-brand-600/25 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
