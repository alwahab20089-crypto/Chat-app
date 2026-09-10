import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Pin, X, Loader2 } from 'lucide-react';
import { getPinnedMessagesApi } from '../../api/conversationApi';
import { useSocket } from '../../context/useSocket';
import { formatSearchResultTime } from '../../utils/formatTime';

const RESULT_LIMIT = 20; // Section 17

// Section 18 — same snippet convention as MessageSearch's ResultSnippet,
// minus the highlight (pinned messages aren't matched against a query).
function PinnedSnippet({ message }) {
  const text = (message.content || '').trim();

  if (message.messageType === 'image') return <>📷 {text || 'Photo'}</>;
  if (message.messageType === 'file') {
    return <>📎 {text || message.attachment?.originalName || 'File'}</>;
  }
  return <>{text}</>;
}

/**
 * PHASE 15 — Pinned messages panel.
 *
 * Mirrors MessageSearch.jsx's structure and lifecycle: mounted only while
 * open (Chat.jsx conditionally renders this), so open/close naturally
 * resets state. Fetches via the dedicated pinned-messages endpoint
 * (Section 8) rather than filtering the loaded message window, so a pin on
 * a message outside the current pagination page still shows up here
 * (Section 16/17).
 */
export default function PinnedMessagesPanel({
  conversationId,
  currentUserId,
  otherUserName,
  onClose,
  onJumpToMessage,
}) {
  const { socket } = useSocket();
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: RESULT_LIMIT, hasMore: false });
  // 'loading' | 'loaded' | 'empty' | 'error' | 'loadingMore'
  const [status, setStatus] = useState('loading');

  const containerRef = useRef(null);

  const loadFirstPage = useCallback(
    async ({ silent } = {}) => {
      if (!silent) setStatus('loading');
      try {
        const { data } = await getPinnedMessagesApi(conversationId, 1, RESULT_LIMIT);
        setResults(data.messages);
        setPagination(data.pagination);
        setStatus(data.messages.length ? 'loaded' : 'empty');
      } catch (err) {
        if (!silent) {
          setStatus('error');
          toast.error(err.response?.data?.message || 'Could not load pinned messages');
        }
        // A silent (socket-triggered) refresh failing just leaves the
        // existing list showing — not worth surfacing an error toast for.
      }
    },
    [conversationId]
  );

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  // Escape closes the panel — same convention as MessageSearch.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleLoadMore = async () => {
    if (status === 'loadingMore' || !pagination.hasMore) return;
    setStatus('loadingMore');
    try {
      const { data } = await getPinnedMessagesApi(conversationId, pagination.page + 1, RESULT_LIMIT);
      setResults((prev) => [...prev, ...data.messages]);
      setPagination(data.pagination);
      setStatus('loaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load more pinned messages');
      setStatus('loaded');
    }
  };

  const handleResultClick = (messageId) => {
    onClose();
    onJumpToMessage(messageId);
  };

  // Realtime — Section 25/26: another tab/device pinning or unpinning a
  // message keeps this panel in sync without a manual refresh.
  useEffect(() => {
    if (!socket) return;

    // The socket payload only carries {conversationId, messageId,
    // pinnedBy, pinnedAt} (Section 9) — no message content — so a new pin
    // is picked up with one small, targeted refetch of page 1 rather than
    // trying to synthesize the full message client-side.
    const handlePinned = ({ conversationId: cId }) => {
      if (cId !== conversationId) return;
      loadFirstPage({ silent: true });
    };

    // Unpinning never needs a refetch — we already have the id to drop.
    const handleUnpinned = ({ conversationId: cId, messageId }) => {
      if (cId !== conversationId) return;
      setResults((prev) => prev.filter((m) => m.id !== messageId));
    };

    // Section 6/18 — a live edit updates the pinned reference in place
    // instead of the panel showing a stale copy of the content.
    const handleUpdated = ({ message }) => {
      if (message.conversationId?.toString() !== conversationId) return;
      setResults((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    };

    // Section 5 — a deleted pinned message must never keep showing its
    // content here. The backend already auto-unpins and emits
    // message:unpinned on delete, but this is a cheap belt-and-suspenders
    // guard against ever rendering deleted content.
    const handleDeleted = ({ conversationId: cId, messageId }) => {
      if (cId !== conversationId) return;
      setResults((prev) => prev.filter((m) => m.id !== messageId));
    };

    socket.on('message:pinned', handlePinned);
    socket.on('message:unpinned', handleUnpinned);
    socket.on('message:updated', handleUpdated);
    socket.on('message:deleted', handleDeleted);
    return () => {
      socket.off('message:pinned', handlePinned);
      socket.off('message:unpinned', handleUnpinned);
      socket.off('message:updated', handleUpdated);
      socket.off('message:deleted', handleDeleted);
    };
  }, [socket, conversationId, loadFirstPage]);

    return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Pinned messages"
      className="absolute right-0 top-full z-20 mt-2 max-h-[70vh] w-full max-w-sm animate-fade-in-up overflow-hidden rounded-2xl border border-neon-aqua/15 bg-cyberslate shadow-glow-aqua-lg"
    >
      <div className="flex items-center justify-between border-b border-cyberslate-light px-4 py-3">
        <span className="flex items-center gap-1.5 font-display text-sm font-semibold text-white">
          <Pin className="h-3.5 w-3.5 text-neon-fuchsia-bright" aria-hidden="true" />
          Pinned Messages
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close pinned messages"
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-all duration-300 ease-premium hover:scale-110 hover:bg-obsidian-light hover:text-neon-aqua-bright"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[calc(70vh-48px)] overflow-y-auto">
        {status === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-neon-aqua" />
          </div>
        )}

        {status === 'empty' && (
          <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
            <Pin className="h-5 w-5 text-neon-fuchsia/30" aria-hidden="true" />
            <p className="text-xs text-gray-500">No pinned messages yet</p>
          </div>
        )}

        {status === 'error' && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-neon-fuchsia-bright">Couldn't load pinned messages.</p>
            <p className="text-xs text-gray-500">Try again.</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            {results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleResultClick(m.id)}
                aria-label={`Jump to pinned message: ${(m.content || '').trim() || m.messageType}`}
                className="flex w-full flex-col items-start gap-0.5 border-b border-cyberslate-light px-4 py-3 text-left transition-colors duration-200 last:border-b-0 hover:bg-obsidian-light"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-neon-aqua-bright">
                    {m.sender?.toString() === currentUserId?.toString() ? 'You' : otherUserName || 'Them'}
                  </span>
                  <span className="shrink-0 text-[11px] text-gray-500">{formatSearchResultTime(m.pinnedAt || m.createdAt)}</span>
                </div>
                <p className="w-full truncate text-sm text-gray-300">
                  <PinnedSnippet message={m} />
                </p>
              </button>
            ))}

            {pagination.hasMore && (
              <div className="flex justify-center py-2.5">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={status === 'loadingMore'}
                  className="text-xs font-medium text-neon-aqua-bright transition-colors duration-200 hover:text-neon-aqua disabled:opacity-50"
                >
                  {status === 'loadingMore' ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}