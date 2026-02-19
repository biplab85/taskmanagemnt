'use client';

import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface Shortcut {
  key: string;
  label: string;
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { key: 'N', label: 'N', description: 'New task' },
  { key: 'F', label: 'F', description: 'Focus search / filter' },
  { key: '?', label: '?', description: 'Show keyboard shortcuts' },
  { key: 'Ctrl+K', label: '⌘K', description: 'Global search' },
  { key: '1', label: '1', description: 'Board view' },
  { key: '2', label: '2', description: 'List view' },
  { key: '3', label: '3', description: 'Grid view' },
  { key: '4', label: '4', description: 'Table view' },
  { key: '5', label: '5', description: 'Calendar view' },
  { key: 'Escape', label: 'Esc', description: 'Close modal / drawer' },
];

interface KeyboardShortcutsProps {
  onNewTask?: () => void;
  onFocusSearch?: () => void;
  onViewChange?: (view: string) => void;
}

export function KeyboardShortcuts({ onNewTask, onFocusSearch, onViewChange }: KeyboardShortcutsProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) return;

      // Skip if modifier keys (except for Ctrl+K which is handled by GlobalSearch)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case 'n':
        case 'N':
          e.preventDefault();
          onNewTask?.();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          onFocusSearch?.();
          break;
        case '?':
          e.preventDefault();
          setHelpOpen(true);
          break;
        case '1':
          e.preventDefault();
          onViewChange?.('board');
          break;
        case '2':
          e.preventDefault();
          onViewChange?.('list');
          break;
        case '3':
          e.preventDefault();
          onViewChange?.('grid');
          break;
        case '4':
          e.preventDefault();
          onViewChange?.('table');
          break;
        case '5':
          e.preventDefault();
          onViewChange?.('calendar');
          break;
      }
    },
    [onNewTask, onFocusSearch, onViewChange]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-lg font-semibold">Keyboard Shortcuts</DialogTitle>
        <div className="mt-2 space-y-1">
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50"
            >
              <span className="text-sm text-foreground/80">{s.description}</span>
              <kbd className="inline-flex min-w-[28px] items-center justify-center rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                {s.label}
              </kbd>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground text-center">
          Press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">?</kbd> anywhere to show this dialog
        </p>
      </DialogContent>
    </Dialog>
  );
}
