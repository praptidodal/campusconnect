import { useState, useEffect, useCallback } from 'react';
import { getUserPosts } from '../services/postService';
import PostCard from './PostCard';

/**
 * Renders a list of posts for a given user.
 *
 * Props:
 *   userId        — ID of the user whose posts to load.
 *   refreshTrigger — Increment this value from the parent to force a reload
 *                   (e.g. after a new post is created). Optional.
 */
export default function UserPostsList({ userId, refreshTrigger = 0 }) {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getUserPosts(userId);
      setPosts(data);
      setError('');
    } catch {
      setError('Could not load posts.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Re-fetch whenever userId changes OR when the parent increments refreshTrigger
  useEffect(() => {
    if (userId) {
      loadPosts();
    }
  }, [userId, loadPosts, refreshTrigger]);

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(post => post.post_id !== postId));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--ink-faint)' }}>
        <div className="spinner spinner-ink" style={{ width: 20, height: 20, borderWidth: 2, margin: '0 auto var(--space-2)' }} />
        <p className="eyebrow" style={{ fontSize: '0.75rem' }}>Loading posts</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ fontSize: '0.875rem' }}>
        {error}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
        <p style={{ fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--ink-faint)' }}>
          No posts published yet.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {posts.map(post => (
        <PostCard
          key={post.post_id}
          post={post}
          onDelete={handlePostDeleted}
        />
      ))}
    </div>
  );
}
