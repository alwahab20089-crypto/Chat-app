// src/components/chat/ReactionPicker.jsx
import { useEffect, useRef, useState } from 'react';
import { SmilePlus } from 'lucide-react';

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

const EMOJI_LABELS = {
  '👍': 'thumbs up',
  '❤️': 'heart',
  '😂': 'laughing',
  '😮': 'surprised',
  '😢': 'crying',
  '👏': 'clapping',
};

export default function ReactionPicker({ currentEmoji, onSelect, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click, Escape, or unmount — one listener pair, only
  // while actually open, always cleaned up.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="React to message"
        aria-expanded={open}
        className="flex h-6 w-6 items-center justify-center rounded-full text-gray-500 opacity-70 transition-all duration-200 ease-premium hover:scale-110 hover:bg-cyberslate hover:text-neon-aqua-bright hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-aqua"
      >
        <SmilePlus className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute bottom-full z-20 mb-2 flex max-w-[90vw] animate-fade-in-up items-center gap-0.5 rounded-full border border-neon-aqua/20 bg-cyberslate p-1 shadow-glow-aqua ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {REACTION_EMOJIS.map((emoji) => {
            const mine = currentEmoji === emoji;
            return (
              <button
                key={emoji}
                type="button"
                role="menuitemradio"
                aria-checked={mine}
                aria-label={mine ? 'Remove reaction' : `React with ${EMOJI_LABELS[emoji]}`}
                onClick={() => {
                  onSelect(emoji);
                  setOpen(false);
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all duration-200 ease-premium hover:scale-125 hover:bg-neon-aqua/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-aqua ${
                  mine ? 'bg-neon-aqua/20 shadow-glow-aqua' : ''
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}