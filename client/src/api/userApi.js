import api from './axios';

export const searchUsers = (q, page = 1, limit = 20, signal) =>
  api.get('/users/search', { params: { q, page, limit }, signal });

export const getUserPresence = (userId) => api.get(`/users/${userId}/presence`);
export const getUserProfile = (userId) => api.get(`/users/${userId}`);