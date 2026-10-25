import api from './api';

/**
 * Platform Analytics & Insights Service
 */

// Platform overview statistics (Admins/Teachers)
export const getPlatformAnalytics = () => 
  api.get('/analytics/platform');

// User registrations and daily active users growth (Admins/Teachers)
export const getUserGrowth = (days = 30) => 
  api.get('/analytics/user-growth', { params: { days } });

// Posts creation, likes, comments (Admins/Teachers)
export const getPostAnalytics = (days = 30) => 
  api.get('/analytics/posts', { params: { days } });

// Community growth, member growth, post activity (Admins, Community leaders)
export const getCommunityAnalytics = (communityId = null, days = 30) => 
  api.get('/analytics/communities', { params: { community_id: communityId, days } });

// Event registrations, attendance, distribution (Admins, Event organizers)
export const getEventAnalytics = (eventId = null, days = 30) => 
  api.get('/analytics/events', { params: { event_id: eventId, days } });

// Collaboration opportunities, applications, rates (Admins, Collaboration creators)
export const getCollaborationAnalytics = (collaborationId = null, days = 30) => 
  api.get('/analytics/collaborations', { params: { collaboration_id: collaborationId, days } });

// Top contributors & active users list (Admins/Teachers)
export const getContributors = (days = 30) => 
  api.get('/analytics/contributors', { params: { days } });

// Trending skills ranking list (Admins/Teachers)
export const getTrendingSkills = (days = 30) => 
  api.get('/analytics/trending-skills', { params: { days } });
