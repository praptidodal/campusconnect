import api from './api';

export const createNotice       = (payload) => api.post('/notices/', payload);
export const getMyNotices       = ()         => api.get('/notices/my');
export const getReceivedNotices = ()         => api.get('/notices/received');
export const getNoticeById      = (id)       => api.get(`/notices/${id}`);
export const getTeacherDirectory= ()         => api.get('/notices/teachers');
export const getTeacherNotices  = (teacherId) => api.get(`/notices/teacher/${teacherId}`);

// Admin teacher approval
export const getPendingTeachers = ()         => api.get('/admin/teachers/pending');
export const approveTeacher     = (userId)   => api.post(`/admin/teachers/${userId}/approve`);
export const rejectTeacher      = (userId)   => api.post(`/admin/teachers/${userId}/reject`);
