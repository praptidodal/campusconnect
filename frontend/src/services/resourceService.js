import api from './api';

/**
 * Upload a resource file
 * @param {FormData} formData - Contains title, description, resource_type, reference_id, and file
 */
export const uploadResource = (formData) => {
  return api.post('/resources', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * List resources filtered by type and reference ID
 * @param {string} resourceType - 'community', 'event', or 'collaboration'
 * @param {number} referenceId - The ID of the parent entity
 */
export const getResources = (resourceType, referenceId) => {
  return api.get('/resources', {
    params: { resource_type: resourceType, reference_id: referenceId },
  });
};

/**
 * Retrieve specific resource metadata details
 * @param {number} resourceId 
 */
export const getResourceDetails = (resourceId) => {
  return api.get(`/resources/${resourceId}`);
};

/**
 * Download a resource file securely by fetching the blob with authorization headers
 * @param {number} resourceId 
 * @param {string} filename 
 */
export const downloadResource = async (resourceId, filename) => {
  const response = await api.get(`/resources/${resourceId}/download`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return response;
};

export const searchResources = (paramsOrKeyword) => {
  const params = typeof paramsOrKeyword === 'string'
    ? { keyword: paramsOrKeyword }
    : paramsOrKeyword;
  return api.get('/resources/search', { params });
};

/**
 * Retrieve resource download analytics (only for uploader/admin)
 * @param {number} resourceId 
 */
export const getResourceAnalytics = (resourceId) => {
  return api.get(`/resources/${resourceId}/analytics`);
};

/**
 * Delete a resource file and metadata (only for uploader/admin)
 * @param {number} resourceId 
 */
export const deleteResource = (resourceId) => {
  return api.delete(`/resources/${resourceId}`);
};

/**
 * Restore a soft-deleted resource file
 * @param {number} resourceId 
 */
export const undoDeleteResource = (resourceId) => {
  return api.post(`/resources/${resourceId}/undo`);
};
