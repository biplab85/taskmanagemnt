import type { UserStatus } from '@/types';
import { USER_STATUSES } from '@/types';

const statusColors: Record<UserStatus, string> = {
  working: 'bg-emerald-500',
  busy: 'bg-red-500',
  in_meeting: 'bg-amber-500',
  vacation: 'bg-violet-500',
  offline: 'bg-gray-400',
};

interface UserStatusDotProps {
  status: UserStatus;
  isOnLeave?: boolean;
  className?: string;
}

export function UserStatusDot({ status, isOnLeave, className = '' }: UserStatusDotProps) {
  if (isOnLeave) {
    return (
      <span
        className={`block rounded-full bg-orange-500 animate-pulse ${className}`}
        style={{ minHeight: '0.625rem', minWidth: '0.625rem' }}
        title="On Leave"
      />
    );
  }

  return (
    <span
      className={`block h-2.5 w-2.5 rounded-full ${statusColors[status]} ${className}`}
      title={USER_STATUSES.find((s) => s.value === status)?.label}
    />
  );
}
