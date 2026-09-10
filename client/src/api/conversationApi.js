import api from './axios';

export const getConversations = () => api.get('/conversations');
export const createOrGetConversation = (userId) => api.post('/conversations', { userId });
export const getConversationById = (conversationId) => api.get(`/conversations/${conversationId}`);
export const getMessages = (conversationId, page = 1, limit = 30) =>
  api.get(`/conversations/${conversationId}/messages`, { params: { page, limit } });
export const sendMessageApi = (conversationId, content, replyToMessageId) =>
  api.post(`/conversations/${conversationId}/messages`, {
    content,
    ...(replyToMessageId ? { replyToMessageId } : {}),
  });

// Attachment (image/file) send — multipart, with optional caption + upload progress.
export const sendAttachmentMessageApi = (conversationId, { content, file, replyToMessageId }, onUploadProgress) => {
  const formData = new FormData();
  if (content) formData.append('content', content);
  formData.append('attachment', file); // field name must match multer's .single('attachment')
  if (replyToMessageId) formData.append('replyToMessageId', replyToMessageId);

  return api.post(`/conversations/${conversationId}/messages`, formData, {
    onUploadProgress: (evt) => {
      if (!onUploadProgress || !evt.total) return;
      onUploadProgress(Math.round((evt.loaded / evt.total) * 100));
    },
  });
};
export const editMessageApi = (conversationId, messageId, content) =>
  api.patch(`/conversations/${conversationId}/messages/${messageId}`, { content });

export const deleteMessageApi = (conversationId, messageId) =>
  api.delete(`/conversations/${conversationId}/messages/${messageId}`);
export const searchMessagesApi = (conversationId, q, page = 1, limit = 20, signal) =>
  api.get(`/conversations/${conversationId}/messages/search`, {
    params: { q, page, limit },
    signal,
  });
  // PHASE 15 — pin / unpin / list pinned messages
export const pinMessageApi = (conversationId, messageId) =>
  api.post(`/conversations/${conversationId}/messages/${messageId}/pin`);

export const unpinMessageApi = (conversationId, messageId) =>
  api.delete(`/conversations/${conversationId}/messages/${messageId}/pin`);

export const getPinnedMessagesApi = (conversationId, page = 1, limit = 20) =>
  api.get(`/conversations/${conversationId}/pinned-messages`, {
    params: { page, limit },
  });