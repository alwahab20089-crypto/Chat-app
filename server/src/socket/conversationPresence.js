// PHASE 13 — "is this user actively looking at this conversation right
// now" as a signal for whether to CREATE a notification. This is a
// separate, narrower question than Phase 7's "has this message been
// read" (which stays entirely client-driven via message:read) — using
// it here only decides notification noise, never message.status or the
// Phase 12 unread count (Section 5).
function isViewingConversation(io, userId, conversationId) {
  const room = io.sockets.adapter.rooms.get(`conversation:${conversationId}`);
  if (!room) return false;

  for (const socketId of room) {
    const s = io.sockets.sockets.get(socketId);
    if (s && s.userId === userId) return true;
  }
  return false;
}

module.exports = { isViewingConversation };