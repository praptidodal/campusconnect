import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import NameWithVerification from '../components/NameWithVerification';
import {
  getPosts, deletePost,
  getCommunities, deleteCommunity,
  getEvents, deleteEvent,
  getCollaborations, deleteCollaboration
} from '../services/adminService';

const TABS = [
  { label: 'Posts', key: 'posts' },
  { label: 'Communities', key: 'communities' },
  { label: 'Events', key: 'events' },
  { label: 'Collaborations', key: 'collaborations' }
];

export default function AdminModeration() {
  const [activeTab, setActiveTab] = useState('posts');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadTabContent = async (tab) => {
    try {
      setLoading(true);
      setError('');
      setItems([]);
      
      let res;
      if (tab === 'posts') {
        res = await getPosts();
      } else if (tab === 'communities') {
        res = await getCommunities();
      } else if (tab === 'events') {
        res = await getEvents();
      } else if (tab === 'collaborations') {
        res = await getCollaborations();
      }
      setItems(res?.data || []);
    } catch (err) {
      console.error(err);
      setError(`Failed to retrieve ${tab} records. Please check API connection.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabContent(activeTab);
  }, [activeTab]);

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you absolutely sure you want to delete this ${activeTab.slice(0, -1)}? This action is permanent and will trigger audit logs.`)) {
      return;
    }

    try {
      setError('');
      setMessage('');
      
      if (activeTab === 'posts') {
        await deletePost(id);
      } else if (activeTab === 'communities') {
        await deleteCommunity(id);
      } else if (activeTab === 'events') {
        await deleteEvent(id);
      } else if (activeTab === 'collaborations') {
        await deleteCollaboration(id);
      }

      setMessage(`Successfully moderated and deleted the selected ${activeTab.slice(0, -1)}.`);
      loadTabContent(activeTab);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || `Failed to moderate resource.`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <AdminLayout activeTab="content">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        
        {/* Alerts */}
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {/* Neobrutalist tab bar selector */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2.5px solid var(--ink)', paddingBottom: '8px' }}>
          {TABS.map((t) => {
            const isSel = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setMessage(''); setError(''); }}
                className="btn"
                style={{
                  background: isSel ? 'var(--ink)' : 'transparent',
                  color: isSel ? 'var(--paper)' : 'var(--ink-soft)',
                  border: isSel ? '1.5px solid var(--ink)' : '1.5px solid var(--line-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 16px',
                  fontWeight: isSel ? '700' : '500',
                  cursor: 'pointer'
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content card */}
        <div className="card" style={{ background: '#fff', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: 'var(--space-3)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'JetBrains Mono', color: 'var(--ink-soft)' }}>
              Retrieving {activeTab} inventory...
            </div>
          ) : (
            <div>
              {/* Conditional renderings by tab */}
              
              {/* Posts moderation list */}
              {activeTab === 'posts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {items.map((p) => (
                    <div key={p.post_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px', border: '1.5px solid var(--line-strong)', borderRadius: 'var(--radius-md)', background: 'var(--paper)' }}>
                      <div style={{ flex: '1', minWidth: 0, paddingRight: '16px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                          Author: <strong style={{ color: 'var(--ink)' }}>
                            <NameWithVerification user={{ name: p.author_name, role: p.author_role, is_verified: p.author_verified }} />
                          </strong> ({p.author_email})
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--ink)', margin: '6px 0', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                          {p.content}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', color: 'var(--ink-faint)', fontFamily: 'JetBrains Mono' }}>
                          <span>Likes: {p.like_count}</span>
                          <span>Comments: {p.comment_count}</span>
                          <span>Posted: {formatDate(p.created_at)}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(p.post_id)} className="btn btn-sm btn-danger" style={{ alignSelf: 'center', flexShrink: 0 }}>
                        Delete Post
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Communities moderation list */}
              {activeTab === 'communities' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {items.map((c) => (
                    <div key={c.community_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1.5px solid var(--line-strong)', borderRadius: 'var(--radius-md)', background: 'var(--paper)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1, paddingRight: '16px' }}>
                        <img
                          src={c.logo_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=100'}
                          alt=""
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--ink)', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{c.community_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.description}
                          </div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', color: 'var(--ink-faint)', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
                            <span>Owner: <NameWithVerification user={{ name: c.owner_name, role: c.owner_role, is_verified: c.owner_verified }} /></span>
                            <span>Members: {c.member_count}</span>
                            <span>Created: {formatDate(c.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(c.community_id)} className="btn btn-sm btn-danger" style={{ flexShrink: 0 }}>
                        Delete Club
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Events moderation list */}
              {activeTab === 'events' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {items.map((e) => (
                    <div key={e.event_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1.5px solid var(--line-strong)', borderRadius: 'var(--radius-md)', background: 'var(--paper)' }}>
                      <div style={{ flex: '1', minWidth: 0, paddingRight: '16px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {e.title}
                          <span style={{ fontSize: '0.65rem', background: 'var(--sky-tint)', color: 'var(--sky)', border: '1px solid var(--sky)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            {e.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: '4px 0' }}>
                          {e.description}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.7rem', color: 'var(--ink-faint)', fontFamily: 'JetBrains Mono' }}>
                          <span>Venue: {e.venue}</span>
                          <span>Organizer: <NameWithVerification user={{ name: e.organizer_name, role: e.organizer_role, is_verified: e.organizer_verified }} /></span>
                          <span>Attendees: {e.registration_count}</span>
                          <span>Start: {formatDate(e.start_datetime)}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(e.event_id)} className="btn btn-sm btn-danger" style={{ flexShrink: 0 }}>
                        Delete Event
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Collaborations moderation list */}
              {activeTab === 'collaborations' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {items.map((c) => (
                    <div key={c.collaboration_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1.5px solid var(--line-strong)', borderRadius: 'var(--radius-md)', background: 'var(--paper)' }}>
                      <div style={{ flex: '1', minWidth: 0, paddingRight: '16px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {c.title}
                          <span style={{ fontSize: '0.65rem', background: 'var(--quad-tint)', color: 'var(--quad)', border: '1px solid var(--quad)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            {c.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: '4px 0' }}>
                          {c.description}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0' }}>
                          {c.required_skills?.split(',').map((s) => (
                            <span key={s} className="tag tag-sm" style={{ padding: '1px 6px', fontSize: '0.65rem' }}>{s.trim()}</span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.7rem', color: 'var(--ink-faint)', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
                          <span>Creator: <NameWithVerification user={{ name: c.creator_name, role: c.creator_role, is_verified: c.creator_verified }} /></span>
                          <span>Positions: {c.positions_available}</span>
                          <span>Applications: {c.application_count}</span>
                          <span>Created: {formatDate(c.created_at)}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(c.collaboration_id)} className="btn btn-sm btn-danger" style={{ flexShrink: 0 }}>
                        Delete Opportunity
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {items.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                  No active {activeTab} compiled.
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
