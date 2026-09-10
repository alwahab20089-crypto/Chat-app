// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2, MessageCircle, Search, User, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getConversations } from '../api/conversationApi';
import { useSocket } from '../context/useSocket';
import ConversationListItem from '../components/chat/ConversationListItem';

const RECENT_LIMIT = 5;

// Authenticated home page. Deliberately consumes the existing conversation
// list endpoint (Phase 7) and its per-conversation unreadCount (Phase 12) —
// no new fetching, aggregation, or unread-counting system of its own.
export default function Dashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      try {
        const { data } = await getConversations();
        if (cancelled) return;
        setConversations(data.conversations);
        setStatus('loaded');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        toast.error(err.response?.data?.message || 'Could not load your conversations');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live unread updates — same events Chat.jsx already listens for, just
  // patched into this page's own conversation state too.
  useEffect(() => {
    if (!socket) return;

    const handleUnreadUpdate = ({ conversationId, unreadCount }) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount } : c))
      );
    };

    socket.on('conversation:unread', handleUnreadUpdate);
    return () => socket.off('conversation:unread', handleUnreadUpdate);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleUnreadSync = ({ conversations: snapshot } = {}) => {
      if (!snapshot?.length) return;
      const countsById = new Map(snapshot.map((s) => [s.conversationId, s.unreadCount]));

      setConversations((prev) =>
        prev.map((c) => (countsById.has(c.id) ? { ...c, unreadCount: countsById.get(c.id) } : c))
      );
    };

    socket.on('conversation:unread:sync', handleUnreadSync);
    return () => socket.off('conversation:unread:sync', handleUnreadSync);
  }, [socket]);

  const recent = conversations.slice(0, RECENT_LIMIT);
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="h-full overflow-y-auto bg-obsidian px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 animate-fade-in-up">
          <h1 className="font-display text-xl font-semibold text-white">
            Welcome back{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-gray-400">Stay connected with your conversations.</p>
        </div>

        {/* Unread overview — sums the same unreadCount already returned per
            conversation by GET /api/conversations. */}
        <div className="mb-6 flex animate-fade-in-up items-center justify-between rounded-2xl border border-neon-fuchsia/20 bg-cyberslate/80 p-5 shadow-glow-fuchsia backdrop-blur-sm transition-all duration-300 ease-premium hover:shadow-glow-fuchsia-lg">
          <div>
            <p className="text-sm text-gray-400">Unread messages</p>
            <p className="mt-1 font-display text-2xl font-semibold text-white">
              {status === 'loading' ? '—' : totalUnread}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neon-fuchsia text-white shadow-glow-fuchsia">
            <MessageCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Quick access */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/chats')}
            className="flex items-center gap-3 rounded-xl border border-cyberslate-light bg-cyberslate/60 px-4 py-3 text-left text-sm font-medium text-gray-300 backdrop-blur-sm transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-neon-aqua/40 hover:text-neon-aqua-bright hover:shadow-glow-aqua"
          >
            <MessageCircle className="h-4 w-4" />
            Open Chats
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/search')}
            className="flex items-center gap-3 rounded-xl border border-cyberslate-light bg-cyberslate/60 px-4 py-3 text-left text-sm font-medium text-gray-300 backdrop-blur-sm transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-neon-aqua/40 hover:text-neon-aqua-bright hover:shadow-glow-aqua"
          >
            <Search className="h-4 w-4" />
            Search Users
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/profile')}
            className="flex items-center gap-3 rounded-xl border border-cyberslate-light bg-cyberslate/60 px-4 py-3 text-left text-sm font-medium text-gray-300 backdrop-blur-sm transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-neon-aqua/40 hover:text-neon-aqua-bright hover:shadow-glow-aqua"
          >
            <User className="h-4 w-4" />
            View Profile
          </button>
        </div>

        {/* Recent conversations — reuses ConversationListItem (Phase 7/12),
            never a second conversation-fetching architecture. */}
        <div className="rounded-2xl border border-neon-aqua/10 bg-cyberslate/80 p-4 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-white">Recent conversations</h2>
            {conversations.length > RECENT_LIMIT && (
              <button
                type="button"
                onClick={() => navigate('/dashboard/chats')}
                className="text-xs font-medium text-neon-aqua-bright transition-colors duration-200 ease-premium hover:text-neon-aqua"
              >
                View all
              </button>
            )}
          </div>

          {status === 'loading' && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-neon-aqua" />
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <p className="text-sm text-gray-400">Something went wrong.</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 text-xs font-medium text-neon-aqua-bright transition-colors duration-200 ease-premium hover:text-neon-aqua"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </button>
            </div>
          )}

          {status === 'loaded' && recent.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <MessageCircle className="h-8 w-8 text-neon-aqua/30" />
              <p className="text-sm font-medium text-gray-300">No conversations yet.</p>
              <p className="text-xs text-gray-500">Search for someone to start a conversation.</p>
              <button
                type="button"
                onClick={() => navigate('/dashboard/search')}
                className="mt-2 rounded-xl bg-gradient-to-r from-neon-aqua to-neon-fuchsia px-4 py-2 text-xs font-medium text-white shadow-glow-aqua transition-all duration-300 ease-premium hover:scale-105 hover:shadow-glow-fuchsia-lg"
              >
                Search for someone
              </button>
            </div>
          )}

          {status === 'loaded' && recent.length > 0 && (
            <div className="flex flex-col gap-1">
              {recent.map((c) => (
                <ConversationListItem
                  key={c.id}
                  conversation={c}
                  active={false}
                  onClick={() => navigate(`/dashboard/chats/${c.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}