import { Columns3, List, LayoutGrid, Table2, CalendarDays } from 'lucide-react';

export type ViewMode = 'board' | 'list' | 'grid' | 'table' | 'calendar';

const views: { value: ViewMode; label: string; icon: typeof Columns3 }[] = [
  { value: 'board', label: 'Board', icon: Columns3 },
  { value: 'list', label: 'List', icon: List },
  { value: 'grid', label: 'Grid', icon: LayoutGrid },
  { value: 'table', label: 'Table', icon: Table2 },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
];

interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center rounded-xl border bg-muted/50 p-1 dark:bg-muted/30">
      {views.map((view) => {
        const isActive = value === view.value;
        return (
          <button
            key={view.value}
            onClick={() => onChange(view.value)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={view.label}
          >
            <view.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
