import { Check } from 'lucide-react';

interface ProfileBadgeProps {
  completed?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProfileBadge({ completed, size = 'sm', className = '' }: ProfileBadgeProps) {
  if (!completed) return null;

  const sizeClasses = size === 'sm'
    ? 'h-3.5 w-3.5'
    : 'h-4.5 w-4.5';
  const iconSize = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ${sizeClasses} ${className}`}
      title="Profile Complete"
    >
      <Check className={iconSize} strokeWidth={3} />
    </div>
  );
}
