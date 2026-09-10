import { useCallback, useEffect, useRef } from 'react';

const STOP_TYPING_DELAY = 1500;

export function useTypingEmitter(socket, conversationId) {
  const isTypingRef = useRef(false);
  const timeoutRef = useRef(null);

  const stopTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (isTypingRef.current && socket && conversationId) {
      socket.emit('typing:stop', { conversationId });
    }
    isTypingRef.current = false;
  }, [socket, conversationId]);

  const notifyTyping = useCallback(() => {
    if (!socket || !conversationId) return;

    // Only emit typing:start once per active typing session, not per keystroke.
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', { conversationId });
    }

    // Reset the stop timer on every keystroke.
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(stopTyping, STOP_TYPING_DELAY);
  }, [socket, conversationId, stopTyping]);

  // Stop typing whenever the conversation changes, and on unmount —
  // covers "switch conversation", "navigate away", "close chat".
  useEffect(() => {
    return () => {
      stopTyping();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return { notifyTyping, stopTyping };
}