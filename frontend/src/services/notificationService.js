import api from './api';

/** GET /api/notifications */
export const getNotifications = (params) =>
  api.get('/notifications', { params });

/** GET /api/notifications/unread-count */
export const getUnreadCount = () =>
  api.get('/notifications/unread-count');

/** PUT /api/notifications/{notificationId}/read */
export const markAsRead = (notificationId) =>
  api.put(`/notifications/${notificationId}/read`);

/** PUT /api/notifications/read-all */
export const markAllAsRead = () =>
  api.put('/notifications/read-all');

/** DELETE /api/notifications/{notificationId} */
export const deleteNotification = (notificationId) =>
  api.delete(`/notifications/${notificationId}`);

/** GET /api/notifications/preferences */
export const getPreferences = () =>
  api.get('/notifications/preferences');

/** PUT /api/notifications/preferences */
export const updatePreferences = (data) =>
  api.put('/notifications/preferences', data);
