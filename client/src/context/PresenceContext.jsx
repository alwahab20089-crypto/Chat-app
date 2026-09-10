import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from './useSocket';
import { getUserPresence } from '../api/userApi';

export const PresenceContext = createContext(null);

export function PresenceProvider({ children }) {
  const { socket } = useSocket();
  const [presenceMap, setPresenceMap] = useState({});
  const requestedRef = useRef(new Set());
  const presenceMapRef = useRef({});

  useEffect(() => {
    presenceMapRef.current = presenceMap;
  }, [presenceMap]);

  const ensurePresence = useCallback((userId) => {
    if (!userId || requestedRef.current.has(userId)) return;
    requestedRef.current.add(userId);

    getUserPresence(userId)
      .then(({ data }) => {
        setPresenceMap((prev) => ({ ...prev, [userId]: { online: data.online, lastSeen: data.lastSeen, loaded: true } }));
      })
      .catch(() => {
        requestedRef.current.delete(userId);
      });
  }, []);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleOnline = ({ userId }) => {
      setPresenceMap((prev) => ({ ...prev, [userId]: { online: true, lastSeen: null, loaded: true } }));
    };
    const handleOffline = ({ userId, lastSeen }) => {
      setPresenceMap((prev) => ({ ...prev, [userId]: { online: false, lastSeen, loaded: true } }));
    };

    socket.on('user:online', handleOnline);
    socket.on('user:offline', handleOffline);

    return () => {
      socket.off('user:online', handleOnline);
      socket.off('user:offline', handleOffline);
    };
  }, [socket]);

  // On (re)connect, re-validate presence for every user we've ever looked up —
  // covers any 'user:online'/'user:offline' events we missed while disconnected.
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      Object.keys(presenceMapRef.current).forEach((userId) => {
        getUserPresence(userId)
          .then(({ data }) => {
            setPresenceMap((prev) => ({ ...prev, [userId]: { online: data.online, lastSeen: data.lastSeen, loaded: true } }));
          })
          .catch(() => {});
      });
    };

    socket.on('connect', handleConnect);
    return () => socket.off('connect', handleConnect);
  }, [socket]);

  return (
    <PresenceContext.Provider value={{ presenceMap, ensurePresence }}>
      {children}
    </PresenceContext.Provider>
  );
}