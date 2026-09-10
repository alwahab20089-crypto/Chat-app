// src/components/chat/ConversationListItem.jsx
import { formatConversationTime } from '../../utils/formatTime';
import { usePresence } from '../../hooks/usePresence';

export default function ConversationListItem({ conversation, active, onClick }) {
  const other = conversation.otherUser;
  const presence = usePresence(other?.id);
  const unreadCount = conversation.unreadCount || 0; // PHASE 12
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-left transition-all duration-300 ease-premium ${
        active ? 'bg-cyberslate shadow-glow-aqua' : 'hover:bg-cyberslate/60'
      }`}
    >
      <span
        className={`absolute left-0 top-0 h-full w-0.5 bg-neon-aqua transition-transform duration-300 ease-premium ${
          active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-50'
        }`}
      />

      <div className="relative h-11 w-11 shrink-0">
        <div className="h-full w-full overflow-hidden rounded-full border-2 border-cyberslate bg-gradient-to-br from-neon-aqua to-neon-fuchsia shadow-sm transition-transform duration-300 ease-premium group-hover:scale-105">
          {other?.profilePicture ? (
            <img
              src={`${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}${other.profilePicture}`}
              alt={other.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
              {other?.name?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        {presence.online && (
          <span
            className="absolute bottom-0 right-0 h-3 w-3 animate-pulse-glow rounded-full border-2 border-obsidian bg-neon-aqua"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`truncate text-sm ${
              hasUnread ? 'font-semibold text-white' : 'font-medium text-gray-200'
            }`}
          >
            {other?.name}
          </p>

          {/* PHASE 12 — timestamp + unread badge, stacked on the right */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            {conversation.lastMessage && (
              <span className="text-[11px] text-gray-500">
                {formatConversationTime(conversation.lastMessage.createdAt)}
              </span>
            )}
            {hasUnread && (
              <span
                role="status"
                aria-label={`${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`}
                className="flex h-5 min-w-[20px] animate-pulse-glow items-center justify-center rounded-full bg-neon-fuchsia px-1.5 text-[10px] font-semibold leading-none text-white shadow-glow-fuchsia"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>

        <p
          className={`truncate text-xs ${
            hasUnread ? 'font-medium text-gray-300' : 'text-gray-500'
          }`}
        >
          {presence.online ? (
            <span className="inline-flex items-center gap-1 font-medium text-neon-aqua-bright">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-aqua shadow-glow-aqua" aria-hidden="true" />
              Online
            </span>
          ) : conversation.lastMessage ? (
            conversation.lastMessage.content
          ) : (
            'No messages yet'
          )}
        </p>
      </div>
    </button>
  );
}