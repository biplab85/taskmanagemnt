import { useState } from 'react';
import type { User } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatusDot } from '@/components/shared/UserStatusDot';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, Users } from 'lucide-react';

interface MultiUserSelectProps {
  users: User[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function MultiUserSelect({ users, selectedIds, onChange, disabled }: MultiUserSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const selectedUsers = users.filter((u) => selectedIds.includes(u.id));

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer min-h-[36px]"
        >
          {selectedUsers.length > 0 ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <div className="flex -space-x-2">
                {selectedUsers.slice(0, 4).map((u) => (
                  <Avatar key={u.id} className="h-6 w-6 ring-2 ring-background" title={u.name}>
                    {u.avatar && <AvatarImage src={`/storage/${u.avatar}`} />}
                    <AvatarFallback className="bg-brand-100 text-brand-700 text-[9px] font-bold dark:bg-brand-900 dark:text-brand-300">
                      {getInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {selectedUsers.length > 4 && (
                <span className="text-xs text-muted-foreground ml-1">+{selectedUsers.length - 4}</span>
              )}
              <span className="text-xs text-muted-foreground ml-1 truncate">
                {selectedUsers.length === 1 ? selectedUsers[0].name : `${selectedUsers.length} selected`}
              </span>
            </div>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground flex-1">
              <Users className="h-4 w-4" />
              Unassigned
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-8 text-sm"
          autoFocus
        />
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.length === 0 && (
            <p className="py-3 text-center text-xs text-muted-foreground">No users found</p>
          )}
          {filtered.map((u) => {
            const selected = selectedIds.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors cursor-pointer ${
                  selected ? 'bg-brand-50 dark:bg-brand-950/30' : 'hover:bg-accent'
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-7 w-7 ring-1 ring-border">
                    {u.avatar && <AvatarImage src={`/storage/${u.avatar}`} />}
                    <AvatarFallback className="bg-brand-100 text-brand-700 text-[10px] font-bold dark:bg-brand-900 dark:text-brand-300">
                      {getInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  {u.status && (
                    <UserStatusDot
                      status={u.status}
                      className="absolute -bottom-px -right-px h-2 w-2 ring-1 ring-background"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                </div>
                {selected && (
                  <Check className="h-4 w-4 shrink-0 text-brand-600" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
