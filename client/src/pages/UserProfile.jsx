// src/pages/UserProfile.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, MessageCircle, Loader2, UserX } from 'lucide-react';
import { getUserProfile } from '../api/userApi';
import { createOrGetConversation } from '../api/conversationApi';
import { usePresence } from '../hooks/usePresence';
import { formatLastSeen } from '../utils/formatTime';

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | loaded | error | not-found
  const [messaging, setMessaging] = useState(false);

  const presence = usePresence(userId);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setProfile(null);

    getUserProfile(userId)
      .then(({ data }) => {
        if (cancelled) return;
        // If someone opens their own profile via a link/search, keep them
        // in the same viewer but on the editable /dashboard/profile page.
        if (data.user.isSelf) {
          navigate('/dashboard/profile', { replace: true });
          return;
        }
        setProfile(data.user);
        setStatus('loaded');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setStatus('not-found');
        } else {
          setStatus('error');
          toast.error(err.response?.data?.message || 'Could not load this profile');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, navigate]);

  const handleMessage = async () => {
    if (messaging || !profile) return;
    setMessaging(true);
    try {
      const { data } = await createOrGetConversation(profile.id);
      navigate(`/dashboard/chats/${data.conversation.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start conversation');
    } finally {
      setMessaging(false);
    }
  };

  const online = presence.loaded ? presence.online : profile?.online;
  const lastSeen = presence.loaded ? presence.lastSeen : profile?.lastSeen;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-8 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950">
      <div className="mx-auto max-w-md">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {status === 'loading' && (
          <div className="mt-10 flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        )}

        {status === 'not-found' && (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white/80 p-10 text-center shadow-xl shadow-indigo-100/50 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/80 dark:shadow-none">
            <UserX className="h-8 w-8 text-neutral-300 dark:text-neutral-700" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">User not found</p>
            <p className="text-xs text-neutral-400">This account may have been deleted.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white/80 p-10 text-center shadow-xl shadow-indigo-100/50 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/80 dark:shadow-none">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Something went wrong</p>
            <p className="text-xs text-neutral-400">Please try again in a moment.</p>
          </div>
        )}

        {status === 'loaded' && profile && (
          <div className="mt-4 rounded-2xl border border-neutral-200 bg-white/80 p-8 text-center shadow-xl shadow-indigo-100/50 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/80 dark:shadow-none">
            <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg dark:border-neutral-800">
              {profile.profilePicture ? (
                <img
                  src={`${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}${profile.profilePicture}`}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">
                  {profile.name?.[0]?.toUpperCase()}
                </div>
              )}
              <span
                className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-neutral-900 ${
                  online ? 'bg-emerald-500' : 'bg-neutral-400'
                }`}
                aria-hidden="true"
              />
            </div>

            <h1 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">{profile.name}</h1>
            <p className="text-sm text-indigo-600 dark:text-indigo-400">@{profile.username}</p>
            <p className="mt-1 text-xs text-neutral-400">{online ? 'Online' : formatLastSeen(lastSeen)}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-500 dark:text-neutral-400">
              {profile.bio || 'No bio yet'}
            </p>

            <button
              onClick={handleMessage}
              disabled={messaging}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/30 transition hover:opacity-90 disabled:opacity-60"
            >
              {messaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
