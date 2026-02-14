import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCenter,
  rectIntersection,
  type CollisionDetection,
  pointerWithin,
  getFirstCollision,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Plus, Search, Filter } from 'lucide-react';
import api from '@/api/axios';
import type { Task, TaskStatus, User, UserStatus } from '@/types';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { TaskDrawer } from './TaskDrawer';
import { ListView } from './ListView';
import { GridView } from './GridView';
import { TableView } from './TableView';
import { CalendarView } from './CalendarView';
import { ViewSwitcher, type ViewMode } from './ViewSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export function KanbanBoard() {
  const { onStatusChange } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // View mode with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('kanban-view-mode') as ViewMode) || 'board';
  });

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('kanban-view-mode', mode);
  };

  const fetchTasks = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (assigneeFilter !== 'all') params.assigned_to = assigneeFilter;
      const res = await api.get<Task[]>('/tasks', { params });
      setTasks(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, priorityFilter, assigneeFilter]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get<User[]>('/users');
      setUsers(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchTasks(); fetchUsers(); }, [fetchTasks, fetchUsers]);

  // Subscribe to user status changes from the auth context
  useEffect(() => {
    return onStatusChange((userId: number, newStatus: UserStatus) => {
      // Update the users list
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
      // Update assignees inside each task
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          assignees: t.assignees?.map((a) =>
            a.id === userId ? { ...a, status: newStatus } : a
          ),
        }))
      );
    });
  }, [onStatusChange]);

  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  // DnD collision detection (board view only)
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    const intersections = rectIntersection(args);

    if (pointerCollisions.length > 0) {
      const columnCollision = pointerCollisions.find((c) =>
        TASK_STATUSES.some((s) => s.value === c.id)
      );
      if (columnCollision) {
        const taskCollisions = closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (c) => !TASK_STATUSES.some((s) => s.value === c.id)
          ),
        });
        if (taskCollisions.length > 0) return taskCollisions;
        return [columnCollision];
      }
      return pointerCollisions;
    }

    if (intersections.length > 0) {
      const first = getFirstCollision(intersections);
      if (first) return [first];
    }

    return closestCenter(args);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === Number(event.active.id));
    setActiveTask(task || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = Number(active.id);
    const overId = String(over.id);

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    let targetStatus: TaskStatus | null = null;

    if (TASK_STATUSES.some((s) => s.value === overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === Number(overId));
      if (overTask) targetStatus = overTask.status;
    }

    if (targetStatus && activeTaskItem.status !== targetStatus) {
      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === activeId ? { ...t, status: targetStatus } : t
        );
        return updated;
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = Number(active.id);
    const overId = String(over.id);

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    let targetStatus = activeTaskItem.status;
    if (TASK_STATUSES.some((s) => s.value === overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === Number(overId));
      if (overTask) targetStatus = overTask.status;
    }

    const columnTasks = tasks
      .filter((t) => t.status === targetStatus)
      .sort((a, b) => a.position - b.position);

    const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
    const overIndex = columnTasks.findIndex((t) => t.id === Number(overId));

    let reorderedColumn: Task[];
    if (oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex) {
      reorderedColumn = arrayMove(columnTasks, oldIndex, overIndex);
    } else {
      reorderedColumn = columnTasks;
    }

    const updatedTasks = reorderedColumn.map((t, index) => ({
      ...t,
      position: index,
      status: targetStatus,
    }));

    setTasks((prev) => {
      const otherTasks = prev.filter((t) => !updatedTasks.find((u) => u.id === t.id));
      return [...otherTasks, ...updatedTasks];
    });

    try {
      await api.put('/tasks-reorder', {
        tasks: updatedTasks.map((t) => ({
          id: t.id,
          status: t.status,
          position: t.position,
        })),
      });
    } catch {
      fetchTasks();
    }
  };

  const handleCreateTask = () => { setEditingTask(null); setModalOpen(true); };
  const handleEditTask = (task: Task) => { setEditingTask(task); setModalOpen(true); };
  const handleViewTask = (taskId: number) => {
    setDrawerTaskId(taskId);
    setDrawerOpen(true);
  };
  const handleDeleteTask = async (taskId: number) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };
  const handleTaskSaved = () => { setModalOpen(false); setEditingTask(null); fetchTasks(); };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  // View descriptions for the page subtitle
  const viewDescriptions: Record<ViewMode, string> = {
    board: 'Drag and drop tasks between columns to update their status',
    list: 'Tasks organized by status in a compact list',
    grid: 'Tasks displayed as cards in a responsive grid',
    table: 'All task details in a sortable data table',
    calendar: 'Tasks plotted on a calendar by due date',
  };

  return (
    <>
      {/* Filters bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36 cursor-pointer">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {users.length > 0 && (
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-40 cursor-pointer">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button onClick={handleCreateTask} className="ml-auto bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-600/25 transition-all hover:shadow-xl hover:shadow-brand-600/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* View switcher */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground hidden sm:block">
          {viewDescriptions[viewMode]}
        </p>
        <ViewSwitcher value={viewMode} onChange={handleViewModeChange} />
      </div>

      {/* View content */}
      <div key={viewMode}>
        {viewMode === 'board' && (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {TASK_STATUSES.map((status) => (
                <KanbanColumn
                  key={status.value}
                  status={status.value}
                  label={status.label}
                  color={status.color}
                  tasks={getTasksByStatus(status.value)}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onViewTask={handleViewTask}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        )}

        {viewMode === 'list' && (
          <ListView
            tasks={tasks}
            onView={handleViewTask}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
          />
        )}

        {viewMode === 'grid' && (
          <GridView
            tasks={tasks}
            onView={handleViewTask}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
          />
        )}

        {viewMode === 'table' && (
          <TableView
            tasks={tasks}
            onView={handleViewTask}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
          />
        )}

        {viewMode === 'calendar' && (
          <CalendarView
            tasks={tasks}
            onView={handleViewTask}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
          />
        )}
      </div>

      <TaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        task={editingTask}
        users={users}
        onSaved={handleTaskSaved}
      />

      <TaskDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        taskId={drawerTaskId}
        users={users}
        onTaskUpdated={fetchTasks}
      />
    </>
  );
}
