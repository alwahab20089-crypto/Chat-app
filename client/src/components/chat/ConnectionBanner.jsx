import { WifiOff } from 'lucide-react';

export default function ConnectionBanner({ connected }) {
  if (connected) return null;
  return (
    <div className="flex animate-fade-in items-center justify-center gap-2 border-b border-amber-500/20 bg-obsidian/95 py-1.5 text-xs font-medium text-amber-300 backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
      </span>
      <WifiOff className="h-3.5 w-3.5" />
      Reconnecting...
    </div>
  );
}