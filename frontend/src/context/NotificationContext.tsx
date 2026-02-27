'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '@/api/axios';
import type { Notification, Message } from '@/types';

interface NotificationContextValue {
  // Notifications
  unreadCount: number;
  notifications: Notification[];
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAsUnread: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearRead: () => Promise<void>;
  bulkMarkNotificationsRead: (ids: number[]) => Promise<void>;
  bulkMarkNotificationsUnread: (ids: number[]) => Promise<void>;
  bulkDeleteNotifications: (ids: number[]) => Promise<void>;
  trashedNotifications: Notification[];
  fetchTrashedNotifications: () => Promise<void>;
  restoreNotification: (id: number) => Promise<void>;
  forceDeleteNotification: (id: number) => Promise<void>;

  // Messages
  messageUnreadCount: number;
  messages: Message[];
  sentMessages: Message[];
  trashedMessages: Message[];
  messagesLoading: boolean;
  fetchMessages: () => Promise<void>;
  fetchSentMessages: () => Promise<void>;
  fetchTrashedMessages: () => Promise<void>;
  sendMessage: (formData: FormData) => Promise<void>;
  markMessageRead: (id: number) => Promise<void>;
  markMessageUnread: (id: number) => Promise<void>;
  deleteMessage: (id: number) => Promise<void>;
  restoreMessage: (id: number) => Promise<void>;
  forceDeleteMessage: (id: number) => Promise<void>;
  bulkMarkMessagesRead: (ids: number[]) => Promise<void>;
  bulkMarkMessagesUnread: (ids: number[]) => Promise<void>;
  bulkDeleteMessages: (ids: number[]) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [trashedNotifications, setTrashedNotifications] = useState<Notification[]>([]);

  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [trashedMessages, setTrashedMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const [notifRes, msgRes] = await Promise.all([
        api.get<{ count: number }>('/notifications/unread-count'),
        api.get<{ count: number }>('/messages/unread-count'),
      ]);
      setUnreadCount(notifRes.data.count);
      setMessageUnreadCount(msgRes.data.count);
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

  const fetchTrashedNotifications = useCallback(async () => {
    try {
      const res = await api.get<Notification[]>('/notifications/trash');
      setTrashedNotifications(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchMessages = useCallback(async () => {
    setMessagesLoading(true);
    try {
      const [msgRes, countRes] = await Promise.all([
        api.get<Message[]>('/messages/inbox'),
        api.get<{ count: number }>('/messages/unread-count'),
      ]);
      setMessages(msgRes.data);
      setMessageUnreadCount(countRes.data.count);
    } catch { /* ignore */ }
    finally { setMessagesLoading(false); }
  }, []);

  const fetchSentMessages = useCallback(async () => {
    try {
      const res = await api.get<Message[]>('/messages/sent');
      setSentMessages(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchTrashedMessages = useCallback(async () => {
    try {
      const res = await api.get<Message[]>('/messages/trash');
      setTrashedMessages(res.data);
    } catch { /* ignore */ }
  }, []);

  // Poll unread counts every 15s
  useEffect(() => {
    fetchUnreadCounts();
    intervalRef.current = setInterval(fetchUnreadCounts, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchUnreadCounts]);

  // --- Notification actions ---
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

  const restoreNotification = useCallback(async (id: number) => {
    await api.post(`/notifications/${id}/restore`);
    setTrashedNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const forceDeleteNotification = useCallback(async (id: number) => {
    await api.delete(`/notifications/${id}/force`);
    setTrashedNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const bulkMarkNotificationsRead = useCallback(async (ids: number[]) => {
    await api.post('/notifications/bulk-read', { ids });
    setNotifications((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, is_read: true } : n));
    setUnreadCount((c) => Math.max(0, c - ids.length));
  }, []);

  const bulkMarkNotificationsUnread = useCallback(async (ids: number[]) => {
    await api.post('/notifications/bulk-unread', { ids });
    setNotifications((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, is_read: false } : n));
    await fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  const bulkDeleteNotifications = useCallback(async (ids: number[]) => {
    await api.post('/notifications/bulk-delete', { ids });
    const removedUnread = notifications.filter((n) => ids.includes(n.id) && !n.is_read).length;
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    setUnreadCount((c) => Math.max(0, c - removedUnread));
  }, [notifications]);

  // --- Message actions ---
  const sendMessage = useCallback(async (formData: FormData) => {
    await api.post('/messages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }, []);

  const markMessageRead = useCallback(async (id: number) => {
    await api.put(`/messages/${id}/read`);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
    setMessageUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markMessageUnread = useCallback(async (id: number) => {
    await api.put(`/messages/${id}/unread`);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: false } : m)));
    setMessageUnreadCount((c) => c + 1);
  }, []);

  const deleteMessage = useCallback(async (id: number) => {
    const removed = messages.find((m) => m.id === id);
    await api.delete(`/messages/${id}`);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setSentMessages((prev) => prev.filter((m) => m.id !== id));
    if (removed && !removed.is_read) setMessageUnreadCount((c) => Math.max(0, c - 1));
  }, [messages]);

  const restoreMessage = useCallback(async (id: number) => {
    await api.post(`/messages/${id}/restore`);
    setTrashedMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const forceDeleteMessage = useCallback(async (id: number) => {
    await api.delete(`/messages/${id}/force`);
    setTrashedMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const bulkMarkMessagesRead = useCallback(async (ids: number[]) => {
    await api.post('/messages/bulk-read', { ids });
    setMessages((prev) => prev.map((m) => ids.includes(m.id) ? { ...m, is_read: true } : m));
    setMessageUnreadCount((c) => Math.max(0, c - ids.length));
  }, []);

  const bulkMarkMessagesUnread = useCallback(async (ids: number[]) => {
    await api.post('/messages/bulk-unread', { ids });
    setMessages((prev) => prev.map((m) => ids.includes(m.id) ? { ...m, is_read: false } : m));
    await fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  const bulkDeleteMessages = useCallback(async (ids: number[]) => {
    await api.post('/messages/bulk-delete', { ids });
    const removedUnread = messages.filter((m) => ids.includes(m.id) && !m.is_read).length;
    setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    setSentMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    setMessageUnreadCount((c) => Math.max(0, c - removedUnread));
  }, [messages]);

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
        bulkMarkNotificationsRead,
        bulkMarkNotificationsUnread,
        bulkDeleteNotifications,
        trashedNotifications,
        fetchTrashedNotifications,
        restoreNotification,
        forceDeleteNotification,
        messageUnreadCount,
        messages,
        sentMessages,
        trashedMessages,
        messagesLoading,
        fetchMessages,
        fetchSentMessages,
        fetchTrashedMessages,
        sendMessage,
        markMessageRead,
        markMessageUnread,
        deleteMessage,
        restoreMessage,
        forceDeleteMessage,
        bulkMarkMessagesRead,
        bulkMarkMessagesUnread,
        bulkDeleteMessages,
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
