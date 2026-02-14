import type { ReactNode } from 'react';
import type { User } from '@/types';
import { USER_STATUSES } from '@/types';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatusDot } from '@/components/shared/UserStatusDot';
import { Mail, Phone, MapPin, Building2, CheckCircle2 } from 'lucide-react';

interface UserHoverCardProps {
  user: User;
  children: ReactNode;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserHoverCard({ user, children }: UserHoverCardProps) {
  const statusInfo = USER_STATUSES.find((s) => s.value === user.status);

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-72">
        {/* Gradient header */}
        <div className="relative h-16 rounded-t-xl bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-600 dark:to-brand-900" />

        {/* Avatar overlapping the header */}
        <div className="px-4 -mt-8">
          <div className="relative inline-block">
            <Avatar className="h-14 w-14 ring-4 ring-popover shadow-lg">
              {user.avatar && <AvatarImage src={`/storage/${user.avatar}`} />}
              <AvatarFallback className="bg-brand-100 text-brand-700 text-lg font-bold dark:bg-brand-900 dark:text-brand-300">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            {user.status && (
              <UserStatusDot
                status={user.status}
                className="absolute bottom-0 right-0 h-3.5 w-3.5 ring-[3px] ring-popover"
              />
            )}
          </div>
        </div>

        {/* User info */}
        <div className="px-4 pt-2 pb-4 space-y-3">
          {/* Name & status */}
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-semibold leading-tight">{user.name}</h4>
              {user.profile_completed && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              )}
            </div>
            {user.role === 'admin' && (
              <span className="inline-block mt-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                Admin
              </span>
            )}
            {statusInfo && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: statusInfo.color }}
                />
                <span className="text-xs text-muted-foreground">{statusInfo.label}</span>
              </div>
            )}
          </div>

          {/* Contact details */}
          <div className="space-y-1.5 border-t pt-3">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0 text-brand-500" />
              <span className="truncate">{user.email}</span>
            </div>

            {user.phone && (
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                <span>{user.phone}</span>
              </div>
            )}

            {user.department && (
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                <span>{user.department}</span>
              </div>
            )}

            {user.location && (
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                <span>{user.location}</span>
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
