import { useState, useEffect } from 'react';
import { Tag, Plus, X, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/api/axios';
import type { Label } from '@/types';

interface LabelSelectProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

const PALETTE = [
  { hex: '#ef4444', label: 'Red' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#10b981', label: 'Green' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#6b7280', label: 'Gray' },
];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function LabelSelect({ selectedIds, onChange }: LabelSelectProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0].hex);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .get<Label[]>('/labels')
      .then((res) => setLabels(res.data))
      .catch(() => {
        // silently ignore — labels are optional
      });
  }, []);

  const selectedLabels = labels.filter((l) => selectedIds.includes(l.id));

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeLabel = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((i) => i !== id));
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error('Label name is required');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post<Label>('/labels', { name: trimmed, color: newColor });
      const created = res.data;
      setLabels((prev) => [...prev, created]);
      onChange([...selectedIds, created.id]);
      setNewName('');
      setNewColor(PALETTE[0].hex);
      toast.success(`Label "${created.name}" created`);
    } catch {
      toast.error('Failed to create label');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Selected label pills */}
      {selectedLabels.map((label) => (
        <span
          key={label.id}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: hexToRgba(label.color, 0.2),
            color: label.color,
          }}
        >
          {label.name}
          <button
            type="button"
            onClick={(e) => removeLabel(label.id, e)}
            className="ml-0.5 rounded-full p-px hover:opacity-70 focus:outline-none cursor-pointer"
            aria-label={`Remove label ${label.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {/* "+" trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-2 py-0.5 text-xs text-muted-foreground hover:border-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
            aria-label="Add label"
          >
            <Tag className="h-3 w-3" />
            <Plus className="h-3 w-3" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-60 p-0" align="start">
          {/* Label list */}
          <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
            {labels.length === 0 && (
              <p className="py-3 text-center text-xs text-muted-foreground">No labels yet</p>
            )}
            {labels.map((label) => {
              const selected = selectedIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggle(label.id)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors cursor-pointer ${
                    selected ? 'bg-accent' : 'hover:bg-accent'
                  }`}
                >
                  {/* Color dot */}
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 truncate text-sm">{label.name}</span>
                  {selected && <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Create new label */}
          <div className="p-2 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground px-0.5">
              New label
            </p>
            <Input
              placeholder="Label name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              className="h-7 text-xs"
            />
            {/* Color palette */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => setNewColor(c.hex)}
                  className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer focus:outline-none"
                  style={{
                    backgroundColor: c.hex,
                    borderColor: newColor === c.hex ? c.hex : 'transparent',
                    boxShadow: newColor === c.hex ? `0 0 0 2px white, 0 0 0 3px ${c.hex}` : undefined,
                  }}
                  aria-label={c.label}
                  aria-pressed={newColor === c.hex}
                />
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              className="h-7 w-full text-xs"
              disabled={creating || !newName.trim()}
              onClick={handleCreate}
            >
              {creating ? 'Adding…' : 'Add Label'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
