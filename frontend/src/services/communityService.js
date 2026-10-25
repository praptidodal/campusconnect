import api from './api';

/** POST /api/communities */
export const createCommunity = (data) => api.post('/communities', data);

/** GET /api/communities */
export const getCommunities = () => api.get('/communities');

/** GET /api/communities/my — creator's own communities (all statuses) */
export const getMyCommunities = () => api.get('/communities/my');


/** GET /api/communities/search?name=...&category=... */
export const searchCommunities = (params) => api.get('/communities/search', { params });

/** GET /api/communities/{communityId} */
export const getCommunityDetails = (communityId) => api.get(`/communities/${communityId}`);

/** POST /api/communities/{communityId}/join */
export const joinCommunity = (communityId) => api.post(`/communities/${communityId}/join`);

/** DELETE /api/communities/{communityId}/leave */
export const leaveCommunity = (communityId) => api.delete(`/communities/${communityId}/leave`);

/** GET /api/communities/{communityId}/members */
export const getCommunityMembers = (communityId) => api.get(`/communities/${communityId}/members`);

/** POST /api/communities/{communityId}/posts */
export const createCommunityPost = (communityId, data) => api.post(`/communities/${communityId}/posts`, data);

/** GET /api/communities/{communityId}/posts */
export const getCommunityFeed = (communityId) => api.get(`/communities/${communityId}/posts`);

/** DELETE /api/community-posts/{postId} */
export const deleteCommunityPost = (postId) => api.delete(`/community-posts/${postId}`);

/** POST /api/community-posts/{postId}/undo */
export const undoDeleteCommunityPost = (postId) => api.post(`/community-posts/${postId}/undo`);

/** POST /api/communities/{communityId}/promote */
export const promoteMember = (communityId, data) => api.post(`/communities/${communityId}/promote`, data);

/** POST /api/communities/upload — multipart file upload */
export const uploadCommunityLogo = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/communities/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** GET /api/communities/{communityId}/openings/active */
export const getActiveOpening = (communityId) => api.get(`/communities/${communityId}/openings/active`);

/** POST /api/communities/{communityId}/openings */
export const createOpening = (communityId, data) => api.post(`/communities/${communityId}/openings`, data);

/** PUT /api/communities/{communityId}/openings/{openingId}/close */
export const closeOpening = (communityId, openingId) => api.put(`/communities/${communityId}/openings/${openingId}/close`);

/** POST /api/communities/{communityId}/apply */
export const applyForMembership = (communityId, data) => api.post(`/communities/${communityId}/apply`, data);

/** GET /api/communities/{communityId}/applications */
export const getCommunityApplications = (communityId) => api.get(`/communities/${communityId}/applications`);

/** PUT /api/communities/{communityId}/applications/{applicationId}/status */
export const updateApplicationStatus = (communityId, applicationId, data) =>
  api.put(`/communities/${communityId}/applications/${applicationId}/status`, data);

/** PUT /api/communities/{communityId}/members/{userId}/position */
export const updateMemberPosition = (communityId, userId, position) =>
  api.put(`/communities/${communityId}/members/${userId}/position`, { user_id: userId, position });

