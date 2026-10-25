import api from './api';

export const sendConnectionRequest = (receiverId) => {
  const parsedId = typeof receiverId === 'string' ? parseInt(receiverId, 10) : receiverId;
  return api.post('/connections/request', { receiver_id: parsedId });
};

export const acceptConnection = (requestId) => {
  return api.put(`/connections/request/${requestId}/accept`);
};

export const rejectConnection = (requestId) => {
  return api.put(`/connections/request/${requestId}/reject`);
};

export const withdrawConnection = (requestId) => {
  return api.delete(`/connections/request/${requestId}`);
};

export const removeConnection = (userId) => {
  return api.delete(`/connections/${userId}`);
};

export const getConnections = (params) => {
  return api.get('/connections', { params });
};

export const getPendingRequests = () => {
  return api.get('/connections/pending');
};

export const getSentRequests = () => {
  return api.get('/connections/sent');
};

export const getSuggestions = () => {
  return api.get('/connections/suggestions');
};

export const getMutualConnections = (userId) => {
  return api.get(`/connections/mutual/${userId}`);
};

export const getConnectionStatus = (userId) => {
  return api.get(`/connections/status/${userId}`);
};

export const getConnectionCount = (userId) => {
  return api.get(`/connections/count/${userId}`);
};

export const searchUsers = (params) => {
  return api.get('/users/search', { params });
};

export const getNetworkSummary = () => {
  return api.get('/network/summary');
};
