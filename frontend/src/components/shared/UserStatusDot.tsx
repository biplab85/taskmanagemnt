import type { UserStatus } from '@/types';
import { USER_STATUSES } from '@/types';

const statusColors: Record<UserStatus, string> = {
  working: 'bg-emerald-500',
  busy: 'bg-red-500',
  in_meeting: 'bg-amber-500',
  vacation: 'bg-violet-500',
  offline: 'bg-gray-400',
};

export function UserStatusDot({ status, className = '' }: { status: UserStatus; className?: string }) {
  return (
    <span
      className={`block h-2.5 w-2.5 rounded-full ${statusColors[status]} ${className}`}
      title={USER_STATUSES.find((s) => s.value === status)?.label}
    />
  );
}
