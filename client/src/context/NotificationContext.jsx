import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from './AuthContext';
import { getNotifications, markNotificationReadApi, markAllNotificationsReadApi } from '../api/notificationApi';

export const NotificationContext = createContext(null);

// PHASE 13 / Section 16 — dedupe by id, never a blind overwrite. This is
// what keeps a realtime notification that arrives right before/after the
// initial fetch resolves from being lost OR duplicated.
function mergeById(newItems, existing) {
  const map = new Map(existing.map((n) => [n.id, n]));
  newItems.forEach((n) => map.set(n.id, n));
  return [...map.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadedOnceRef = useRef(false);

  // Reset on logout — same key-off-user pattern as SocketProvider.
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setPage(1);
      setHasMore(false);
      loadedOnceRef.current = false;
    }
  }, [user]);

  const fetchInitial = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await getNotifications(1, 20);
      setNotifications((prev) => mergeById(data.notifications, prev));
      setUnreadCount(data.unreadCount);
      setPage(data.pagination.page);
      setHasMore(data.pagination.hasMore);
      loadedOnceRef.current = true;
    } catch {
      // Bell just stays at its last known state; no need to toast on a background load failure.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !loadedOnceRef.current) fetchInitial();
  }, [user, fetchInitial]);

  // Section 15 — independent pagination. Never resets unreadCount as a
  // side effect of loading older pages; still takes the server's fresh
  // number (it's a flat count, not derived from the loaded page) rather
  // than leaving the old one stale.
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await getNotifications(page + 1, 20);
      setNotifications((prev) => mergeById(data.notifications, prev));
      setPage(data.pagination.page);
      setHasMore(data.pagination.hasMore);
      setUnreadCount(data.unreadCount);
    } catch {
      // keep current state; the "Load more" button just stays clickable for retry
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page]);

  const markAsRead = useCallback(async (notificationId) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
    try {
      const { data } = await markNotificationReadApi(notificationId);
      setUnreadCount(data.unreadCount);
    } catch {
      // A missed socket event or the next fetch will reconcile this.
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsReadApi();
    } catch {
      // Same reconciliation story as markAsRead.
    }
  }, []);

  // Realtime — every handler is a targeted merge/patch, never a refetch
  // of the whole list (Section 22/27).
  useEffect(() => {
    if (!socket) return;

    const handleNew = ({ notification, unreadCount: count }) => {
      setNotifications((prev) => mergeById([notification], prev));
      setUnreadCount(count);
    };

    const handleRead = ({ id, unreadCount: count }) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount(count);
    };

    const handleReadAll = ({ unreadCount: count }) => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(count);
    };

    // Section 17 — reconnect resync. Count only; a notification created
    // while this client was offline will show up next time the panel is
    // opened or paginated, exactly matching what the backend pushes here.
    const handleSync = ({ unreadCount: count }) => setUnreadCount(count);

    socket.on('notification:new', handleNew);
    socket.on('notification:read', handleRead);
    socket.on('notification:read-all', handleReadAll);
    socket.on('notification:sync', handleSync);

    return () => {
      socket.off('notification:new', handleNew);
      socket.off('notification:read', handleRead);
      socket.off('notification:read-all', handleReadAll);
      socket.off('notification:sync', handleSync);
    };
  }, [socket]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, hasMore, loading, loadingMore, loadMore, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}