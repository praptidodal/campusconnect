import api from './api';

/**
 * Start or retrieve a direct message, community chat, or collaboration chat.
 * @param {Object} data - { conversation_type, recipient_id, community_id, collaboration_id }
 */
export const createOrGetConversation = (data) => api.post('/conversations', data);

/**
 * Create a new group chat with connected members.
 * @param {Object} data - { group_name, member_ids, group_avatar }
 */
export const createGroupConversation = (data) => api.post('/conversations/group', data);


/**
 * Retrieve the current user's list of conversations.
 */
export const getConversations = () => api.get('/conversations');

/**
 * Get aggregate unread count.
 */
export const getUnreadCounts = () => api.get('/conversations/unread/count');

/**
 * Get message history for a conversation.
 * @param {number} conversationId
 * @param {Object} params - { limit, offset }
 */
export const getConversationMessages = (conversationId, params) => 
  api.get(`/conversations/${conversationId}/messages`, { params });

/**
 * Mark all messages in a conversation as read.
 * @param {number} conversationId
 */
export const markConversationAsRead = (conversationId) => 
  api.post(`/conversations/${conversationId}/read`);

/**
 * Send a new message, supports optional attachment.
 * @param {FormData} formData - Contains conversation_id, message_text, and optional file
 */
export const sendMessage = (formData) => api.post('/messages', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

/**
 * Mark a single message as read.
 * @param {number} messageId
 */
export const markMessageAsRead = (messageId) => api.post(`/messages/${messageId}/read`);

/**
 * Delete a message sent by the current user.
 * @param {number} messageId
 */
export const deleteMessage = (messageId) => api.delete(`/messages/${messageId}`);

/**
 * Restore a soft-deleted message.
 * @param {number} messageId
 */
export const undoDeleteMessage = (messageId) => api.post(`/messages/${messageId}/undo`);

/**
 * Search messages by keyword.
 * @param {Object} params - { keyword, conversation_id }
 */
export const searchMessages = (params) => api.get('/messages/search', { params });
