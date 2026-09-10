import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Search, X, Loader2 } from 'lucide-react';
import { searchMessagesApi } from '../../api/conversationApi';
import { useSocket } from '../../context/useSocket';
import { useDebounce } from '../../hooks/useDebounce';
import { formatSearchResultTime } from '../../utils/formatTime';

const MIN_QUERY_LENGTH = 2; // Section 6 — mirrors the backend's minimum
const DEBOUNCE_MS = 350; // Section 5 — within the recommended 250–400ms
const RESULT_LIMIT = 20;

// Breaks `text` into plain / matched chunks so the match can be
// highlighted without ever using dangerouslySetInnerHTML on user content.
function HighlightedText({ text, query }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  const parts = [];
  let cursor = 0;
  let idx = lower.indexOf(needle, cursor);

  while (idx !== -1) {
    if (idx > cursor) parts.push({ text: text.slice(cursor, idx), match: false });
    parts.push({ text: text.slice(idx, idx + needle.length), match: true });
    cursor = idx + needle.length;
    idx = lower.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });

  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark
  key={i}
  className="rounded-md bg-neon-aqua px-1 py-0.5 font-semibold text-obsidian shadow-[0_0_8px_rgba(45,255,220,0.35)]"
>
  {part.text}
</mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

// Section 21 — attachment messages: search only ever matched `content`,
// so we render the same content (highlighted) with a type-appropriate
// icon/fallback instead of trying to show/search the binary itself.
function ResultSnippet({ message, query }) {
  const text = (message.content || '').trim();

  if (message.messageType === 'image') {
    return (
      <>
        📷 {text ? <HighlightedText text={text} query={query} /> : 'Photo'}
      </>
    );
  }
  if (message.messageType === 'file') {
    return (
      <>
        📎{' '}
        {text ? (
          <HighlightedText text={text} query={query} />
        ) : (
          message.attachment?.originalName || 'File'
        )}
      </>
    );
  }
  return <HighlightedText text={text} query={query} />;
}

/**
 * PHASE 14 — in-conversation message search.
 *
 * Mounted only while search is open (Chat.jsx conditionally renders this),
 * so closing it and reopening naturally resets all local state — no manual
 * reset code needed. `key={conversationId}` on the parent's usage forces a
 * remount (and therefore a reset) if the user somehow switches conversation
 * while search is open.
 */
