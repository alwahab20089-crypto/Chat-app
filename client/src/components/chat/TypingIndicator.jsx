// src/components/chat/TypingIndicator.jsx
export default function TypingIndicator({ name }) {
  if (!name) return null;

  return (
    <div
      className="flex animate-fade-in items-center gap-2 px-4 pb-1 pt-2"
      role="status"
      aria-live="polite"
    >
      <span className="text-xs font-medium text-neon-aqua-bright">
        {name} is typing
      </span>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        <span className="h-1 w-1 animate-bounce rounded-full bg-neon-aqua shadow-glow-aqua [animation-delay:-0.3s]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-neon-aqua shadow-glow-aqua [animation-delay:-0.15s]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-neon-aqua shadow-glow-aqua" />
      </span>
    </div>
  );
}