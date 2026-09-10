import { useContext, useEffect } from 'react';
import { PresenceContext } from '../context/PresenceContext';

export function usePresence(userId) {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error('usePresence must be used within PresenceProvider');
  const { presenceMap, ensurePresence } = ctx;

  useEffect(() => {
    ensurePresence(userId);
  }, [userId, ensurePresence]);

  return presenceMap[userId] || { online: false, lastSeen: null, loaded: false };
}