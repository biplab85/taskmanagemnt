import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Columns3, Users, UserCircle, Settings, Inbox, AlertCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useSidebar } from '@/context/SidebarContext';
import api from '@/api/axios';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inbox', label: 'Inbox', icon: Inbox, showBadge: true },
  { to: '/kanban', label: 'Kanban Board', icon: Columns3 },
  { to: '/profile', label: 'Profile', icon: UserCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const adminItems = [
  { to: '/users', label: 'Users', icon: Users },
];

export function Sidebar() {
  const { isAdmin, needsProfileCompletion, user } = useAuth();
  const { settings } = useSettings();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchCount = () => {
      api.get<{ count: number }>('/notifications/unread-count')
        .then((res) => setUnreadCount(res.data.count))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className={`sidebar-wrapper fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar-bg text-sidebar-foreground transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className={`relative flex h-16 items-center border-b border-sidebar-border ${isCollapsed ? 'justify-center px-2' : 'px-5'}`}>
        {isCollapsed ? (
          <span className="text-2xl font-bold">{(settings.logoText || 'S').charAt(0)}</span>
        ) : settings.logoUrl ? (
          <img src={settings.logoUrl} alt={settings.projectName} className="w-full object-contain" />
        ) : (
          <span className="text-2xl font-bold tracking-tight">{settings.logoText || 'SKLENTR'}</span>
        )}
      </div>

      {/* Collapse toggle — absolute, straddles sidebar edge */}
      <button
        onClick={toggleSidebar}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute top-5 -right-3 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-bg text-sidebar-foreground/60 shadow-md transition-colors hover:bg-sidebar-accent hover:text-white cursor-pointer"
      >
        {isCollapsed ? (
          <PanelLeftOpen className="h-3.5 w-3.5" />
        ) : (
          <PanelLeftClose className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {!isCollapsed && (
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Menu
          </p>
        )}
        {navItems.map((item) => {
          const isActive = pathname === item.to;
          return (
            <Link
              key={item.to}
              href={item.to}
              title={isCollapsed ? item.label : undefined}
              className={`group relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                isCollapsed ? 'justify-center' : 'gap-3'
              } ${
                isActive
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white'
              }`}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!isCollapsed && <span className="flex-1">{item.label}</span>}
              {item.showBadge && unreadCount > 0 && (
                isCollapsed ? (
                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-sidebar-bg" />
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-blink" />
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  </span>
                )
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-sidebar-border" />
            {!isCollapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                Admin
              </p>
            )}
            {adminItems.map((item) => {
              const isActive = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  title={isCollapsed ? item.label : undefined}
                  className={`group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isCollapsed ? 'justify-center' : 'gap-3'
                  } ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white'
                  }`}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!isCollapsed && item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Profile completion banner — hidden when collapsed */}
      {!isCollapsed && needsProfileCompletion && (
        <div className="px-3 pb-2">
          <button
            onClick={() => router.push('/profile')}
            className="flex w-full items-center gap-2.5 rounded-xl bg-amber-500/15 px-3 py-2.5 text-left transition-all hover:bg-amber-500/25 cursor-pointer"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-amber-300">Complete Profile</p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-sidebar-border overflow-hidden">
                <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${user?.profile_completion ?? 0}%` }} />
              </div>
            </div>
            <span className="text-[11px] font-bold text-amber-400">{user?.profile_completion ?? 0}%</span>
          </button>
        </div>
      )}

      {/* Footer */}
      {!isCollapsed && (
        <div className="border-t border-sidebar-border px-3 py-4">
          <p className="text-[11px] text-sidebar-foreground/30 text-center truncate">{settings.projectName} &middot; v1.0</p>
        </div>
      )}
    </aside>
  );
}