export default function MessageSearch({
  conversationId,
  currentUserId,
  otherUserName,
  onClose,
  onJumpToMessage,
}) {
  const { socket } = useSocket();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: RESULT_LIMIT, total: 0, hasMore: false });
  // 'idle' | 'short' | 'loading' | 'loaded' | 'empty' | 'error' | 'loadingMore'
  const [status, setStatus] = useState('idle');

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const activeQueryRef = useRef(''); // guards socket-driven updates against a since-changed query

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape closes search — same pattern as ReactionPicker/NotificationBell.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Click outside the search bar/results closes it too.
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [onClose]);

  // The actual search request. Section 16 — a fresh AbortController per
  // debounced query means any still-in-flight previous request is
  // cancelled the moment a newer one starts, so an old response can never
  // overwrite newer results ("the latest query should always win").
  useEffect(() => {
    activeQueryRef.current = trimmedQuery;

    if (!trimmedQuery) {
      setStatus('idle');
      setResults([]);
      return;
    }
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setStatus('short');
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setStatus('loading');

    searchMessagesApi(conversationId, trimmedQuery, 1, RESULT_LIMIT, controller.signal)
      .then(({ data }) => {
        setResults(data.messages);
        setPagination(data.pagination);
        setStatus(data.messages.length ? 'loaded' : 'empty');
      })
      .catch((err) => {
        if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') return; // superseded, not an error
        setStatus('error');
      });

    return () => controller.abort();
  }, [trimmedQuery, conversationId]);

  const handleLoadMore = async () => {
    if (status === 'loadingMore' || !pagination.hasMore) return;
    setStatus('loadingMore');
    try {
      const { data } = await searchMessagesApi(conversationId, trimmedQuery, pagination.page + 1, RESULT_LIMIT);
      setResults((prev) => [...prev, ...data.messages]);
      setPagination(data.pagination);
      setStatus('loaded');
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't search messages. Try again.");
      setStatus('loaded');
    }
  };

  const handleResultClick = (messageId) => {
    onClose();
    onJumpToMessage(messageId);
  };

  // PHASE 14 / Section 18 — live edits: patch the result in place, or drop
  // it if the new content no longer matches the active query.
  useEffect(() => {
    if (!socket) return;
    const handleUpdated = ({ message }) => {
      if (message.conversationId?.toString() !== conversationId) return;
      const stillMatches = (message.content || '')
        .toLowerCase()
        .includes(activeQueryRef.current.toLowerCase());

      setResults((prev) => {
        const exists = prev.some((m) => m.id === message.id);
        if (!exists) return prev;
        return stillMatches ? prev.map((m) => (m.id === message.id ? message : m)) : prev.filter((m) => m.id !== message.id);
      });
    };
    socket.on('message:updated', handleUpdated);
    return () => socket.off('message:updated', handleUpdated);
  }, [socket, conversationId]);

  // Section 19 — live deletes: a deleted message must never linger in
  // results, since it would otherwise still show its original content.
  useEffect(() => {
    if (!socket) return;
    const handleDeleted = ({ conversationId: cId, messageId }) => {
      if (cId !== conversationId) return;
      setResults((prev) => prev.filter((m) => m.id !== messageId));
    };
    socket.on('message:deleted', handleDeleted);
    return () => socket.off('message:deleted', handleDeleted);
  }, [socket, conversationId]);

  return (
    <div ref={containerRef} className="relative flex w-full items-center gap-2">
      <Search className="h-4 w-4 shrink-0 text-neon-aqua-bright" aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search messages..."
        aria-label="Search messages in this conversation"
        className="w-full min-w-0 flex-1 border-none bg-transparent text-sm text-gray-100 outline-none placeholder:text-gray-500"
      />
      {status === 'loading' && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neon-aqua" aria-hidden="true" />}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close search"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-all duration-300 ease-premium hover:scale-110 hover:bg-cyberslate hover:text-neon-aqua-bright"
      >
        <X className="h-4 w-4" />
      </button>

      {status !== 'idle' && (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-20 mt-2 max-h-[60vh] animate-fade-in-up overflow-y-auto rounded-2xl border border-neon-aqua/15 bg-cyberslate shadow-glow-aqua-lg"
        >
          {status === 'short' && (
            <p className="px-4 py-6 text-center text-xs text-gray-500">Type at least {MIN_QUERY_LENGTH} characters</p>
          )}

          {status === 'loading' && results.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-neon-aqua" />
            </div>
          )}

          {status === 'empty' && (
            <p className="px-4 py-6 text-center text-xs text-gray-500">No messages found</p>
          )}

          {status === 'error' && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-neon-fuchsia-bright">Couldn't search messages.</p>
              <p className="text-xs text-gray-500">Try again.</p>
            </div>
          )}

          {results.length > 0 && (
            <>
              {results.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => handleResultClick(m.id)}
                  className="flex w-full flex-col items-start gap-0.5 border-b border-cyberslate-light px-4 py-3 text-left transition-colors duration-200 last:border-b-0 hover:bg-obsidian-light"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-neon-aqua-bright">
                      {m.sender?.toString() === currentUserId?.toString() ? 'You' : otherUserName || 'Them'}
                    </span>
                    <span className="shrink-0 text-[11px] text-gray-500">{formatSearchResultTime(m.createdAt)}</span>
                  </div>
                  <p className="w-full truncate text-sm text-gray-300">
                    <ResultSnippet message={m} query={trimmedQuery} />
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
      )}
    </div>
  );
}