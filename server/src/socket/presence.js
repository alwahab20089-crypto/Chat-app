// In-memory map of userId -> Set of active socket IDs.
// This is the source of truth for online/offline — never a stored boolean.
const onlineUsers = new Map();

function addConnection(userId, socketId) {
  const wasOffline = !onlineUsers.has(userId) || onlineUsers.get(userId).size === 0;
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
  return wasOffline; // true only if this is the user's first active connection
}

function removeConnection(userId, socketId) {
  const set = onlineUsers.get(userId);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    onlineUsers.delete(userId);
    return true; // true only if the user now has zero active connections
  }
  return false;
}

function isOnline(userId) {
  const set = onlineUsers.get(userId);
  return !!set && set.size > 0;
}

module.exports = { addConnection, removeConnection, isOnline };