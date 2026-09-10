// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { PresenceProvider } from './context/PresenceContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import AuthenticatedAppShell from './components/layout/AuthenticatedAppShell';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import VerifyResetOtp from './pages/VerifyResetOtp';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import SearchUsers from './pages/SearchUsers';
import UserProfile from './pages/UserProfile';
import Chat from './pages/Chat';

// "/" resolves auth state before deciding where to send the user — same
// loading guard ProtectedRoute uses, so there's no redirect flash on a
// fresh load or a refresh.
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return <Navigate to={user ? '/dashboard' : '/sign-in'} replace />;
}

// Old /chat/:conversationId links (bookmarks, shared links, notification
// history, etc.) keep working — redirected into the dashboard shell instead
// of a second chat implementation living at the old path.
function LegacyChatRedirect() {
  const { conversationId } = useParams();
  return <Navigate to={conversationId ? `/dashboard/chats/${conversationId}` : '/dashboard/chats'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <PresenceProvider>
            <NotificationProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<RootRedirect />} />

                  <Route path="/sign-up" element={<PublicRoute><SignUp /></PublicRoute>} />
                  <Route path="/sign-in" element={<PublicRoute><SignIn /></PublicRoute>} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/verify-reset-otp" element={<VerifyResetOtp />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Authenticated app shell — ONE protected layout route.
                      Every /dashboard/* page renders inside it via <Outlet />,
                      so auth is resolved once for the whole area, not per page. */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <AuthenticatedAppShell />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="chats" element={<Chat />} />
                    <Route path="chats/:conversationId" element={<Chat />} />
                    <Route path="search" element={<SearchUsers />} />
                    <Route path="users/:userId" element={<UserProfile />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="profile/edit" element={<EditProfile />} />
                  </Route>

                  {/* Legacy top-level paths — redirect into the dashboard
                      shell instead of rendering a second copy of these pages. */}
                  <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />
                  <Route path="/profile/edit" element={<Navigate to="/dashboard/profile/edit" replace />} />
                  <Route path="/search" element={<Navigate to="/dashboard/search" replace />} />
                  <Route path="/chat" element={<Navigate to="/dashboard/chats" replace />} />
                  <Route path="/chat/:conversationId" element={<LegacyChatRedirect />} />

                  <Route path="*" element={<RootRedirect />} />
                </Routes>
              </BrowserRouter>
              <ToastContainer position="top-center" autoClose={3000} theme="colored" />
            </NotificationProvider>
          </PresenceProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}