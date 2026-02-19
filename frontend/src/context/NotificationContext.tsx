'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '@/api/axios';
import type { Notification } from '@/types';

interface NotificationContextValue {
  unreadCount: number;
  notifications: Notification[];
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAsUnread: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch { /* ignore */ }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get<Notification[]>('/notifications'),
        api.get<{ count: number }>('/notifications/unread-count'),
      ]);
      setNotifications(notifRes.data);
      setUnreadCount(countRes.data.count);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // Poll unread count every 15s (single shared poll)
  useEffect(() => {
    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchUnreadCount]);

  const markAsRead = useCallback(async (id: number) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAsUnread = useCallback(async (id: number) => {
    await api.put(`/notifications/${id}/unread`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)));
    setUnreadCount((c) => c + 1);
  }, []);

  const markAllRead = useCallback(async () => {
    await api.put('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  const deleteNotification = useCallback(async (id: number) => {
    const removed = notifications.find((n) => n.id === id);
    await api.delete(`/notifications/${id}`);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (removed && !removed.is_read) setUnreadCount((c) => Math.max(0, c - 1));
  }, [notifications]);

  const clearRead = useCallback(async () => {
    await api.delete('/notifications/clear-read');
    setNotifications((prev) => prev.filter((n) => !n.is_read));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        loading,
        fetchNotifications,
        markAsRead,
        markAsUnread,
        markAllRead,
        deleteNotification,
        clearRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
