import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { Moon, Sun } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (!loading && user) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <button onClick={toggleTheme} className="absolute right-6 top-6 rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer">
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
      <Card className="w-full max-w-md border-0 shadow-2xl animate-scale-in">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto flex font-bold">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.projectName} className="h-full w-full object-contain p-0.5" />
            ) : (
              settings.logoText || 'S'
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your {settings.projectName} account</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400 animate-fade-in">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="admin@sklentr.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
            </div>
            <Button type="submit" className="w-full h-11 bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-600/25 transition-all hover:shadow-xl hover:shadow-brand-600/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Contact your administrator to get an account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
