import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '@/api/axios';

export interface KanbanColumn {
  id: number;
  slug: string;
  label: string;
  color: string;
  position: number;
  is_default: boolean;
}

interface KanbanColumnsContextType {
  columns: KanbanColumn[];
  loading: boolean;
  refetch: () => Promise<void>;
  getColumn: (slug: string) => KanbanColumn | undefined;
}

const FALLBACK_COLUMNS: KanbanColumn[] = [
  { id: 0, slug: 'backlog', label: 'Backlog', color: '#6b7280', position: 0, is_default: true },
  { id: 0, slug: 'todo', label: 'To Do', color: '#3b82f6', position: 1, is_default: false },
  { id: 0, slug: 'in_progress', label: 'In Progress', color: '#f59e0b', position: 2, is_default: false },
  { id: 0, slug: 'review', label: 'Review', color: '#8b5cf6', position: 3, is_default: false },
  { id: 0, slug: 'complete', label: 'Complete', color: '#10b981', position: 4, is_default: false },
];

const KanbanColumnsContext = createContext<KanbanColumnsContextType | undefined>(undefined);

export function KanbanColumnsProvider({ children }: { children: ReactNode }) {
  const [columns, setColumns] = useState<KanbanColumn[]>(FALLBACK_COLUMNS);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await api.get<KanbanColumn[]>('/kanban-columns');
      if (res.data.length > 0) {
        setColumns(res.data);
      }
    } catch {
      // Keep fallback columns on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const getColumn = useCallback(
    (slug: string) => columns.find((c) => c.slug === slug),
    [columns]
  );

  return (
    <KanbanColumnsContext.Provider value={{ columns, loading, refetch, getColumn }}>
      {children}
    </KanbanColumnsContext.Provider>
  );
}

export function useKanbanColumns() {
  const context = useContext(KanbanColumnsContext);
  if (!context) {
    throw new Error('useKanbanColumns must be used within a KanbanColumnsProvider');
  }
  return context;
}
