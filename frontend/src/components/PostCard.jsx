import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUndoDelete } from '../context/UndoDeleteContext';
import { likePost, unlikePost, deletePost } from '../services/postService';
import CommentSection from './CommentSection';
import NameWithVerification from './NameWithVerification';

const IconStar = ({ filled }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill={filled ? "var(--marigold)" : "none"}
    stroke={filled ? "var(--marigold)" : "var(--ink-soft)"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transition: 'transform 0.1s ease' }}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconGlobe = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
  </svg>
);

const IconUsers = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /><path d="M21 21v-2a4 4 0 00-3-3.87" />
  </svg>
);

const IconComment = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </svg>
);

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function roleMeta(role) {
  const map = {
    student: { label: 'Student', cls: 'role-student' },
    faculty: { label: 'Faculty', cls: 'role-faculty' },
    club: { label: 'Club', cls: 'role-club' },
    admin: { label: 'Admin', cls: 'role-admin' },
  };
  return map[role] || { label: role, cls: 'role-student' };
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

export default function PostCard({ post, onDelete }) {
  const { user: currentUser } = useAuth();
  const { addPendingDelete } = useUndoDelete();
  const [liked, setLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [likeLoading, setLikeLoading] = useState(false);
  const [hidden, setHidden] = useState(false);

  const isOwner = currentUser && post.user_id === currentUser.user_id;
  const meta = roleMeta(post.author?.role);

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      if (liked) {
        await unlikePost(post.post_id);
        setLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        await likePost(post.post_id);
        setLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch {
      // silently recover
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDelete = () => {
    setHidden(true);
    addPendingDelete(
      `post_${post.post_id}`,
      post.content || "Post content",
      'post',
      post.post_id,
      () => {
        if (onDelete) onDelete(post.post_id);
      },
      () => {
        setHidden(false);
      }
    );
  };

  if (hidden) return null;

  return (
    <div className="card fade-in" style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-4)' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        {post.author?.profile_picture ? (
          <img
            src={post.author.profile_picture}
            alt={post.author.name}
            className="avatar avatar-md"
            style={{ flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="avatar avatar-md" style={{ flexShrink: 0 }}>
            {initials(post.author?.name)}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <NameWithVerification user={post.author} badgeSize={14} />
            </span>
            <span className={`role-badge ${meta.cls}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
              {meta.label}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-faint)', marginLeft: 'auto' }}>
              {formatDate(post.created_at)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
            <span className="eyebrow" style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {post.visibility === 'public' ? <IconGlobe /> : <IconUsers />}
              {post.visibility === 'public' ? 'Public' : 'Followers'}
            </span>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={handleDelete}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--coral)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
              padding: '0 4px',
              marginLeft: 8
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Body text */}
      <p style={{
        fontSize: '0.9rem',
        color: 'var(--ink-soft)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        marginBottom: post.image_url ? 'var(--space-3)' : 0
      }}>
        {post.content}
      </p>

      {/* Post Image */}
      {post.image_url && (
        <div style={{
          borderRadius: 'var(--radius-quad)',
          overflow: 'hidden',
          border: '1px solid var(--line)',
          background: 'var(--bg-light)',
          maxHeight: 380,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 'var(--space-2)'
        }}>
          <img
            src={post.image_url}
            alt="Post Attachment"
            style={{ width: '100%', height: 'auto', maxHeight: 380, objectFit: 'contain' }}
            onError={e => { e.target.parentNode.style.display = 'none'; }}
          />
        </div>
      )}

      {/* Footer stats / Actions row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'var(--space-3)',
        paddingTop: 'var(--space-2)',
        borderTop: '1px solid var(--line)'
      }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Like */}
          <button
            onClick={handleLike}
            disabled={likeLoading}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: liked ? 'var(--marigold-deep)' : 'var(--ink-soft)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: liked ? 600 : 400
            }}
          >
            <IconStar filled={liked} /> {likeCount}
          </button>

          {/* Comment toggle */}
          <button
            onClick={() => setShowComments(!showComments)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-soft)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <IconComment /> {commentCount}
          </button>
        </div>
      </div>

      {/* Comment section */}
      {showComments && (
        <CommentSection
          postId={post.post_id}
          onCommentCountChange={setCommentCount}
        />
      )}
    </div>
  );
}