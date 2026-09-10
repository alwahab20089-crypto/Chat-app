import api from './axios';

export const getNotifications = (page = 1, limit = 20) =>
  api.get('/notifications', { params: { page, limit } });

export const markNotificationReadApi = (notificationId) =>
  api.patch(`/notifications/${notificationId}/read`);

export const markAllNotificationsReadApi = () => api.patch('/notifications/read-all');