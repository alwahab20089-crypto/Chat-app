// src/components/chat/MessageReactions.jsx
export default function MessageReactions({ reactions, currentUserId, isOwn, onSelect }) {
  if (!reactions || reactions.length === 0) return null;

  const grouped = reactions.reduce((acc, r) => {
    (acc[r.emoji] ||= []).push(r.userId);
    return acc;
  }, {});

  return (
    <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {Object.entries(grouped).map(([emoji, userIds]) => {
        const mine = userIds.includes(currentUserId?.toString());
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            aria-label={mine ? 'Remove reaction' : `React with ${emoji}`}
            aria-pressed={mine}
            className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] leading-none transition-all duration-200 ease-premium hover:scale-105 ${
              mine
                ? 'border-neon-aqua bg-neon-aqua/15 font-semibold text-neon-aqua-bright shadow-glow-aqua'
                : 'border-cyberslate-light bg-cyberslate text-gray-400 hover:border-neon-aqua/40'
            }`}
          >
            <span aria-hidden="true">{emoji}</span>
            <span>{userIds.length}</span>
          </button>
        );
      })}
    </div>
  );
}