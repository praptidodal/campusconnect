import api from './api';

/** GET /api/search */
export const globalSearch = (q, suggest = false) =>
  api.get('/search', { params: { q, suggest } });

/** GET /api/search/users */
export const searchUsers = (params) =>
  api.get('/search/users', { params });

/** GET /api/search/skills */
export const searchSkills = (params) =>
  api.get('/search/skills', { params });

/** GET /api/search/posts */
export const searchPosts = (params) =>
  api.get('/search/posts', { params });

/** GET /api/search/communities */
export const searchCommunities = (params) =>
  api.get('/search/communities', { params });

/** GET /api/search/events */
export const searchEvents = (params) =>
  api.get('/search/events', { params });

/** GET /api/search/collaborations */
export const searchCollaborations = (params) =>
  api.get('/search/collaborations', { params });

/** GET /api/search/trending */
export const getTrending = () =>
  api.get('/search/trending');

/** GET /api/search/recent */
export const getRecentSearches = () =>
  api.get('/search/recent');

/** DELETE /api/search/recent */
export const clearRecentSearches = () =>
  api.delete('/search/recent');
