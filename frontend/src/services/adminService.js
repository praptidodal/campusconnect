import api from './api';

// ── Dashboard Statistics ───────────────────────────────────────────────────

export const getDashboardSummary = () => api.get('/admin/dashboard');


// ── User Management ────────────────────────────────────────────────────────

export const getUsers = (params = {}) => api.get('/admin/users', { params });

export const getUserDetail = (userId) => api.get(`/admin/users/${userId}`);

export const updateUserRole = (userId, role) => api.put(`/admin/users/${userId}/role`, { role });

export const updateUserStatus = (userId, status) => api.put(`/admin/users/${userId}/status`, { status });


// ── Content Moderation ─────────────────────────────────────────────────────

export const getPosts = () => api.get('/admin/posts');

export const deletePost = (postId) => api.delete(`/admin/posts/${postId}`);

export const getCommunities = () => api.get('/admin/communities');

export const deleteCommunity = (communityId) => api.delete(`/admin/communities/${communityId}`);

export const getEvents = () => api.get('/admin/events');

export const deleteEvent = (eventId) => api.delete(`/admin/events/${eventId}`);

export const getCollaborations = () => api.get('/admin/collaborations');

export const deleteCollaboration = (collaborationId) => api.delete(`/admin/collaborations/${collaborationId}`);


// ── Report Reviews & Moderation ──────────────────────────────────────────────

export const createReport = (data) => api.post('/reports', data);

export const getReports = (params = {}) => api.get('/admin/reports', { params: typeof params === 'string' ? { status: params } : params });

export const getReportDetails = (reportId) => api.get(`/admin/reports/${reportId}`);

export const updateReportStatus = (reportId, status) => api.put(`/admin/reports/${reportId}`, { status });

export const dismissReportItem = (reportId, reason) => api.post(`/admin/reports/${reportId}/dismiss`, { reason });

export const warnUser = (userId, reportId, reason) => api.post(`/admin/users/${userId}/warn`, { report_id: reportId, reason });

export const suspendUser = (userId, reportId, reason) => api.post(`/admin/users/${userId}/suspend`, { report_id: reportId, reason });

export const unsuspendUser = (userId, reason) => api.post(`/admin/users/${userId}/unsuspend`, { reason });

export const banUser = (userId, reportId, reason) => api.post(`/admin/users/${userId}/ban`, { report_id: reportId, reason });

export const unbanUser = (userId, reason) => api.post(`/admin/users/${userId}/unban`, { reason });

export const deleteReportedContent = (contentType, contentId, reportId, reason) => api.delete(`/admin/content/${contentType}/${contentId}`, { params: { report_id: reportId, reason } });

export const getModerationLogs = (params = {}) => api.get('/admin/moderation-logs', { params });


// ── Audit Trails ───────────────────────────────────────────────────────────

export const getAdminLogs = (params = {}) => api.get('/admin/logs', { params });


// ── Timeseries Analytics ────────────────────────────────────────────────────

export const getAnalytics = () => api.get('/admin/analytics');


// ── Faculty Approval ───────────────────────────────────────────────────────

export const getPendingTeachers = () => api.get('/admin/teachers/pending');
export const approveTeacher = (userId) => api.post(`/admin/teachers/${userId}/approve`);
export const rejectTeacher  = (userId) => api.post(`/admin/teachers/${userId}/reject`);


// ── Community & Event Approval ─────────────────────────────────────────────

export const getApprovalCounts       = ()            => api.get('/admin/approval-counts');

export const getPendingCommunities   = ()            => api.get('/admin/pending/communities');
export const approveCommunity        = (id, notes)   => api.post(`/admin/communities/${id}/approve`, { notes });
export const rejectCommunity         = (id, notes)   => api.post(`/admin/communities/${id}/reject`,  { notes });
export const requestCommunityChanges = (id, notes)   => api.post(`/admin/communities/${id}/request-changes`, { notes });

export const getPendingEvents        = ()            => api.get('/admin/pending/events');
export const approveEvent            = (id, notes)   => api.post(`/admin/events/${id}/approve`, { notes });
export const rejectEvent             = (id, notes)   => api.post(`/admin/events/${id}/reject`,  { notes });
export const requestEventChanges     = (id, notes)   => api.post(`/admin/events/${id}/request-changes`, { notes });

export const getRecentlyApproved     = (limit = 10)  => api.get('/admin/recently-approved', { params: { limit } });
export const getRecentlyRejected     = (limit = 10)  => api.get('/admin/recently-rejected', { params: { limit } });
