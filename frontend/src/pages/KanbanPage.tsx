import { KanbanBoard } from '@/components/kanban/KanbanBoard';

export function KanbanPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Kanban Board</h1>
        <p className="text-sm text-muted-foreground">Drag and drop tasks between columns to update their status</p>
      </div>
      <KanbanBoard />
    </div>
  );
}
