import { Pencil, Trash2, Laptop, Coffee, Phone, Palmtree, WifiOff } from 'lucide-react';
import type { User, UserStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatusDot } from '@/components/shared/UserStatusDot';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STATUS_ICONS: Record<UserStatus, typeof Laptop> = {
  working: Laptop,
  busy: Coffee,
  in_meeting: Phone,
  vacation: Palmtree,
  offline: WifiOff,
};

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: number) => void;
}

export function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  return (
    <div className="rounded-xl border bg-card shadow-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
            const StatusIcon = STATUS_ICONS[user.status || 'offline'];
            return (
              <TableRow key={user.id} className="transition-colors hover:bg-accent/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-9 w-9 ring-1 ring-border">
                        {user.avatar && <AvatarImage src={`/storage/${user.avatar}`} />}
                        <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-bold dark:bg-brand-900 dark:text-brand-300">{initials}</AvatarFallback>
                      </Avatar>
                      {user.status && <UserStatusDot status={user.status} className="absolute -bottom-px -right-px h-2.5 w-2.5 ring-2 ring-card" />}
                    </div>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={user.role === 'admin' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' : ''}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-sm capitalize text-muted-foreground">
                    <StatusIcon className="h-3.5 w-3.5" style={{ color: (() => { const colors: Record<string, string> = { working: '#10b981', busy: '#ef4444', in_meeting: '#f59e0b', vacation: '#8b5cf6', offline: '#6b7280' }; return colors[user.status || 'offline']; })() }} />
                    {(user.status || 'offline').replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(user)} className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-accent hover:text-brand-600 hover:shadow-sm cursor-pointer">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(user.id)} className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-accent hover:text-red-600 hover:shadow-sm cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No users found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
