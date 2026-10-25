import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import { getFeed } from '../services/postService';

export default function Dashboard() {
  const navigate          = useNavigate();
  const [feed, setFeed]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getFeed();
      setFeed(data);
      setError('');
    } catch {
      setError('Could not fetch feed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handlePostDeleted = (postId) => {
    setFeed(prev => prev.filter(post => post.post_id !== postId));
  };

  return (
    <div className="app-shell">
      <Sidebar active="dashboard" />

      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.25rem', color: 'var(--ink)' }}>
            Home Feed
          </span>
        </div>

        <div className="dashboard-container">
          {/* Main Feed Column */}
          <div>
            {/* Error Message */}
            {error && (
              <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>
                {error}
              </div>
            )}

            {/* Loading Indicator */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
                <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
                <p className="eyebrow">Loading campus feed</p>
              </div>
            ) : feed.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <h4 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.1rem', color: 'var(--ink-soft)', marginBottom: 6 }}>
                  Feed is quiet
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', marginBottom: 'var(--space-3)' }}>
                  Follow classmates or publish your first post from your profile to populate your feed.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/profile', { state: { tab: 'posts' } })}
                >
                  Go to my profile
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {feed.map(post => (
                  <PostCard
                    key={post.post_id}
                    post={post}
                    onDelete={handlePostDeleted}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column / Widgets Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {/* Quick Links */}
            <div className="card" style={{ border: '1.5px solid var(--ink)' }}>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.05rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
                Quick Links
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  onClick={() => navigate('/resources')}
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '6px 8px', textAlign: 'left', height: 'auto', minHeight: 0 }}
                >
                  File Resource Hub
                </button>
                <button
                  onClick={() => navigate('/communities')}
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '6px 8px', textAlign: 'left', height: 'auto', minHeight: 0 }}
                >
                  Explore Communities
                </button>
                <button
                  onClick={() => navigate('/events')}
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '6px 8px', textAlign: 'left', height: 'auto', minHeight: 0 }}
                >
                  Upcoming Events
                </button>
                <button
                  onClick={() => navigate('/collaborations')}
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '6px 8px', textAlign: 'left', height: 'auto', minHeight: 0 }}
                >
                  Project Collaborations
                </button>
                <button
                  onClick={() => navigate('/discover')}
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '6px 8px', textAlign: 'left', height: 'auto', minHeight: 0 }}
                >
                  Discover People
                </button>
              </div>
            </div>

            {/* Campus Life Tip */}
            <div className="pin-card pin-quad" style={{ padding: 14 }}>
              <span className="eyebrow" style={{ fontSize: '0.625rem' }}>Campus Life Tip</span>
              <p style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', lineHeight: 1.5, margin: '6px 0 0 0' }}>
                Join academic communities and check upcoming workshops to download slides directly from the event resource panel.
              </p>
            </div>

            {/* Post hint */}
            <div className="card" style={{ border: '1.5px solid var(--line)', textAlign: 'center', padding: 'var(--space-3)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: 'var(--space-2)' }}>
                Want to share something with the campus?
              </p>
              <button
                className="btn btn-accent btn-sm"
                style={{ width: '100%' }}
                onClick={() => navigate('/profile', { state: { tab: 'posts' } })}
              >
                Create a post
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
