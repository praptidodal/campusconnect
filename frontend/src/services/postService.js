import api from './api';

/** POST /api/posts */
export const createPost = (data) => api.post('/posts', data);

/** GET /api/posts/feed */
export const getFeed = () => api.get('/posts/feed');

/** GET /api/posts/user/{userId} */
export const getUserPosts = (userId) => api.get(`/posts/user/${userId}`);

/** DELETE /api/posts/{postId} */
export const deletePost = (postId) => api.delete(`/posts/${postId}`);

/** POST /api/posts/{postId}/undo */
export const undoDeletePost = (postId) => api.post(`/posts/${postId}/undo`);

/** POST /api/posts/{postId}/like */
export const likePost = (postId) => api.post(`/posts/${postId}/like`);

/** DELETE /api/posts/{postId}/like */
export const unlikePost = (postId) => api.delete(`/posts/${postId}/like`);

/** GET /api/posts/{postId}/likes */
export const getPostLikes = (postId) => api.get(`/posts/${postId}/likes`);

/** POST /api/posts/{postId}/comments */
export const addComment = (postId, text) =>
  api.post(`/posts/${postId}/comments`, { comment_text: text });

/** GET /api/posts/{postId}/comments */
export const getComments = (postId) => api.get(`/posts/${postId}/comments`);

/** DELETE /api/comments/{commentId} */
export const deleteComment = (commentId) => api.delete(`/comments/${commentId}`);

/** POST /api/posts/picture — multipart file upload */
export const uploadPostPicture = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/posts/picture', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
