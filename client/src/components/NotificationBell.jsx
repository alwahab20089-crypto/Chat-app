import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { formatNotificationTime } from '../utils/formatTime';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    hasMore,
    loading,
    loadingMore,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleNotificationClick = (notification) => {
    setOpen(false);
    if (!notification.isRead) markAsRead(notification.id);
    navigate(`/dashboard/chats/${notification.conversationId}`, {
      state: { jumpToMessageId: notification.messageId, jumpToken: Date.now() },
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next && unreadCount > 0) markAllAsRead();
            return next;
          });
        }}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-all duration-300 ease-premium hover:scale-110 hover:bg-cyberslate hover:text-neon-aqua-bright"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] animate-fade-in items-center justify-center rounded-full bg-neon-fuchsia px-1 text-[9px] font-semibold leading-none text-white shadow-glow-fuchsia"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[90vw] animate-fade-in-up overflow-hidden rounded-2xl border border-neon-aqua/15 bg-cyberslate/95 shadow-glow-aqua-lg backdrop-blur-sm"
        >
          <div className="flex items-center justify-between border-b border-neon-aqua/10 px-4 py-2.5">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-medium text-neon-aqua-bright transition-colors duration-200 ease-premium hover:text-neon-aqua"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-neon-aqua" />
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-gray-500">No notifications yet</p>
            )}

            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                role="menuitem"
                onClick={() => handleNotificationClick(n)}
                className={`group flex w-full items-start gap-3 border-b border-cyberslate-light px-4 py-3 text-left transition-all duration-300 ease-premium last:border-b-0 hover:bg-neon-aqua/5 ${
                  !n.isRead ? 'bg-neon-aqua/[0.06]' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300 ${
                    n.isRead ? 'bg-transparent' : 'bg-neon-fuchsia shadow-glow-fuchsia'
                  }`}
                />
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-obsidian bg-gradient-to-br from-neon-aqua to-neon-fuchsia shadow-sm transition-transform duration-300 ease-premium group-hover:scale-105">
                  {n.sender?.profilePicture ? (
                    <img
                      src={`${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}${n.sender.profilePicture}`}
                      alt={n.sender.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                      {n.sender?.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm ${
                      !n.isRead ? 'font-semibold text-white' : 'font-medium text-gray-300'
                    }`}
                  >
                    {n.title}
                  </p>
                  <p className="truncate text-xs text-gray-500">{n.body}</p>
                  <p className="mt-0.5 text-[11px] text-gray-600">{formatNotificationTime(n.createdAt)}</p>
                </div>
              </button>
            ))}

            {hasMore && (
              <div className="flex justify-center py-2.5">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-xs font-medium text-neon-aqua-bright transition-colors duration-200 ease-premium hover:text-neon-aqua disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}