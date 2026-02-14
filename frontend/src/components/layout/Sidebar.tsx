import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Columns3, Users, UserCircle, Settings, Inbox, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
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
  const navigate = useNavigate();
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
    <aside className="sidebar-wrapper fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar-bg text-sidebar-foreground">
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-6">
        <div className="flex items-center justify-center">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.projectName} className="h-full w-full object-contain p-0.5" />
          ) : (
            settings.logoText || 'S'
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Menu
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white'
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            <span className="flex-1">{item.label}</span>
            {item.showBadge && unreadCount > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-blink" />
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </span>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-sidebar-border" />
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Admin
            </p>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white'
                  }`
                }
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {needsProfileCompletion && (
        <div className="px-3 pb-2">
          <button
            onClick={() => navigate('/profile')}
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
      <div className="border-t border-sidebar-border px-3 py-4">
        <p className="text-[11px] text-sidebar-foreground/30 text-center truncate">{settings.projectName} &middot; v1.0</p>
      </div>
    </aside>
  );
}
