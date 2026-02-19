import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-8' : 'py-16'
      }`}
    >
      <div
        className={`mb-4 flex items-center justify-center rounded-2xl bg-muted/60 ${
          compact ? 'h-12 w-12' : 'h-16 w-16'
        }`}
      >
        <Icon
          className={`text-muted-foreground/50 ${compact ? 'h-6 w-6' : 'h-8 w-8'}`}
        />
      </div>
      <h3
        className={`font-semibold text-foreground/80 ${
          compact ? 'text-sm' : 'text-base'
        }`}
      >
        {title}
      </h3>
      {description && (
        <p
          className={`mt-1 max-w-xs text-muted-foreground ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {description}
        </p>
      )}
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
