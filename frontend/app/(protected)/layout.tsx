'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { Shield } from 'lucide-react';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isImpersonating, returnToAdmin } = useAuth();
  const { isCollapsed } = useSidebar();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {isImpersonating && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm">
          <Shield className="h-4 w-4" />
          <span>You are impersonating <strong>{user.name}</strong></span>
          <button
            onClick={returnToAdmin}
            className="ml-2 rounded-md bg-white px-3 py-1 text-xs font-semibold text-amber-600 shadow-sm transition-colors hover:bg-amber-50 cursor-pointer"
          >
            Return to Admin
          </button>
        </div>
      )}
      <Sidebar />
      <div className={`transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        <Header />
        <main className="p-6">
          <Breadcrumbs />
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <GlobalSearch />
    </div>
  );
}
