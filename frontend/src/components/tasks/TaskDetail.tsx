import { useEffect, useState } from 'react';
import api from '@/api/axios';
import type { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Download } from 'lucide-react';

interface TaskDetailProps {
  taskId: number;
}

export function TaskDetail({ taskId }: TaskDetailProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Task>(`/tasks/${taskId}`).then((res) => {
      setTask(res.data);
      setLoading(false);
    });
  }, [taskId]);

  if (loading || !task) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{task.title}</CardTitle>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.description && (
            <div>
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-gray-700">{task.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-500">Assignee</p>
              <p className="mt-1">{task.assignee?.name || 'Unassigned'}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Creator</p>
              <p className="mt-1">{task.creator?.name}</p>
            </div>
            {task.start_date && (
              <div>
                <p className="font-medium text-gray-500">Start Date</p>
                <p className="mt-1">{task.start_date}</p>
              </div>
            )}
            {task.end_date && (
              <div>
                <p className="font-medium text-gray-500">End Date</p>
                <p className="mt-1">{task.end_date}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      {task.comments && task.comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comments ({task.comments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.comments.map((comment) => {
              const initials = comment.user?.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
              return (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{comment.user?.name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{comment.body}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {task.attachments && task.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attachments ({task.attachments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {task.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{att.file_name}</p>
                  <p className="text-xs text-gray-500">{formatSize(att.file_size)}</p>
                </div>
                <a
                  href={`/storage/${att.file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
