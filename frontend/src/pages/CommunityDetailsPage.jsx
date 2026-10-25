import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NameWithVerification from '../components/NameWithVerification';
import {
  getCommunityDetails,
  joinCommunity,
  leaveCommunity,
  createCommunityPost,
  deleteCommunityPost,
  createOpening,
  closeOpening,
  getCommunityApplications,
  updateApplicationStatus,
} from '../services/communityService';
import { createOrGetConversation } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { useUndoDelete } from '../context/UndoDeleteContext';
import { listEvents } from '../services/eventService';
import { uploadPostPicture } from '../services/postService';
import { getCollaborations } from '../services/collaborationService';
import { getResources, downloadResource, deleteResource } from '../services/resourceService';
import ResourceUploadModal from '../components/ResourceUploadModal';
import MembershipApplicationModal from '../components/MembershipApplicationModal';

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

export default function CommunityDetailsPage() {
  const fileInputRef = useRef(null);
  const { communityId } = useParams();
  const { user: currentUser } = useAuth();
  const { addPendingDelete } = useUndoDelete();
  const navigate = useNavigate();

  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [postContent, setPostContent] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postingLoading, setPostingLoading] = useState(false);
  const [uploadingPostImg, setUploadingPostImg] = useState(false);

  const handlePostFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPostImg(true);
    setError('');
    try {
      const res = await uploadPostPicture(file);
      setPostImageUrl(res.data.url);
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to upload image.');
    } finally {
      setUploadingPostImg(false);
    }
  };
  const [actionLoading, setActionLoading] = useState(false);

  // Flow 6 — Events Tab State
  const [activeSubTab, setActiveSubTab] = useState('feed');
  const [communityEvents, setCommunityEvents] = useState([]);
  const [communityCollabs, setCommunityCollabs] = useState([]);

  // Flow 13 — Resources State
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Recruitment & Applications State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [isCreatingOpening, setIsCreatingOpening] = useState(false);
  const [newOpeningTitle, setNewOpeningTitle] = useState('');
  const [newOpeningDesc, setNewOpeningDesc] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchResources = async () => {
    if (!communityId) return;
    setResourcesLoading(true);
    try {
      const res = await getResources('community', communityId);
      setResources(res.data || []);
    } catch (err) {
      console.error('Failed to fetch resources', err);
    } finally {
      setResourcesLoading(false);
    }
  };

  const loadApplications = async () => {
    if (!communityId) return;
    setLoadingApplications(true);
    try {
      const res = await getCommunityApplications(communityId);
      setApplications(res.data || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleCreateOpening = async (e) => {
    e.preventDefault();
    if (!newOpeningTitle.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      await createOpening(communityId, {
        title: newOpeningTitle.trim(),
        description: newOpeningDesc.trim() || null,
      });
      setIsCreatingOpening(false);
      setNewOpeningTitle('');
      setNewOpeningDesc('');
      await loadDetails();
    } catch (err) {
      setActionError(err.response?.data?.detail?.message || 'Failed to create opening.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseOpening = async (openingId) => {
    if (!window.confirm('Are you sure you want to close this opening? New candidates will not be able to apply.')) return;
    setActionLoading(true);
    setActionError('');
    try {
      await closeOpening(communityId, openingId);
      await loadDetails();
    } catch (err) {
      setActionError(err.response?.data?.detail?.message || 'Failed to close opening.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplicationStatus = async (applicationId, newStatus) => {
    setActionLoading(true);
    setActionError('');
    try {
      await updateApplicationStatus(communityId, applicationId, { status: newStatus });
      await loadApplications();
      await loadDetails();
    } catch (err) {
      setActionError(err.response?.data?.detail?.message || 'Failed to update application status.');
    } finally {
      setActionLoading(false);
    }
  };


  const loadDetails = async () => {
    try {
      const [commRes, eventsRes, collabsRes] = await Promise.all([
        getCommunityDetails(communityId),
        listEvents({ community_id: communityId }),
        getCollaborations({ community_id: communityId }),
      ]);
      const commData = commRes.data;
      setCommunity(commData);
      setPosts(commData.recent_posts || []);
      setCommunityEvents(eventsRes.data || []);
      setCommunityCollabs(collabsRes.data || []);

      if (commData.is_joined || currentUser?.role === 'admin') {
        try {
          const res = await getResources('community', communityId);
          setResources(res.data || []);
        } catch (rErr) {
          console.error('Failed to pre-load resources', rErr);
        }
      } else {
        setResources([]);
      }
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to load community details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [communityId]);

  const handleGoToChat = async () => {
    try {
      const res = await createOrGetConversation({
        conversation_type: 'community',
        community_id: parseInt(communityId)
      });
      navigate(`/messages?conversation_id=${res.data.conversation_id}`);
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Failed to open group chat.');
    }
  };

  const handleJoinToggle = async () => {
    if (!community) return;
    setActionLoading(true);
    try {
      if (community.is_joined) {
        if (community.role === 'owner') {
          alert('As owner, you cannot leave until you transfer ownership to someone else in the Members tab.');
          return;
        }
        if (!window.confirm('Are you sure you want to leave this community?')) return;
        await leaveCommunity(communityId);
        setCommunity(prev => ({
          ...prev,
          is_joined: false,
          role: null,
          member_count: Math.max(0, prev.member_count - 1),
        }));
        setResources([]);
      } else {
        await joinCommunity(communityId);
        setCommunity(prev => ({
          ...prev,
          is_joined: true,
          role: 'member',
          member_count: prev.member_count + 1,
        }));
        try {
          const res = await getResources('community', communityId);
          setResources(res.data || []);
        } catch (rErr) {
          console.error(rErr);
        }
      }
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    setPostingLoading(true);
    try {
      const res = await createCommunityPost(communityId, {
        content: postContent.trim(),
        image_url: postImageUrl.trim() || null,
      });
      // Prepend to posts list
      setPosts(prev => [res.data, ...prev]);
      setPostContent('');
      setPostImageUrl('');
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Failed to create post.');
    } finally {
      setPostingLoading(false);
    }
  };

  const handleDeletePost = (postId) => {
    if (!window.confirm('Are you sure you want to delete this community post?')) return;

    const postToDelete = posts.find(p => p.community_post_id === postId);
    if (!postToDelete) return;

    // Immediately remove from local state
    setPosts(prev => prev.filter(p => p.community_post_id !== postId));

    addPendingDelete(
      `comm_post_${postId}`,
      `Community Post by ${postToDelete.author_name || 'me'}`,
      'community_post',
      postId,
      async () => {
        try {
          await deleteCommunityPost(postId);
        } catch (err) {
          console.error('Failed to delete community post:', err);
        }
      },
      () => {
        // Restore callback: put the post back in the list, chronologically sorted
        setPosts(prev => {
          if (prev.some(p => p.community_post_id === postId)) return prev;
          return [postToDelete, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });
      }
    );
  };

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar active="communities" subtitle="Community Details" />
        <main className="app-main">
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
            <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
            <p className="eyebrow">Loading community details</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="app-shell">
        <Sidebar active="communities" subtitle="Error" />
        <main className="app-main">
          <div style={{ padding: 'var(--space-4)' }}>
            <div className="alert alert-error">{error || 'Community not found'}</div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/communities')} style={{ marginTop: 'var(--space-2)' }}>
              Back to communities
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar active="communities" subtitle={community.community_name} />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/communities')}>
            Back
          </button>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1, paddingLeft: 'var(--space-2)' }}>
            Community Hub
          </span>
        </div>

        {/* Banner Section */}
        <div style={{
          height: 180,
          background: 'linear-gradient(135deg, var(--quad-tint) 0%, var(--marigold-tint) 100%)',
          position: 'relative',
          borderBottom: '1px solid var(--line-strong)'
        }}>
          {/* Logo overlay */}
          <div style={{
            position: 'absolute',
            bottom: -32,
            left: 24,
            background: 'var(--paper)',
            padding: 4,
            borderRadius: 'var(--radius-md)',
            border: '2px solid var(--ink)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
          }}>
            {community.logo_url ? (
              <img
                src={community.logo_url}
                alt={community.community_name}
                className="avatar"
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="avatar" style={{ width: 80, height: 80, fontSize: '1.75rem', borderRadius: 'var(--radius-md)' }}>
                {initials(community.community_name)}
              </div>
            )}
          </div>
        </div>

        {/* Detail Content */}
        <div style={{ padding: 'var(--space-8) var(--space-4) var(--space-4) var(--space-4)', maxWidth: 800 }}>
          {/* Header Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div>
              <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.75rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                {community.community_name}
              </h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="role-badge role-faculty">{community.category}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                  Created on {new Date(community.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {community.is_joined && (
                <button
                  onClick={handleGoToChat}
                  className="btn btn-accent btn-sm"
                >
                  Group Chat
                </button>
              )}
              <Link to={`/communities/${communityId}/members`} className="btn btn-outline btn-sm">
                Members ({community.member_count})
              </Link>

              {community.is_joined ? (
                <button
                  onClick={handleJoinToggle}
                  disabled={actionLoading}
                  className="btn btn-outline btn-sm"
                  style={{ minWidth: 90 }}
                >
                  {actionLoading ? '…' : community.role === 'owner' ? 'Owner' : 'Leave'}
                </button>
              ) : community.my_application ? (
                community.my_application.status === 'pending' ? (
                  <span
                    className="tag"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      background: 'var(--sand-tint)',
                      border: '1.5px solid var(--marigold)',
                      color: 'var(--ink)',
                      fontWeight: 650,
                    }}
                    title="Your application is under review by club leaders"
                  >
                    ⏳ Application Pending
                  </span>
                ) : community.my_application.status === 'interview' ? (
                  <span
                    className="tag tag-quad"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 650,
                    }}
                    title="You have been moved to the interview stage"
                  >
                    📅 Interview Scheduled
                  </span>
                ) : (
                  <span
                    className="tag"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      background: 'var(--coral-tint)',
                      border: '1px solid var(--coral)',
                      color: 'var(--coral)',
                      fontWeight: 650,
                    }}
                  >
                    Application Not Accepted
                  </span>
                )
              ) : community.active_opening ? (
                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ minWidth: 140 }}
                >
                  Apply for Membership
                </button>
              ) : (
                <button
                  disabled
                  className="btn btn-outline btn-sm"
                  style={{
                    opacity: 0.7,
                    cursor: 'not-allowed',
                    background: 'var(--bg-light)',
                    color: 'var(--ink-soft)',
                    minWidth: 140,
                  }}
                  title="Recruitment is currently closed for this club"
                >
                  Recruitment Closed
                </button>
              )}
            </div>
          </div>

          {actionError && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>
              {actionError}
            </div>
          )}

          {/* Description */}
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 650, color: 'var(--ink)', marginBottom: 'var(--space-1)' }}>
              About Community
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
              {community.description || 'No description provided for this community.'}
            </p>
          </div>

          {/* Club Leadership Team Section */}
          {community.leadership && community.leadership.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                  Club Leadership & Executive Board
                </h3>
                <Link to={`/communities/${communityId}/members`} className="eyebrow hover:underline" style={{ color: 'var(--quad)', fontSize: '0.78rem' }}>
                  View All Members →
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginTop: 'var(--space-2)' }}>
                {community.leadership.map((leader) => (
                  <div
                    key={leader.user_id}
                    onClick={() => navigate(`/profile/${leader.user_id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--line)',
                      background: 'var(--paper)',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--quad)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--line)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {leader.profile_picture ? (
                      <img
                        src={leader.profile_picture}
                        alt={leader.name}
                        className="avatar"
                        style={{ width: 38, height: 38, objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="avatar"
                        style={{ width: 38, height: 38, fontSize: '0.8rem', background: 'var(--sand-tint)' }}
                      >
                        {initials(leader.name)}
                      </div>
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 650, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <NameWithVerification user={leader} badgeSize={13} />
                      </div>
                      <div style={{ marginTop: 2 }}>
                        <span className="tag tag-quad" style={{ fontSize: '0.72rem', padding: '1px 6px', fontWeight: 600 }}>
                          ★ {leader.position}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* Create Post Section — only for members */}
          {community.is_joined ? (
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 650, color: 'var(--ink)', marginBottom: 'var(--space-2)' }}>
                Post an Update
              </h3>
              <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <textarea
                  className="input"
                  rows={3}
                  placeholder={`Write something to ${community.community_name}...`}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  required
                  disabled={postingLoading}
                  style={{ resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {postImageUrl ? (
                    <div style={{ position: 'relative', width: 60, height: 60, borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', overflow: 'hidden' }}>
                      <img src={postImageUrl} alt="Post preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPostImageUrl('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        style={{
                          position: 'absolute', top: 3, right: 3, background: 'rgba(255, 255, 255, 0.9)',
                          border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--coral)', fontSize: '12px',
                          zIndex: 10, boxShadow: 'var(--shadow)'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div style={{ width: 60, height: 60, borderRadius: 'var(--radius-sm)', border: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-light)', color: 'var(--ink-faint)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                  <label
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                      fontSize: '0.75rem', fontWeight: 600, color: 'var(--sky-deep, #2C6E92)',
                      background: '#FFFFFF', border: '1.5px solid var(--sky)', borderRadius: 'var(--radius-sm)',
                      padding: '5px 12px', transition: 'background 150ms ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--sky-tint)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                  >
                    <span>{uploadingPostImg ? 'Uploading...' : 'Add Image'}</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handlePostFileChange}
                      style={{ display: 'none' }}
                      disabled={uploadingPostImg || postingLoading}
                    />
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={postingLoading || !postContent.trim()}>
                    {postingLoading ? 'Posting...' : 'Share Update'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ background: 'var(--marigold-tint)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)' }}>
                You must join this community to write posts and participate in the discussions.
              </p>
            </div>
          )}

          {/* Tabs switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 'var(--space-3)', gap: 16 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setActiveSubTab('feed')}
              style={{
                borderRadius: 0,
                borderBottom: activeSubTab === 'feed' ? '2px solid var(--quad)' : 'none',
                fontWeight: activeSubTab === 'feed' ? 600 : 400,
                color: activeSubTab === 'feed' ? 'var(--ink)' : 'var(--ink-soft)'
              }}
            >
              Community Feed
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setActiveSubTab('events')}
              style={{
                borderRadius: 0,
                borderBottom: activeSubTab === 'events' ? '2px solid var(--quad)' : 'none',
                fontWeight: activeSubTab === 'events' ? 600 : 400,
                color: activeSubTab === 'events' ? 'var(--ink)' : 'var(--ink-soft)'
              }}
            >
              Events ({communityEvents.length})
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setActiveSubTab('collaborations')}
              style={{
                borderRadius: 0,
                borderBottom: activeSubTab === 'collaborations' ? '2px solid var(--quad)' : 'none',
                fontWeight: activeSubTab === 'collaborations' ? 600 : 400,
                color: activeSubTab === 'collaborations' ? 'var(--ink)' : 'var(--ink-soft)'
              }}
            >
              Collaborations ({communityCollabs.length})
            </button>
            {(community?.is_joined || currentUser?.role === 'admin') && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveSubTab('resources')}
                style={{
                  borderRadius: 0,
                  borderBottom: activeSubTab === 'resources' ? '2px solid var(--quad)' : 'none',
                  fontWeight: activeSubTab === 'resources' ? 600 : 400,
                  color: activeSubTab === 'resources' ? 'var(--ink)' : 'var(--ink-soft)'
                }}
              >
                Resources ({resources.length})
              </button>
            )}
            {(community?.role === 'owner' || community?.role === 'admin' || currentUser?.role === 'admin') && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setActiveSubTab('recruitment');
                  loadApplications();
                }}
                style={{
                  borderRadius: 0,
                  borderBottom: activeSubTab === 'recruitment' ? '2px solid var(--quad)' : 'none',
                  fontWeight: activeSubTab === 'recruitment' ? 600 : 400,
                  color: activeSubTab === 'recruitment' ? 'var(--ink)' : 'var(--ink-soft)'
                }}
              >
                Recruitment & Applications {applications.length > 0 ? `(${applications.length})` : ''}
              </button>
            )}
          </div>

          {activeSubTab === 'feed' ? (
            /* Feed List */
            posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--ink-faint)' }}>
                <p className="eyebrow" style={{ fontStyle: 'italic' }}>No posts yet in this community. Be the first to share something!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {posts.map(post => {
                  const isPostAuthor = currentUser && post.user_id === currentUser.user_id;
                  const canDelete = isPostAuthor || community.role === 'admin' || community.role === 'owner';
                  
                  return (
                    <div key={post.community_post_id} className="pin-card pin-quad fade-in">
                      {/* Header */}
                      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        {post.author_avatar ? (
                          <img
                            src={post.author_avatar}
                            alt={post.author_name}
                            className="avatar"
                            style={{ width: 36, height: 36, objectFit: 'cover' }}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.75rem' }}>
                            {initials(post.author_name)}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>
                              <NameWithVerification user={{ name: post.author_name, role: post.author_role, is_verified: post.author_verified }} />
                            </span>
                            {canDelete && (
                              <button
                                onClick={() => handleDeletePost(post.community_post_id)}
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--coral)', padding: '2px 6px', height: 'auto', minHeight: 0 }}
                                title="Delete post"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--ink-faint)' }}>
                            {formatDate(post.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <p style={{ fontSize: '0.925rem', color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: post.image_url ? 'var(--space-2)' : 0 }}>
                        {post.content}
                      </p>

                      {/* Optional Image */}
                      {post.image_url && (
                        <div style={{ marginTop: 'var(--space-2)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                          <img
                            src={post.image_url}
                            alt="Post attachment"
                            style={{ width: '100%', maxHeight: 360, objectFit: 'cover' }}
                            onError={e => { e.target.parentNode.style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : activeSubTab === 'events' ? (
            /* Events List */
            communityEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--ink-faint)' }}>
                <p className="eyebrow" style={{ fontStyle: 'italic' }}>No events hosted by this community yet.</p>
                {community.is_joined && (
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/events/create')} style={{ marginTop: 'var(--space-2)' }}>
                    Host event
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {communityEvents.map(ev => (
                  <div key={ev.event_id} className="card fade-in" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <span className="role-badge role-student" style={{ fontSize: '0.6rem' }}>{ev.category}</span>
                      <h3 onClick={() => navigate(`/events/${ev.event_id}`)} className="hover:underline" style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', fontWeight: 650, color: 'var(--ink)', cursor: 'pointer', marginTop: 4, marginBottom: 4 }}>
                        {ev.title}
                      </h3>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--ink-faint)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>{new Date(ev.start_datetime).toLocaleDateString()} at {new Date(ev.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{ev.venue || 'No location'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span>{ev.registered_count} attending</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/events/${ev.event_id}`)} className="btn btn-outline btn-sm">
                      View details
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : activeSubTab === 'collaborations' ? (
            /* Collaborations List */
            communityCollabs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--ink-faint)' }}>
                <p className="eyebrow" style={{ fontStyle: 'italic' }}>No collaborations hosted by this community yet.</p>
                {community.is_joined && (community.role === 'owner' || community.role === 'admin') && (
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/collaborations/create')} style={{ marginTop: 'var(--space-2)' }}>
                    Post Opportunity
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {communityCollabs.map(col => (
                  <div key={col.collaboration_id} className="card fade-in" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <span className="role-badge role-club" style={{ fontSize: '0.6rem' }}>{col.category}</span>
                      <h3 onClick={() => navigate(`/collaborations/${col.collaboration_id}`)} className="hover:underline" style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', fontWeight: 650, color: 'var(--ink)', cursor: 'pointer', marginTop: 4, marginBottom: 4 }}>
                        {col.title}
                      </h3>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--ink-faint)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 5 }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>Deadline: {new Date(col.deadline).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 5 }}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                          <span>{col.positions_available} open position{col.positions_available !== 1 && 's'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span>{col.applications_count} applicant{col.applications_count !== 1 && 's'}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/collaborations/${col.collaboration_id}`)} className="btn btn-outline btn-sm">
                      View details
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : activeSubTab === 'resources' ? (
            /* Resources List */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 650, color: 'var(--ink)', margin: 0 }}>
                  Shared Resources
                </h3>
                {(community?.role === 'owner' || community?.role === 'admin' || currentUser?.role === 'admin') && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsUploadModalOpen(true)}
                  >
                    Upload Resource
                  </button>
                )}
              </div>

              {resourcesLoading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--ink-soft)' }}>
                  Loading resources...
                </div>
              ) : resources.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', background: 'var(--bg-light)', border: '1.5px dashed var(--line)', borderRadius: 'var(--radius-md)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto var(--space-1)', color: 'var(--ink-faint)' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p className="eyebrow" style={{ fontStyle: 'italic', margin: 0 }}>No resources shared in this community yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {resources.map((res) => {
                    const isUploader = currentUser?.user_id === res.uploaded_by;
                    const canDelete = isUploader || currentUser?.role === 'admin';
                    
                    const formatSize = (bytes) => {
                      if (!bytes) return 'Unknown size';
                      if (bytes < 1024) return `${bytes} B`;
                      if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
                      return `${(bytes / 1048576).toFixed(1)} MB`;
                    };

                    const renderFileIcon = (type) => {
                      const t = type?.toLowerCase() || '';
                      if (t === 'pdf') {
                        return (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="9" y1="15" x2="15" y2="15" />
                          </svg>
                        );
                      }
                      if (['doc', 'docx', 'txt', 'rtf'].includes(t)) {
                        return (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--sky-deep)" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        );
                      }
                      if (['zip', 'rar', 'tar', 'gz'].includes(t)) {
                        return (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--marigold)" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <circle cx="12" cy="14" r="2" />
                          </svg>
                        );
                      }
                      return (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      );
                    };

                    const handleDownload = async () => {
                      try {
                        const filename = res.file_path.split('/').pop() || 'resource';
                        await downloadResource(res.resource_id, filename);
                        fetchResources();
                      } catch (err) {
                        alert('Download failed. You might not have access.');
                      }
                    };

                    const handleDelete = () => {
                      if (!window.confirm(`Are you sure you want to delete "${res.title}"?`)) return;

                      // Immediately hide it locally
                      setResources(prev => prev.filter(r => r.resource_id !== res.resource_id));

                      addPendingDelete(
                        `resource_${res.resource_id}`,
                        res.title,
                        'resource',
                        res.resource_id,
                        async () => {
                          try {
                            await deleteResource(res.resource_id);
                          } catch (err) {
                            console.error('Failed to delete resource:', err);
                          }
                        },
                        () => {
                          // Restore callback
                          setResources(prev => {
                            if (prev.some(r => r.resource_id === res.resource_id)) return prev;
                            return [res, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                          });
                        }
                      );
                    };

                    return (
                      <div key={res.resource_id} className="card fade-in" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                          {renderFileIcon(res.file_type)}
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 650, color: 'var(--ink)' }}>
                              {res.title}
                            </h4>
                            {res.description && (
                              <p style={{ margin: '2px 0 4px 0', fontSize: '0.8rem', color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {res.description}
                              </p>
                            )}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.7rem', color: 'var(--ink-faint)' }}>
                              <span>Shared by {res.uploader_name}</span>
                              <span>•</span>
                              <span>{formatSize(res.file_size)}</span>
                              <span>•</span>
                              <span>{res.download_count} download{res.download_count !== 1 && 's'}</span>
                              <span>•</span>
                              <span>{formatDate(res.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={handleDownload}
                            className="btn btn-outline btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download
                          </button>
                          
                          {(isUploader || currentUser?.role === 'admin') && (
                            <button
                              onClick={() => navigate(`/resources/${res.resource_id}`)}
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--sky-deep)' }}
                            >
                              Analytics
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={handleDelete}
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--coral)' }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Recruitment & Applications Tab (Leaders Only) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Active Opening Status Card */}
              <div className="card" style={{ background: 'var(--paper-raised)', border: '1.5px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <div>
                    <span className="eyebrow" style={{ color: 'var(--quad)' }}>Opening Status</span>
                    <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                      {community.active_opening ? community.active_opening.title : 'No Active Opening'}
                    </h3>
                  </div>
                  <div>
                    {community.active_opening ? (
                      <button
                        onClick={() => handleCloseOpening(community.active_opening.opening_id)}
                        disabled={actionLoading}
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                      >
                        Close Opening
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsCreatingOpening(true)}
                        className="btn btn-primary btn-sm"
                      >
                        + Create Opening
                      </button>
                    )}
                  </div>
                </div>

                {community.active_opening ? (
                  <div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', lineHeight: 1.5, margin: 0 }}>
                      {community.active_opening.description || 'No detailed description.'}
                    </p>
                    <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--ink-faint)', fontFamily: 'JetBrains Mono, monospace' }}>
                      Opened on {new Date(community.active_opening.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', margin: 0 }}>
                    Students cannot submit membership applications while recruitment is closed. Create an opening to allow candidates to apply.
                  </p>
                )}

                {/* Create Opening Form */}
                {isCreatingOpening && (
                  <form onSubmit={handleCreateOpening} style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Opening Title (e.g. Spring 2026 Core Team Recruitment)"
                      value={newOpeningTitle}
                      onChange={(e) => setNewOpeningTitle(e.target.value)}
                      required
                    />
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Description, roles open (e.g. Developers, Designers, Event Coordinators), expectations, and deadlines..."
                      value={newOpeningDesc}
                      onChange={(e) => setNewOpeningDesc(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setIsCreatingOpening(false)}
                        disabled={actionLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={actionLoading || !newOpeningTitle.trim()}
                      >
                        {actionLoading ? 'Publishing...' : 'Publish Opening'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Applications List */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                    Candidate Applications ({applications.length})
                  </h3>
                  <button onClick={loadApplications} className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }}>
                    Refresh
                  </button>
                </div>

                {loadingApplications ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--ink-soft)' }}>
                    <div className="spinner spinner-ink" style={{ display: 'inline-block', marginBottom: 6 }} />
                    <p style={{ fontSize: '0.85rem' }}>Loading applications...</p>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--ink-faint)' }}>
                    <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.9rem' }}>No applications submitted yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {applications.map((app) => {
                      const statusColor = app.status === 'accepted' ? 'tag-quad' : app.status === 'interview' ? 'tag-sky' : app.status === 'rejected' ? 'tag-coral' : 'tag-marigold';
                      return (
                        <div key={app.application_id} className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {app.applicant_avatar ? (
                                <img
                                  src={app.applicant_avatar}
                                  alt={app.applicant_name}
                                  className="avatar"
                                  style={{ width: 42, height: 42, objectFit: 'cover' }}
                                />
                              ) : (
                                <div className="avatar" style={{ width: 42, height: 42, fontSize: '0.85rem', background: 'var(--sand-tint)' }}>
                                  {initials(app.applicant_name)}
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: 650, fontSize: '0.95rem', color: 'var(--ink)' }}>
                                  <span onClick={() => navigate(`/profile/${app.applicant_id}`)} className="hover:underline" style={{ cursor: 'pointer' }}>
                                    <NameWithVerification user={{ name: app.applicant_name, role: app.applicant_role, is_verified: app.applicant_verified }} />
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                                  {app.applicant_email} {app.applicant_department && `· ${app.applicant_department}`}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                                  Applied {new Date(app.applied_at).toLocaleDateString()} at {new Date(app.applied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>

                            <span className={`tag ${statusColor}`} style={{ textTransform: 'capitalize', fontWeight: 700, padding: '4px 10px' }}>
                              {app.status}
                            </span>
                          </div>

                          {/* Cover Note */}
                          {app.cover_note && (
                            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: '0.85rem', color: 'var(--ink)', lineHeight: 1.5 }}>
                              <strong>Cover Note: </strong> {app.cover_note}
                            </div>
                          )}

                          {/* Resume URL */}
                          {app.resume_url && (
                            <div style={{ fontSize: '0.82rem' }}>
                              <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px' }}>
                                📄 View Resume / Portfolio Link ↗
                              </a>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4, borderTop: '1px solid var(--line)', paddingTop: 8, flexWrap: 'wrap' }}>
                            {app.status === 'pending' && (
                              <button
                                onClick={() => handleApplicationStatus(app.application_id, 'interview')}
                                disabled={actionLoading}
                                className="btn btn-outline btn-sm"
                                style={{ borderColor: 'var(--sky)', color: 'var(--sky-deep, #2C6E92)' }}
                              >
                                Move to Interview
                              </button>
                            )}
                            {app.status !== 'accepted' && (
                              <button
                                onClick={() => handleApplicationStatus(app.application_id, 'accepted')}
                                disabled={actionLoading}
                                className="btn btn-primary btn-sm"
                              >
                                ✓ Accept Member
                              </button>
                            )}
                            {app.status !== 'rejected' && (
                              <button
                                onClick={() => handleApplicationStatus(app.application_id, 'rejected')}
                                disabled={actionLoading}
                                className="btn btn-outline btn-sm"
                                style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <ResourceUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={fetchResources}
        resourceType="community"
        referenceId={communityId}
      />

      <MembershipApplicationModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        communityId={communityId}
        communityName={community?.community_name}
        opening={community?.active_opening}
        onApplicationSubmitted={loadDetails}
      />
    </div>
  );
}
