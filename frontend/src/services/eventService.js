import api from './api';

/** POST /api/events */
export const createEvent = (data) => api.post('/events', data);

/** GET /api/events/search */
export const searchEvents = (params) => api.get('/events/search', { params });

/** GET /api/events/my-registrations */
export const getMyRegistrations = () => api.get('/events/my-registrations');

/** GET /api/events/my-events */
export const getMyEvents = () => api.get('/events/my-events');

/** GET /api/events */
export const listEvents = (params) => api.get('/events', { params });

/** GET /api/events/{eventId} */
export const getEventDetails = (eventId) => api.get(`/events/${eventId}`);

/** PUT /api/events/{eventId} */
export const updateEvent = (eventId, data) => api.put(`/events/${eventId}`, data);

/** DELETE /api/events/{eventId} */
export const deleteEvent = (eventId) => api.delete(`/events/${eventId}`);

/** POST /api/events/{eventId}/register */
export const registerForEvent = (eventId) => api.post(`/events/${eventId}/register`);

/** DELETE /api/events/{eventId}/register */
export const cancelRegistration = (eventId) => api.delete(`/events/${eventId}/register`);

/** GET /api/events/{eventId}/participants */
export const getEventParticipants = (eventId) => api.get(`/events/${eventId}/participants`);

/** POST /api/events/upload — multipart file upload */
export const uploadEventPoster = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/events/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
