// src/components/layout/MobileBottomNav.jsx
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageCircle, Search, User } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/dashboard/chats', label: 'Chats', icon: MessageCircle },
  { to: '/dashboard/search', label: 'Search', icon: Search },
  { to: '/dashboard/profile', label: 'Profile', icon: User },
];

// Mobile-only (md:hidden) bottom nav. `hidden` is passed true while a single
// conversation thread is open on mobile so it never sits on top of the
// message composer / on-screen keyboard.
export default function MobileBottomNav({ hidden = false }) {
  if (hidden) return null;

  return (
    <nav
      aria-label="Main navigation"
      className="flex shrink-0 items-stretch justify-around border-t border-neon-aqua/10 bg-obsidian pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-all duration-300 ease-premium ${
              isActive ? 'text-neon-aqua-bright' : 'text-gray-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`absolute top-0 h-0.5 w-8 rounded-full bg-neon-aqua transition-all duration-300 ease-premium ${
                  isActive ? 'opacity-100 shadow-glow-aqua' : 'opacity-0'
                }`}
              />
              <Icon
                className={`h-5 w-5 transition-transform duration-300 ease-premium ${
                  isActive ? 'scale-110 drop-shadow-[0_0_4px_rgba(69,162,158,0.8)]' : ''
                }`}
              />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}