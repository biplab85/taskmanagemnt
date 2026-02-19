'use client';

import api from '@/api/axios';
import type { Task, User } from '@/types';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, User as UserIcon, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';

interface SearchResults {
  tasks: Task[];
  users: User[];
}

type ResultItem =
  | { kind: 'task'; data: Task }
  | { kind: 'user'; data: User };

function flattenResults(results: SearchResults): ResultItem[] {
  const items: ResultItem[] = [];
  for (const task of results.tasks) items.push({ kind: 'task', data: task });
  for (const user of results.users) items.push({ kind: 'user', data: user });
  return items;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults(null);
      setActiveIndex(0);
    }
  }, [open]);

  const fetchResults = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await api.get<SearchResults>('/search', { params: { q } });
      setResults(res.data);
      setActiveIndex(0);
    } catch {
      setResults({ tasks: [], users: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchResults]);

  const flatItems = results ? flattenResults(results) : [];
  const totalItems = flatItems.length;

  const handleSelect = useCallback(
    (item: ResultItem) => {
      if (item.kind === 'task') {
        router.push('/kanban');
      } else {
        router.push('/settings');
      }
      setOpen(false);
    },
    [router]
  );

  // Keyboard navigation inside the dialog
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(totalItems, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[activeIndex]) {
        handleSelect(flatItems[activeIndex]);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const hasResults = results && (results.tasks.length > 0 || results.users.length > 0);
  const isEmpty = results && results.tasks.length === 0 && results.users.length === 0;

  // Running index used to compute global flat index per section item
  let globalIdx = 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="!top-[10vh] !translate-y-0 w-full max-w-2xl p-0 gap-0 rounded-xl border-0 shadow-2xl overflow-hidden"
      >
        <DialogTitle className="sr-only">Global Search</DialogTitle>

        {/* Search input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {loading ? (
            <svg
              className="size-5 shrink-0 text-muted-foreground animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : (
            <Search className="size-5 shrink-0 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, users..."
            className="
              flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground
              text-foreground caret-primary
            "
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground text-xs shrink-0 transition-colors"
              tabIndex={-1}
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground font-sans shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto overscroll-contain"
        >
          {/* Idle state */}
          {!query && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Search className="size-8 opacity-30" />
              <p className="text-sm">Type to search...</p>
              <p className="text-xs opacity-60">Tasks and users</p>
            </div>
          )}

          {/* Query too short */}
          {query.length === 1 && (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              Keep typing&hellip;
            </div>
          )}

          {/* No results */}
          {isEmpty && !loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <FileText className="size-8 opacity-30" />
              <p className="text-sm font-medium">No results found</p>
              <p className="text-xs opacity-60">Try a different search term</p>
            </div>
          )}

          {/* Tasks section */}
          {hasResults && results!.tasks.length > 0 && (
            <section className="px-2 pt-3 pb-1">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tasks
              </p>
              {results!.tasks.map((task) => {
                const idx = globalIdx++;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={`task-${task.id}`}
                    data-active={isActive}
                    onClick={() => handleSelect({ kind: 'task', data: task })}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                      transition-colors duration-75
                      ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'}
                    `}
                  >
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 min-w-0 truncate text-sm font-medium">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <ArrowRight
                      className={`size-3.5 shrink-0 text-muted-foreground transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
                    />
                  </button>
                );
              })}
            </section>
          )}

          {/* Users section */}
          {hasResults && results!.users.length > 0 && (
            <section className="px-2 pt-2 pb-3">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Users
              </p>
              {results!.users.map((user) => {
                const idx = globalIdx++;
                const isActive = idx === activeIndex;
                const initials = user.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                return (
                  <button
                    key={`user-${user.id}`}
                    data-active={isActive}
                    onClick={() => handleSelect({ kind: 'user', data: user })}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                      transition-colors duration-75
                      ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'}
                    `}
                  >
                    <Avatar className="size-7 shrink-0">
                      <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                      <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <span
                      className={`
                        shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full
                        ${
                          user.role === 'admin'
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }
                      `}
                    >
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                    <ArrowRight
                      className={`size-3.5 shrink-0 text-muted-foreground transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
                    />
                  </button>
                );
              })}
            </section>
          )}

          {/* Bottom hint */}
          {hasResults && (
            <div className="flex items-center justify-end gap-4 px-4 py-2 border-t border-border text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1">↵</kbd> select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1">ESC</kbd> close
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
