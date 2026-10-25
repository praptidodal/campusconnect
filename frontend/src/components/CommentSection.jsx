import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getComments, addComment, deleteComment } from '../services/postService';
import NameWithVerification from './NameWithVerification';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function CommentSection({ postId, onCommentCountChange }) {
  const { user: currentUser } = useAuth();
  const [comments, setComments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  const load = async () => {
    try {
      const { data } = await getComments(postId);
      setComments(data);
    } catch {
      setError('Could not load comments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      await addComment(postId, newComment.trim());
      setNewComment('');
      await load();
      if (onCommentCountChange) onCommentCountChange(comments.length + 1);
    } catch (err) {
      setError('Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(c => c.comment_id !== commentId));
      if (onCommentCountChange) onCommentCountChange(comments.length - 1);
    } catch {
      setError('Failed to delete comment.');
    }
  };

  return (
    <div style={{
      marginTop: 'var(--space-2)',
      paddingTop: 'var(--space-3)',
      borderTop: '1px solid var(--line)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-2)' }}>
          <div className="spinner spinner-ink" style={{ width: 16, height: 16, borderWidth: 2 }} />
        </div>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--ink-faint)', fontStyle: 'italic', paddingLeft: 4 }}>
          No comments yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comments.map(c => {
            const isOwner = currentUser && c.user_id === currentUser.user_id;
            return (
              <div
                key={c.comment_id}
                style={{
                  display: 'flex',
                  gap: 10,
                  fontSize: '0.85rem',
                  background: 'var(--bg-light)',
                  padding: 8,
                  borderRadius: 'var(--radius-quad)'
                }}
              >
                <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.75rem', flexShrink: 0 }}>
                  {initials(c.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <NameWithVerification user={c} badgeSize={12} />
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>{formatDate(c.created_at)}</span>
                    {isOwner && (
                      <button
                        onClick={() => handleDelete(c.comment_id)}
                        style={{
                          marginLeft: 'auto',
                          background: 'none',
                          border: 'none',
                          color: 'var(--coral)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p style={{ color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {c.comment_text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 4 }}>
        <input
          type="text"
          className="input"
          placeholder="Write a comment…"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          style={{ fontSize: '0.85rem', padding: '6px 12px', height: 34 }}
          disabled={submitting}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ height: 34, padding: '0 12px', fontSize: '0.85rem', flexShrink: 0 }}
          disabled={submitting || !newComment.trim()}
        >
          {submitting ? '…' : 'Reply'}
        </button>
      </form>

      {error && (
        <p className="form-error" style={{ fontSize: '0.75rem', marginTop: 2 }}>{error}</p>
      )}
    </div>
  );
}
