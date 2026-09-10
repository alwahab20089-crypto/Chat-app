// src/components/layout/Header.jsx
import { Link } from 'react-router-dom';
import NotificationBell from '../NotificationBell';
import ThemeToggle from '../ThemeToggle';
import { useAuth } from '../../context/AuthContext';

// Persistent top header, shared by every /dashboard/* page. Reuses the
// existing NotificationBell (Phase 13) and ThemeToggle rather than any new
// implementation of either.
export default function Header() {
  const { user } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neon-aqua/10 bg-obsidian px-4">
      {/* Brand shown on mobile only — the desktop sidebar already carries it */}
      <Link to="/dashboard" className="flex items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-neon-aqua to-neon-fuchsia text-xs font-bold text-white shadow-glow-aqua">
          A
        </div>
        <span className="font-display text-sm font-semibold text-white">AURA</span>
      </Link>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <NotificationBell />
        <Link
          to="/dashboard/profile"
          aria-label="Your profile"
          className="group ml-1 block h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-cyberslate bg-gradient-to-br from-neon-aqua to-neon-fuchsia shadow-sm transition-all duration-300 ease-premium hover:border-neon-aqua hover:shadow-glow-aqua"
        >
          {user?.profilePicture ? (
            <img
              src={`${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}${user.profilePicture}`}
              alt={user.name}
              className="h-full w-full object-cover transition-transform duration-300 ease-premium group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}