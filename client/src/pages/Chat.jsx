import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ArrowLeft, Loader2, MessageCircle, Search, Pin } from 'lucide-react';
import MessageSearch from '../components/chat/MessageSearch';
import PinnedMessagesPanel from '../components/chat/PinnedMessagesPanel';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/useSocket';
import ConversationListItem from '../components/chat/ConversationListItem';
import MessageBubble from '../components/chat/MessageBubble';
import MessageComposer from '../components/chat/MessageComposer';
import ConnectionBanner from '../components/chat/ConnectionBanner';
import TypingIndicator from '../components/chat/TypingIndicator';
import { usePresence } from '../hooks/usePresence';
import { formatLastSeen } from '../utils/formatTime';
import { getConversations, getConversationById, getMessages, sendMessageApi, sendAttachmentMessageApi, editMessageApi, deleteMessageApi, pinMessageApi, unpinMessageApi } from '../api/conversationApi';
import { getMessagePreview, replySnapshotSummary } from '../utils/attachmentPolicy';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
const SCROLL_NEAR_BOTTOM_THRESHOLD = 120;
const TYPING_STALE_TIMEOUT = 5000;
const STATUS_RANK = { sent: 0, delivered: 1, read: 2 };

export default function Chat() {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { socket, connected } = useSocket();

    const [conversations, setConversations] = useState([]);
    const [conversationsStatus, setConversationsStatus] = useState('loading');

    const [activeConversation, setActiveConversation] = useState(null);
    const [conversationStatus, setConversationStatus] = useState('idle');

    const [messages, setMessages] = useState([]);
    const [messagesStatus, setMessagesStatus] = useState('idle');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingOlder, setLoadingOlder] = useState(false);

    const [otherTyping, setOtherTyping] = useState(false);
    const typingStaleTimeoutRef = useRef(null);
    const [replyTarget, setReplyTarget] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null); // full message object being replied to
    const [highlightedId, setHighlightedId] = useState(null);
    const highlightTimeoutRef = useRef(null);
    const jumpingRef = useRef(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [pinnedOpen, setPinnedOpen] = useState(false); // PHASE 15

    const messagesContainerRef = useRef(null);
    const activeConversationIdRef = useRef(null);
    const shouldStickToBottomRef = useRef(true);
    const prevScrollHeightRef = useRef(0);
    const otherUserId = activeConversation?.otherUser?.id;
    const presence = usePresence(otherUserId);

    activeConversationIdRef.current = conversationId || null;

    const refreshConversations = useCallback(async () => {
        try {
            const { data } = await getConversations();
            setConversations(data.conversations);
            setConversationsStatus('loaded');
        } catch (err) {
            setConversationsStatus('error');
            toast.error(err.response?.data?.message || 'Could not load conversations');
        }
    }, []);
    const isPageVisibleRef = useRef(!document.hidden && document.hasFocus());
    const [isPageVisible, setIsPageVisible] = useState(isPageVisibleRef.current);

    useEffect(() => {
        const update = () => {
            const visible = !document.hidden && document.hasFocus();
            isPageVisibleRef.current = visible;
            setIsPageVisible(visible);
        };
        document.addEventListener('visibilitychange', update);
        window.addEventListener('focus', update);
        window.addEventListener('blur', update);
        return () => {
            document.removeEventListener('visibilitychange', update);
            window.removeEventListener('focus', update);
            window.removeEventListener('blur', update);
        };
    }, []);

    // Load conversation list once
    useEffect(() => {
        refreshConversations();
    }, [refreshConversations]);

    // Load the active conversation + its first page of messages, and join its socket room
    useEffect(() => {
        if (!conversationId) {
            setActiveConversation(null);
            setMessages([]);
            return;
        }

        let cancelled = false;
        setConversationStatus('loading');
        setMessagesStatus('loading');

        (async () => {
            try {
                const [{ data: convData }, { data: msgData }] = await Promise.all([
                    getConversationById(conversationId),
                    getMessages(conversationId, 1, 30),
                ]);
                if (cancelled) return;
                setActiveConversation(convData.conversation);
                setMessages(msgData.messages);
                setPage(msgData.pagination.page);
                setTotalPages(msgData.pagination.totalPages);
                setConversationStatus('loaded');
                setMessagesStatus('loaded');
                shouldStickToBottomRef.current = true;
            } catch (err) {
                if (cancelled) return;
                setConversationStatus('error');
                setMessagesStatus('error');
                toast.error(err.response?.data?.message || 'Could not open this conversation');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [conversationId]);
    // Reset typing + reply state whenever the open conversation changes, so a switch
    // never carries stale state into the wrong conversation.
    useEffect(() => {
        setOtherTyping(false);
        setReplyTarget(null);
        setEditingMessage(null);
        setHighlightedId(null);
        setSearchOpen(false)
        setPinnedOpen(false); // PHASE 15
        if (typingStaleTimeoutRef.current) {
            clearTimeout(typingStaleTimeoutRef.current);
            typingStaleTimeoutRef.current = null;
        }
        if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
            highlightTimeoutRef.current = null;
        }
    }, [conversationId]);

    // Scroll to bottom once messages first render for a newly opened conversation
    useEffect(() => {
        if (messagesStatus === 'loaded' && shouldStickToBottomRef.current) {
            requestAnimationFrame(() => {
                const el = messagesContainerRef.current;
                if (el) el.scrollTop = el.scrollHeight;
            });
        }
    }, [messagesStatus, conversationId]);

    // Join/leave the conversation-specific socket room, including rejoining after a reconnect
    useEffect(() => {
        if (!socket || !conversationId) return;

        socket.emit('conversation:join', conversationId);

        const handleReconnect = () => socket.emit('conversation:join', conversationId);
        socket.on('connect', handleReconnect);

        return () => {
            socket.emit('conversation:leave', conversationId);
            socket.off('connect', handleReconnect);
        };
    }, [socket, conversationId]);

    // Listen for real-time messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = ({ message }) => {
            const isFromOther = message.sender?.toString() !== user?.id?.toString();
            const isActiveConversation = activeConversationIdRef.current === message.conversationId?.toString();

            // Update the open conversation's message list, avoiding duplicates
            if (isActiveConversation) {
                const container = messagesContainerRef.current;
                if (container) {
                    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
                    shouldStickToBottomRef.current = distanceFromBottom < SCROLL_NEAR_BOTTOM_THRESHOLD;
                }

                setMessages((prev) => {
                    if (prev.some((m) => m.id === message.id)) return prev;
                    const next = [...prev, message];
                    if (shouldStickToBottomRef.current) {
                        requestAnimationFrame(() => {
                            const el = messagesContainerRef.current;
                            if (el) el.scrollTop = el.scrollHeight;
                        });
                    }
                    return next;
                });
            }

            // Delivered fires the moment this authenticated client actually
            // receives the message. Read is handled separately (see the
            // dedicated read-tracking effect below) so it never races
            // delivered — the gray tick needs a moment to actually render.
            if (isFromOther) {
                socket.emit('message:delivered', {
                    conversationId: message.conversationId,
                    messageId: message.id,
                });
            }

            // Update the conversation list preview; if it's a conversation we don't know about yet, refetch
            setConversations((prev) => {
                const idx = prev.findIndex((c) => c.id === message.conversationId?.toString());
                if (idx === -1) {
                    refreshConversations();
                    return prev;
                }
                const updated = {
                    ...prev[idx],
                    lastMessage: { content: getMessagePreview(message), sender: message.sender, createdAt: message.createdAt },
                    updatedAt: message.createdAt,
                };
                const rest = prev.filter((_, i) => i !== idx);
                return [updated, ...rest];
            });
        };

        socket.on('message:new', handleNewMessage);
        return () => socket.off('message:new', handleNewMessage);
    }, [socket, refreshConversations, user?.id]);

    // Single source of truth for "read": fires whenever the newest visible
    // message (from the other participant, not yet read) settles — on
    // initial open AND on every live message that arrives while viewing.
    // Debounced so the delivered tick has time to actually show first, and
    // so a burst of incoming messages doesn't fire one read event each.
    const readDebounceRef = useRef(null);

    useEffect(() => {
        if (!socket || !conversationId || messagesStatus !== 'loaded' || !isPageVisible) return;

        const newest = messages[messages.length - 1];
        if (!newest) return;
        if (newest.sender?.toString() === user?.id?.toString()) return; // nothing of ours to "read"
        if (newest.status === 'read') return; // already read, nothing to do

        if (readDebounceRef.current) clearTimeout(readDebounceRef.current);
        readDebounceRef.current = setTimeout(() => {
            socket.emit('message:read', { conversationId, lastReadMessageId: newest.id });
        }, 500);

        return () => {
            if (readDebounceRef.current) clearTimeout(readDebounceRef.current);
        };
    }, [socket, conversationId, messagesStatus, isPageVisible, messages, user?.id]);
    // Listen for status updates (delivered/read) on messages we sent
    useEffect(() => {
        if (!socket) return;

        const handleStatusUpdate = ({ conversationId: cId, messageIds, status }) => {
            if (cId !== activeConversationIdRef.current) return;

            setMessages((prev) =>
                prev.map((m) => {
                    if (!messageIds.includes(m.id?.toString())) return m;
                    // Never let a status move backwards on screen.
                    if ((STATUS_RANK[status] ?? 0) <= (STATUS_RANK[m.status] ?? 0)) return m;
                    return { ...m, status };
                })
            );
        };

        socket.on('message:status', handleStatusUpdate);
        return () => socket.off('message:status', handleStatusUpdate);
    }, [socket]);
    // Listen for real-time reaction updates — only touches the one message,
    // exactly like the status-update handler above.
    useEffect(() => {
        if (!socket) return;

        const handleReactionUpdate = ({ conversationId: cId, messageId, reactions }) => {
            if (cId !== activeConversationIdRef.current) return;

            setMessages((prev) =>
                prev.map((m) => (m.id?.toString() === messageId?.toString() ? { ...m, reactions } : m))
            );
        };

        socket.on('message:reaction', handleReactionUpdate);
        return () => socket.off('message:reaction', handleReactionUpdate);
    }, [socket]);
    // PHASE 11 — real-time edits. Only the matching message updates.
    useEffect(() => {
        if (!socket) return;

        const handleMessageUpdated = ({ message }) => {
            if (activeConversationIdRef.current !== message.conversationId?.toString()) return;

            setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));

            setConversations((prev) => {
                const idx = prev.findIndex((c) => c.id === message.conversationId?.toString());
                if (idx === -1) return prev;
                const updated = {
                    ...prev[idx],
                    lastMessage: { content: getMessagePreview(message), sender: message.sender, createdAt: message.createdAt },
                };
                const rest = prev.filter((_, i) => i !== idx);
                return [updated, ...rest];
            });
        };

        socket.on('message:updated', handleMessageUpdated);
        return () => socket.off('message:updated', handleMessageUpdated);
    }, [socket]);

    // PHASE 11 — real-time deletes. Also redacts this message wherever it
    // appears as another message's reply target (Section 18).
    useEffect(() => {
        if (!socket) return;

        const handleMessageDeleted = ({ conversationId: cId, messageId }) => {
            if (cId !== activeConversationIdRef.current) return;

            setMessages((prev) =>
                prev.map((m) => {
                    if (m.id === messageId) return { ...m, isDeleted: true, content: '', attachment: null };
                    if (m.replyTo?.messageId === messageId) {
                        return { ...m, replyTo: { ...m.replyTo, isDeleted: true, content: '', attachmentName: null } };
                    }
                    return m;
                })
            );

            setConversations((prev) => {
                const idx = prev.findIndex((c) => c.id === cId);
                if (idx === -1) return prev;
                const updated = { ...prev[idx], lastMessage: { ...prev[idx].lastMessage, content: 'This message was deleted' } };
                const rest = prev.filter((_, i) => i !== idx);
                return [updated, ...rest];
            });
        };

        socket.on('message:deleted', handleMessageDeleted);
        return () => socket.off('message:deleted', handleMessageDeleted);
    }, [socket]);

    // PHASE 15 — realtime pin/unpin. Only touches the one message in the
    // currently loaded window (Section 9/25/26); the pinned-messages panel
    // keeps itself in sync independently since a pin can target a message
    // outside this window entirely (Section 16).
    useEffect(() => {
        if (!socket) return;

        const handleMessagePinned = ({ conversationId: cId, messageId, pinnedBy, pinnedAt }) => {
            if (cId !== activeConversationIdRef.current) return;
            setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, isPinned: true, pinnedAt, pinnedBy } : m))
            );
        };

        const handleMessageUnpinned = ({ conversationId: cId, messageId }) => {
            if (cId !== activeConversationIdRef.current) return;
            setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, isPinned: false, pinnedAt: null, pinnedBy: null } : m))
            );
        };

        socket.on('message:pinned', handleMessagePinned);
        socket.on('message:unpinned', handleMessageUnpinned);
        return () => {
            socket.off('message:pinned', handleMessagePinned);
            socket.off('message:unpinned', handleMessageUnpinned);
        };
    }, [socket]);

    // Reset typing state whenever the open conversation changes, so a switch
    // never carries a stale "is typing..." into the wrong conversation.
    useEffect(() => {
        setOtherTyping(false);
        if (typingStaleTimeoutRef.current) {
            clearTimeout(typingStaleTimeoutRef.current);
            typingStaleTimeoutRef.current = null;
        }
    }, [conversationId]);

    // Listen for the other participant's typing state
    useEffect(() => {
        if (!socket) return;

        const handleTypingStart = ({ conversationId: cId, userId }) => {
            if (cId !== activeConversationIdRef.current || userId !== otherUserId) return;

            setOtherTyping(true);

            if (typingStaleTimeoutRef.current) clearTimeout(typingStaleTimeoutRef.current);
            typingStaleTimeoutRef.current = setTimeout(() => setOtherTyping(false), TYPING_STALE_TIMEOUT);
        };

        const handleTypingStop = ({ conversationId: cId, userId }) => {
            if (cId !== activeConversationIdRef.current || userId !== otherUserId) return;

            if (typingStaleTimeoutRef.current) {
                clearTimeout(typingStaleTimeoutRef.current);
                typingStaleTimeoutRef.current = null;
            }
            setOtherTyping(false);
        };

        socket.on('typing:start', handleTypingStart);
        socket.on('typing:stop', handleTypingStop);

        return () => {
            socket.off('typing:start', handleTypingStart);
            socket.off('typing:stop', handleTypingStop);
            if (typingStaleTimeoutRef.current) clearTimeout(typingStaleTimeoutRef.current);
        };
    }, [socket, otherUserId]);

    // Never show a stale typing indicator once the other user goes offline
    useEffect(() => {
        if (!presence.online) {
            setOtherTyping(false);
            if (typingStaleTimeoutRef.current) {
                clearTimeout(typingStaleTimeoutRef.current);
                typingStaleTimeoutRef.current = null;
            }
        }
    }, [presence.online]);
    // PHASE 12 — unread badge update for one conversation. Merges into
    // existing conversation state only; never reloads the whole list
    // (Section 18).
    useEffect(() => {
        if (!socket) return;

        const handleUnreadUpdate = ({ conversationId: cId, unreadCount }) => {
            setConversations((prev) =>
                prev.map((c) => (c.id === cId ? { ...c, unreadCount } : c))
            );
        };

        socket.on('conversation:unread', handleUnreadUpdate);
        return () => socket.off('conversation:unread', handleUnreadUpdate);
    }, [socket]);

    // PHASE 12 — full resync pushed once per connect/reconnect (Section 12).
    // Applied as a merge by conversationId, never as a full reload — and
    // it's a direct overwrite (not +1/-1), so it can never double-count
    // even if the server sends it more than once.
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
    const handleLoadOlder = async () => {
        if (loadingOlder || page >= totalPages || !conversationId) return;
        setLoadingOlder(true);
        const container = messagesContainerRef.current;
        prevScrollHeightRef.current = container?.scrollHeight || 0;

        try {
            const { data } = await getMessages(conversationId, page + 1, 30);
            setMessages((prev) => [...data.messages, ...prev]);
            setPage(data.pagination.page);
            setTotalPages(data.pagination.totalPages);

            requestAnimationFrame(() => {
                const el = messagesContainerRef.current;
                if (el) el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
            });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not load older messages');
        } finally {
            setLoadingOlder(false);
        }
    };

    const handleSend = async (content, file, onProgress, replyToMessageId) => {
        try {
            const { data } = file
                ? await sendAttachmentMessageApi(conversationId, { content, file, replyToMessageId }, onProgress)
                : await sendMessageApi(conversationId, content, replyToMessageId);

            setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
            shouldStickToBottomRef.current = true;
            requestAnimationFrame(() => {
                const el = messagesContainerRef.current;
                if (el) el.scrollTop = el.scrollHeight;
            });
            setConversations((prev) => {
                const idx = prev.findIndex((c) => c.id === conversationId);
                if (idx === -1) return prev;
                const updated = {
                    ...prev[idx],
                    lastMessage: {
                        content: getMessagePreview(data.message),
                        sender: data.message.sender,
                        createdAt: data.message.createdAt,
                    },
                };
                const rest = prev.filter((_, i) => i !== idx);
                return [updated, ...rest];
            });
        } catch (err) {
            toast.error(err.response?.data?.message || (file ? 'Could not send attachment' : 'Could not send message'));
            throw err; // lets the composer know the send failed so it keeps the draft/attachment/reply for retry
        }
    };
    const handleReact = useCallback(
        (messageId, emoji) => {
            if (!socket || !conversationId) return;
            socket.emit('reaction:toggle', { conversationId, messageId, emoji }, (res) => {
                if (res && res.ok === false) {
                    toast.error(res.message || 'Could not update reaction');
                }
            });
        },
        [socket, conversationId]
    );


    const highlightMessage = useCallback((id) => {
        const el = document.getElementById(`message-${id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedId(id);
        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = setTimeout(() => setHighlightedId(null), 1500);
    }, []);

    // PHASE 10 / Section 15+20 — jump to an original message. If it's not in
    // the currently loaded page, page backward (reusing the same pagination
    // endpoint as handleLoadOlder) until it's found or history runs out.
    const handleJumpToReply = useCallback(
        async (targetId) => {
            if (!targetId || jumpingRef.current) return;

            if (document.getElementById(`message-${targetId}`)) {
                highlightMessage(targetId);
                return;
            }

            jumpingRef.current = true;
            setLoadingOlder(true);
            try {
                let currentPage = page;
                let currentTotalPages = totalPages;
                let found = false;

                while (currentPage < currentTotalPages && !found) {
                    const nextPage = currentPage + 1;
                    const { data } = await getMessages(conversationId, nextPage, 30);
                    setMessages((prev) => [...data.messages, ...prev]);
                    currentPage = data.pagination.page;
                    currentTotalPages = data.pagination.totalPages;
                    setPage(currentPage);
                    setTotalPages(currentTotalPages);
                    found = data.messages.some((m) => m.id === targetId);
                }

                if (found) {
                    requestAnimationFrame(() => requestAnimationFrame(() => highlightMessage(targetId)));
                } else {
                    toast.info('Original message unavailable');
                }
            } catch (err) {
                toast.error(err.response?.data?.message || 'Could not load the original message');
            } finally {
                setLoadingOlder(false);
                jumpingRef.current = false;
            }
        },
        [conversationId, page, totalPages, highlightMessage]
    );
    // PHASE 13 / Section 11 — reuses Phase 10's jump-to-message logic
    // instead of a second lookup system. `jumpToken` (set fresh on every
    // notification click) is the guard key, not messageId, so clicking the
    // same notification twice in a row still re-triggers the jump, while
    // React StrictMode's double-invoke in dev is still deduped correctly.
    const handledJumpTokenRef = useRef(null);

    useEffect(() => {
        const targetId = location.state?.jumpToMessageId;
        const token = location.state?.jumpToken;
        if (!targetId || !token || conversationStatus !== 'loaded' || messagesStatus !== 'loaded') return;
        if (handledJumpTokenRef.current === token) return;
        handledJumpTokenRef.current = token;

        handleJumpToReply(targetId); // already handles "not loaded yet — page backward" and the "unavailable" fallback toast

        // Clear the nav state so a refresh or back-navigation doesn't replay the jump.
        navigate(location.pathname, { replace: true, state: {} });
    }, [location.state, location.pathname, conversationStatus, messagesStatus, conversationId, handleJumpToReply, navigate]);

    const replyPreview = replyTarget && {
        id: replyTarget.id,
        senderLabel: replyTarget.sender?.toString() === user?.id?.toString() ? 'You' : activeConversation?.otherUser?.name || 'them',
        summary: replySnapshotSummary(replyTarget.messageType, replyTarget.content, replyTarget.attachment?.originalName),
    };

    const handleReply = useCallback((message) => {
        setReplyTarget(message);
        setEditingMessage(null); // mutually exclusive with edit mode
    }, []);
    const handleCancelReply = useCallback(() => setReplyTarget(null), []);

    // PHASE 11
    const handleEdit = useCallback((message) => {
        setEditingMessage(message);
        setReplyTarget(null); // mutually exclusive with reply mode
    }, []);
    const handleCancelEdit = useCallback(() => setEditingMessage(null), []);

    const handleUpdate = async (messageId, content) => {
        try {
            const { data } = await editMessageApi(conversationId, messageId, content);
            setMessages((prev) => prev.map((m) => (m.id === data.message.id ? data.message : m)));
            refreshConversations();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not update message');
            throw err; // lets the composer keep the edited text for retry
        }
    };

    const handleDelete = async (messageId) => {
        try {
            await deleteMessageApi(conversationId, messageId);
            setMessages((prev) =>
                prev.map((m) => {
                    if (m.id === messageId) return { ...m, isDeleted: true, content: '', attachment: null };
                    if (m.replyTo?.messageId === messageId) {
                        return { ...m, replyTo: { ...m.replyTo, isDeleted: true, content: '', attachmentName: null } };
                    }
                    return m;
                })
            );
            if (replyTarget?.id === messageId) setReplyTarget(null);
            if (editingMessage?.id === messageId) setEditingMessage(null);
            refreshConversations();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not delete message');
        }
    };
    // PHASE 15 — pin/unpin. Database-first (Section 10/11): the REST call
    // resolves before local state changes, and the response's own message
    // object (not an optimistic guess) is what gets applied here. The other
    // participant/tab picks up the same change via the message:pinned /
    // message:unpinned socket listeners above.
    const handlePin = useCallback(
        async (messageId) => {
            try {
                const { data } = await pinMessageApi(conversationId, messageId);
                setMessages((prev) => prev.map((m) => (m.id === data.message.id ? data.message : m)));
            } catch (err) {
                toast.error(err.response?.data?.message || 'Could not pin message');
            }
        },
        [conversationId]
    );

    const handleUnpin = useCallback(
        async (messageId) => {
            try {
                const { data } = await unpinMessageApi(conversationId, messageId);
                setMessages((prev) => prev.map((m) => (m.id === data.message.id ? data.message : m)));
            } catch (err) {
                toast.error(err.response?.data?.message || 'Could not unpin message');
            }
        },
        [conversationId]
    );

    const handleTogglePin = useCallback(
        (messageId, isPinned) => (isPinned ? handleUnpin(messageId) : handlePin(messageId)),
        [handlePin, handleUnpin]
    );

    const handleScroll = () => {
        const el = messagesContainerRef.current;
        if (!el) return;
        if (el.scrollTop < 80 && !loadingOlder && page < totalPages) {
            handleLoadOlder();
        }
    };

    return (
        <div className="flex h-full flex-col bg-white dark:bg-neutral-950">
         <ConnectionBanner connected={connected} />

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside
                    className={`w-full shrink-0 overflow-y-auto border-r border-neutral-200 p-3 dark:border-neutral-800 md:block md:w-80 ${conversationId ? 'hidden' : 'block'
                        }`}
                >
                    {conversationsStatus === 'loading' && (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                        </div>
                    )}

                    {conversationsStatus === 'loaded' && conversations.length === 0 && (
                        <div className="flex flex-col items-center gap-2 py-10 text-center">
                            <MessageCircle className="h-8 w-8 text-indigo-300 dark:text-indigo-700" />
                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No conversations yet</p>
                            <p className="text-xs text-neutral-400">Search for someone to start chatting.</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        {conversations.map((c) => (
                            <ConversationListItem
                                key={c.id}
                                conversation={c}
                                active={c.id === conversationId}
                                onClick={() => navigate(`/dashboard/chats/${c.id}`)}
                            />
                        ))}
                    </div>
                </aside>

                {/* Main chat area */}
                <main className={`flex flex-1 flex-col ${conversationId ? 'flex' : 'hidden md:flex'}`}>
                    {!conversationId && (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                            <MessageCircle className="h-10 w-10 text-indigo-300 dark:text-indigo-700" />
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Select a conversation to start chatting.</p>
                        </div>
                    )}

                    {conversationId && (
                        <>
                            <div className="relative flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                                {searchOpen ? (
                                    <MessageSearch
                                        key={conversationId}
                                        conversationId={conversationId}
                                        currentUserId={user?.id}
                                        otherUserName={activeConversation?.otherUser?.name}
                                        onClose={() => setSearchOpen(false)}
                                        onJumpToMessage={handleJumpToReply}
                                    />
                                ) : (
                                    <>
                                        <button
                                             onClick={() => navigate('/dashboard/chats')}
                                            className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white md:hidden"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => otherUserId && navigate(`/dashboard/users/${otherUserId}`)}
                                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                        >
                                            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-indigo-500 to-violet-600 shadow dark:border-neutral-900">
                                                {activeConversation?.otherUser?.profilePicture ? (
                                                    <img
                                                        src={`${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}${activeConversation.otherUser.profilePicture}`}
                                                        alt={activeConversation.otherUser.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                                                        {activeConversation?.otherUser?.name?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                                <span
                                                    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-neutral-900 ${presence.online ? 'bg-emerald-500' : 'bg-neutral-400'
                                                        }`}
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                                                    {activeConversation?.otherUser?.name}
                                                </p>
                                                <p className="truncate text-xs text-neutral-400">
                                                    {presence.online ? 'Online' : formatLastSeen(presence.lastSeen)}
                                                </p>
                                            </div>
                                        </button>
                                        {conversationStatus === 'loading' && (
                                            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                        )}

                                        {conversationStatus === 'loaded' && (
                                            <div className="ml-auto flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setPinnedOpen((v) => !v)}
                                                    aria-label="Pinned messages"
                                                    aria-expanded={pinnedOpen}
                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-neutral-100 dark:hover:bg-neutral-800 ${pinnedOpen
                                                        ? 'text-indigo-600 dark:text-indigo-400'
                                                        : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white'
                                                        }`}
                                                >
                                                    <Pin className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPinnedOpen(false);
                                                        setSearchOpen(true);
                                                    }}
                                                    aria-label={
                                                        activeConversation?.otherUser?.name
                                                            ? `Search messages with ${activeConversation.otherUser.name}`
                                                            : 'Search messages'
                                                    }
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                                                >
                                                    <Search className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {pinnedOpen && (
                                    <PinnedMessagesPanel
                                        conversationId={conversationId}
                                        currentUserId={user?.id}
                                        otherUserName={activeConversation?.otherUser?.name}
                                        onClose={() => setPinnedOpen(false)}
                                        onJumpToMessage={handleJumpToReply}
                                    />
                                )}
                            </div>

                            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4">
                                {loadingOlder && (
                                    <div className="flex justify-center pb-3">
                                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                    </div>
                                )}

                                {messagesStatus === 'loading' && (
                                    <div className="flex flex-1 items-center justify-center py-10">
                                        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                                    </div>
                                )}

                                {messagesStatus === 'loaded' && messages.length === 0 && (
                                    <div className="flex flex-1 items-center justify-center py-10">
                                        <p className="text-sm text-neutral-400">Start the conversation.</p>
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    {messages.map((m) => (
                                        <div
                                            key={m.id}
                                            id={`message-${m.id}`}
                                            className={`rounded-2xl transition ${highlightedId === m.id || editingMessage?.id === m.id
                                                ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-white dark:ring-offset-neutral-950'
                                                : ''
                                                }`}
                                        >
                                            <MessageBubble
                                                message={m}
                                                isOwn={m.sender?.toString() === user?.id?.toString()}
                                                currentUserId={user?.id}
                                                otherUserName={activeConversation?.otherUser?.name}
                                                onReact={handleReact}
                                                onReply={handleReply}
                                                onJumpToReply={handleJumpToReply}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                                onPin={handleTogglePin}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {otherTyping && (
                                <TypingIndicator name={activeConversation?.otherUser?.name} />
                            )}

                            <MessageComposer
                                onSend={handleSend}
                                onUpdate={handleUpdate}
                                disabled={conversationStatus !== 'loaded'}
                                conversationId={conversationId}
                                replyTo={replyPreview}
                                onCancelReply={handleCancelReply}
                                editingMessage={editingMessage}
                                onCancelEdit={handleCancelEdit}
                            />
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}