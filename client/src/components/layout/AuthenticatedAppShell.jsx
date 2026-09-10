// src/components/layout/AuthenticatedAppShell.jsx
import { Outlet, useMatch } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';

// Wraps every /dashboard/* route. Mounted once behind ProtectedRoute in
// App.jsx, so auth is resolved exactly once for the whole authenticated
// area instead of per-page.
export default function AuthenticatedAppShell() {
  // On mobile, an open conversation thread needs the full remaining height
  // for its message list + composer — the bottom nav would otherwise sit
  // on top of the composer/keyboard, so it's hidden for that one screen only.
  const inConversation = useMatch('/dashboard/chats/:conversationId');

  return (
    <div className="flex h-dvh flex-col bg-obsidian md:flex-row">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />

        {/* min-h-0 lets Outlet content (e.g. the chat thread) manage its
            own internal scrolling instead of fighting this flex parent. */}
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>

        <MobileBottomNav hidden={!!inConversation} />
      </div>
    </div>
  );
}