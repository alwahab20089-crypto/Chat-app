import { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

export const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      setConnected(false);
      return;
    }

    let ignore = false;

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    const handleConnect = () => { if (!ignore) setConnected(true); };
    const handleDisconnect = () => { if (!ignore) setConnected(false); };
    const handleConnectError = () => { if (!ignore) setConnected(false); };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);

    setSocket(newSocket);

    return () => {
      ignore = true;
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.disconnect();
    };
  }, [user?.id]);

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
}