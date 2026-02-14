import { useState, useEffect } from 'react';
import { LogOut, Moon, Sun, Bell, UserCircle, Settings, Laptop, Coffee, Phone, Palmtree, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/api/axios';
import type { Notification, UserStatus } from '@/types';
import { USER_STATUSES } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserStatusDot } from '@/components/shared/UserStatusDot';

const STATUS_ICONS: Record<UserStatus, typeof Laptop> = {
  working: Laptop,
  busy: Coffee,
  in_meeting: Phone,
  vacation: Palmtree,
  offline: WifiOff,
};

export function Header() {
  const { user, logout, updateUserStatus } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread count every 15s
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

  const fetchNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get<Notification[]>('/notifications'),
        api.get<{ count: number }>('/notifications/unread-count'),
      ]);
      setNotifications(notifRes.data);
      setUnreadCount(countRes.data.count);
    } catch { /* ignore */ }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch { /* ignore */ }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }
    if (n.task_id) {
      router.push('/kanban');
    }
  };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  const currentStatusInfo = USER_STATUSES.find((s) => s.value === user?.status) || USER_STATUSES[4];
  const CurrentStatusIcon = STATUS_ICONS[user?.status || 'offline'];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-xl">
      <div />

      <div className="flex items-center gap-2">
        {/* Status dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <CurrentStatusIcon className="h-4 w-4" style={{ color: currentStatusInfo.color }} />
                <span className="hidden sm:inline">{currentStatusInfo.label}</span>
                <UserStatusDot status={user?.status || 'offline'} className="h-2 w-2" />
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Set your status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {USER_STATUSES.map((s) => {
              const Icon = STATUS_ICONS[s.value];
              const isActive = user?.status === s.value;
              return (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() => updateUserStatus(s.value)}
                  className={`gap-3 cursor-pointer ${isActive ? 'bg-brand-50 dark:bg-brand-950/30' : ''}`}
                >
                  <Icon className="h-4 w-4" style={{ color: s.color }} />
                  <span className="flex-1 font-medium">{s.label}</span>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu onOpenChange={(open) => { if (open) fetchNotifications(); }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer">
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-blink">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer">
                  Mark all read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications</div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-muted/50 ${!n.is_read ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                      {!n.is_read && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600 animate-blink" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </button>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="px-3 py-2">
              <Link
                href="/inbox"
                className="block text-center text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                View all notifications
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 outline-none transition-colors hover:bg-accent cursor-pointer">
            <span className="hidden text-sm font-medium sm:block">{user?.name}</span>
            <div className="relative">
              <Avatar className="h-8 w-8 ring-2 ring-border">
                {user?.avatar && <AvatarImage src={`/storage/${user.avatar}`} />}
                <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-bold dark:bg-brand-900 dark:text-brand-300">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {user?.status && <UserStatusDot status={user.status} className="absolute -bottom-0.5 -right-0.5 ring-2 ring-card" />}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
              <UserCircle className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 dark:text-red-400 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
