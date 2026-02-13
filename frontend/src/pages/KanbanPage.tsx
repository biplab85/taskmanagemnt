import { KanbanBoard } from '@/components/kanban/KanbanBoard';

export function KanbanPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Tasks</h1>
      </div>
      <KanbanBoard />
    </div>
  );
}
