import api from './api';

export const blockUser = (userId) => api.post(`/users/${userId}/block`);

export const unblockUser = (userId) => api.post(`/users/${userId}/unblock`);

export const getBlockStatus = (userId) => api.get(`/users/${userId}/block-status`);

export const reportAndBlockUser = (data) => api.post('/reports/report-and-block', data);
