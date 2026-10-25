import api from './api';

/** POST /api/collaborations — multipart form */
export const createCollaboration = (formData) =>
  api.post('/collaborations', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

/** GET /api/collaborations */
export const getCollaborations = (params) =>
  api.get('/collaborations', { params });

/** GET /api/collaborations/{collaborationId} */
export const getCollaborationDetails = (collaborationId) =>
  api.get(`/collaborations/${collaborationId}`);

/** PUT /api/collaborations/{collaborationId} — multipart form */
export const updateCollaboration = (collaborationId, formData) =>
  api.put(`/collaborations/${collaborationId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

/** DELETE /api/collaborations/{collaborationId} */
export const deleteCollaboration = (collaborationId) =>
  api.delete(`/collaborations/${collaborationId}`);

/** POST /api/collaborations/{collaborationId}/apply — multipart form */
export const applyForCollaboration = (collaborationId, formData) =>
  api.post(`/collaborations/${collaborationId}/apply`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

/** GET /api/collaborations/{collaborationId}/applications */
export const getCollaborationApplications = (collaborationId) =>
  api.get(`/collaborations/${collaborationId}/applications`);

/** POST /api/applications/{applicationId}/accept */
export const acceptApplication = (applicationId) =>
  api.post(`/applications/${applicationId}/accept`);

/** POST /api/applications/{applicationId}/reject */
export const rejectApplication = (applicationId) =>
  api.post(`/applications/${applicationId}/reject`);

/** GET /api/applications/my */
export const getMyApplications = () =>
  api.get('/applications/my');

/** GET /api/collaborations/my */
export const getMyCollaborations = () =>
  api.get('/collaborations/my');

/** GET /api/collaborations/search */
export const searchCollaborations = (params) =>
  api.get('/collaborations/search', { params });
