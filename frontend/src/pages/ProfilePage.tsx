import { useState, type FormEvent } from 'react';
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
import { Camera, Save, Shield, Laptop, Coffee, Phone, Palmtree, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_ICONS: Record<UserStatus, typeof Laptop> = {
  working: Laptop,
  busy: Coffee,
  in_meeting: Phone,
  vacation: Palmtree,
  offline: WifiOff,
};

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [status, setStatus] = useState<UserStatus>(user?.status || 'offline');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');

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
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-brand-600 to-brand-800" />
        <CardContent className="relative pb-6">
          <div className="flex items-end gap-4 -mt-12">
            <div className="relative group">
              <Avatar className="h-24 w-24 ring-4 ring-card shadow-xl">
                {avatarUrl && <AvatarImage src={`/storage/${avatarUrl}`} />}
                <AvatarFallback className="bg-brand-100 text-brand-700 text-2xl font-bold dark:bg-brand-900 dark:text-brand-300">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-6 w-6 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
              </label>
              <UserStatusDot
                status={status}
                className="absolute bottom-1 right-1 h-4 w-4 ring-3 ring-card"
              />
            </div>
            <div className="mb-1">
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span className="capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status selector */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {USER_STATUSES.map((s) => {
              const Icon = STATUS_ICONS[s.value];
              return (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                    status === s.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500 dark:bg-brand-950/30 dark:text-brand-400'
                      : 'border-border hover:bg-accent hover:shadow-sm'
                  }`}
                >
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
