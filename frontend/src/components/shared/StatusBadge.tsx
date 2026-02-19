import { Badge } from '@/components/ui/badge';
import { useKanbanColumns } from '@/context/KanbanColumnsContext';

export function StatusBadge({ status }: { status: string }) {
  const { getColumn } = useKanbanColumns();
  const col = getColumn(status);
  const label = col?.label || status;
  const color = col?.color || '#6b7280';

  return (
    <Badge
      variant="secondary"
      style={{
        backgroundColor: color + '20',
        color: color,
        borderColor: color + '40',
      }}
    >
      {label}
    </Badge>
  );
}
