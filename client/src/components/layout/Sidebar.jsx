// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { LayoutDashboard, MessageCircle, Search, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/chats', label: 'Chats', icon: MessageCircle },
  { to: '/dashboard/search', label: 'Search', icon: Search },
  { to: '/dashboard/profile', label: 'Profile', icon: User },
];

// Persistent left sidebar — desktop only (md:flex). On mobile, MobileBottomNav
// covers the same four destinations instead.
export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/sign-in');
  };

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-neon-aqua/10 bg-obsidian px-4 py-5 md:flex">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon-aqua to-neon-fuchsia font-display text-sm font-bold text-white shadow-glow-aqua">
          A
        </div>
        <span className="font-display text-base font-semibold tracking-tight text-white">AURA</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-premium ${
                isActive
                  ? 'bg-cyberslate text-neon-aqua-bright shadow-glow-aqua'
                  : 'text-gray-400 hover:bg-cyberslate/60 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-0 top-0 h-full w-0.5 bg-neon-aqua transition-transform duration-300 ease-premium ${
                    isActive ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-50'
                  }`}
                />
                <Icon
                  className={`h-4.5 w-4.5 shrink-0 transition-transform duration-300 ease-premium group-hover:scale-110 ${
                    isActive ? 'drop-shadow-[0_0_4px_rgba(69,162,158,0.8)]' : ''
                  }`}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 border-t border-neon-aqua/10 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-all duration-300 ease-premium hover:bg-neon-fuchsia/10 hover:text-neon-fuchsia-bright"
        >
          <LogOut className="h-4.5 w-4.5 transition-transform duration-300 ease-premium group-hover:scale-110 group-hover:-translate-x-0.5" />
          Logout
        </button>
      </div>
    </aside>
  );
}