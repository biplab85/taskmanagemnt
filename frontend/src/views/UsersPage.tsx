import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import api from '@/api/axios';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { UserTable } from '@/components/users/UserTable';
import { UserFormDialog } from '@/components/users/UserFormDialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get<User[]>('/users');
      setUsers(res.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Keep current user's status in sync with the table
  useEffect(() => {
    if (currentUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id ? { ...u, status: currentUser.status } : u
        )
      );
    }
  }, [currentUser?.id, currentUser?.status]);

  const handleCreate = () => { setEditingUser(null); setDialogOpen(true); };
  const handleEdit = (user: User) => { setEditingUser(user); setDialogOpen(true); };
  const handleDelete = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success('User deleted successfully');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete');
    }
  };
  const handleSaved = () => { setDialogOpen(false); setEditingUser(null); fetchUsers(); };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage users and their roles</p>
        </div>
        <Button onClick={handleCreate} className="bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-600/25 transition-all hover:shadow-xl hover:shadow-brand-600/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>
      <UserTable users={users} onEdit={handleEdit} onDelete={handleDelete} />
      <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} user={editingUser} onSaved={handleSaved} />
    </div>
  );
}
