import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { Moon, Sun } from 'lucide-react';

export function RegisterPage() {
  const { register, user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirmation) { setError('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      await register(name, email, password, passwordConfirmation);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data;
      if (response?.errors) {
        setError(Object.values(response.errors)[0]?.[0] || 'Registration failed');
      } else {
        setError(response?.message || 'Registration failed');
      }
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white text-xl shadow-xl shadow-brand-500/30">
            S
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Get started with SKLENTR</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400 animate-fade-in">{error}</div>
            )}
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <PasswordInput placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <PasswordInput placeholder="Confirm password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} required className="h-11" />
            </div>
            <Button type="submit" className="w-full h-11 bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-600/25 transition-all hover:shadow-xl hover:shadow-brand-600/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
