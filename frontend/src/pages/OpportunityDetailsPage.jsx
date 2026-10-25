import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NameWithVerification from '../components/NameWithVerification';
import { getCollaborationDetails, applyForCollaboration, deleteCollaboration } from '../services/collaborationService';
import { useAuth } from '../context/AuthContext';
import { useUndoDelete } from '../context/UndoDeleteContext';
import { createOrGetConversation } from '../services/chatService';
import { getResources, downloadResource, deleteResource } from '../services/resourceService';
import ResourceUploadModal from '../components/ResourceUploadModal';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return 'No deadline';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function OpportunityDetailsPage() {
  const { collaborationId } = useParams();
  const { user: currentUser } = useAuth();
  const { addPendingDelete } = useUndoDelete();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [collab, setCollab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Application Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Flow 13 — Collaboration Resources State
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fetchResources = async () => {
    if (!collaborationId) return;
    setResourcesLoading(true);
    try {
      const res = await getResources('collaboration', collaborationId);
      setResources(res.data || []);
    } catch (err) {
      console.error('Failed to fetch resources', err);
    } finally {
      setResourcesLoading(false);
    }
  };

  const loadDetails = async () => {
    try {
      const res = await getCollaborationDetails(collaborationId);
      const cData = res.data;
      setCollab(cData);

      const isOwner = currentUser && cData.created_by === currentUser.user_id;
      const canView = isOwner || (cData.is_applied && cData.application_status === 'accepted') || currentUser?.role === 'admin';
      if (canView) {
        try {
          const resRes = await getResources('collaboration', collaborationId);
          setResources(resRes.data || []);
        } catch (rErr) {
          console.error('Failed to pre-load resources', rErr);
        }
      } else {
        setResources([]);
      }
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to load opportunity details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [collaborationId]);

  const handleGoToTeamChat = async () => {
    try {
      const res = await createOrGetConversation({
        conversation_type: 'collaboration',
        collaboration_id: parseInt(collaborationId)
      });
      navigate(`/messages?conversation_id=${res.data.conversation_id}`);
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Failed to open team chat.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this opportunity? This action cannot be undone.')) return;
    try {
      await deleteCollaboration(collaborationId);
      navigate('/collaborations');
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Failed to delete opportunity.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Local validation
    if (file.size > 5 * 1024 * 1024) {
      setModalError('Resume file size must be less than 5MB.');
      return;
    }
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      setModalError('Only PDF, DOC, and DOCX formats are allowed for resumes.');
      return;
    }

    setResumeFile(file);
    setModalError('');
  };

  const removeResume = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setResumeFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setSuccessMessage('');
    setSubmitLoading(true);

    const fd = new FormData();
    if (applicationMessage.trim()) {
      fd.append('application_message', applicationMessage.trim());
    }
    if (resumeFile) {
      fd.append('resume', resumeFile);
    }

    try {
      await applyForCollaboration(collaborationId, fd);
      setSuccessMessage('Application submitted successfully!');
      setTimeout(() => {
        setShowApplyModal(false);
        setApplicationMessage('');
        setResumeFile(null);
        setSuccessMessage('');
        loadDetails();
      }, 1500);
    } catch (err) {
      setModalError(err.response?.data?.detail?.message || 'Failed to submit application.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar active="collaborate" />
        <main className="app-main">
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
            <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
            <p className="eyebrow">Loading opportunity details</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !collab) {
    return (
      <div className="app-shell">
        <Sidebar active="collaborate" />
        <main className="app-main">
          <div style={{ padding: 'var(--space-4)' }}>
            <div className="alert alert-error">{error || 'Opportunity not found'}</div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/collaborations')} style={{ marginTop: 'var(--space-2)' }}>
              Back to Marketplace
            </button>
          </div>
        </main>
      </div>
    );
  }

  const isOwner = currentUser && collab.created_by === currentUser.user_id;
  const canViewResources = isOwner || (collab.is_applied && collab.application_status === 'accepted') || currentUser?.role === 'admin';
  const canUpload = canViewResources;

  return (
    <div className="app-shell">
      <Sidebar active="collaborate" />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            Back
          </button>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1, paddingLeft: 'var(--space-2)' }}>
            Opportunity Details
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {isOwner && (
              <>
                <button className="btn btn-outline btn-sm" onClick={() => navigate(`/collaborations/${collab.collaboration_id}/applications`)}>
                  Manage Applications
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => navigate(`/collaborations/edit/${collab.collaboration_id}`)}>
                  Edit Post
                </button>
                <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral-tint)' }} onClick={handleDelete}>
                  Delete Post
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: 'var(--space-4)', maxWidth: 800 }}>
          <div className="pin-card pin-marigold fade-in" style={{ marginBottom: 'var(--space-4)' }}>
            
            {/* Header tags */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span className="role-badge role-club">{collab.category}</span>
              {collab.community_name && (
                <Link to={`/communities/${collab.community_id}`} className="role-badge role-club hover:underline" style={{ color: 'var(--marigold-deep)' }}>
                  {collab.community_name}
                </Link>
              )}
              <span className={`role-badge ${collab.status === 'open' ? 'role-student' : 'role-admin'}`} style={{ textTransform: 'capitalize' }}>
                {collab.status}
              </span>
            </div>

            {/* Title */}
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.75rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-3)' }}>
              {collab.title}
            </h1>

            {/* Opportunity metadata grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', margin: 'var(--space-3) 0', padding: 'var(--space-2) 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
              <div>
                <span className="eyebrow" style={{ color: 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Application Deadline
                </span>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink)', fontWeight: 600, marginTop: 2 }}>
                  {formatDate(collab.deadline)}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: 2 }}>
                  at {formatTime(collab.deadline)}
                </p>
              </div>

              <div>
                <span className="eyebrow" style={{ color: 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Positions Available
                </span>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink)', fontWeight: 600, marginTop: 2 }}>
                  {collab.positions_available} Open Position{collab.positions_available !== 1 && 's'}
                </p>
              </div>

              <div>
                <span className="eyebrow" style={{ color: 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Posted By
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {collab.creator_avatar ? (
                    <img src={collab.creator_avatar} alt={collab.creator_name} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--sky-tint)', color: 'var(--sky-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold' }}>
                      {initials(collab.creator_name)}
                    </div>
                  )}
                  <span style={{ fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 500 }}>
                    <NameWithVerification user={{ name: collab.creator_name, role: collab.creator_role, is_verified: collab.creator_verified }} />
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <span className="eyebrow" style={{ color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Project Description</span>
              <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {collab.description}
              </p>
            </div>

            {/* Required Skills */}
            {collab.required_skills && (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <span className="eyebrow" style={{ color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Required Skills</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {collab.required_skills.split(',').map((skill, idx) => (
                    <span key={idx} className="tag tag-quad">
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Attachment Download */}
            {collab.attachment_path && (
              <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--line)', paddingTop: 'var(--space-2)' }}>
                <span className="eyebrow" style={{ color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Specification / Resources</span>
                <a
                  href={collab.attachment_path}
                  download
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Attachment Spec
                </a>
              </div>
            )}
          </div>

          {/* Action Box */}
          <div className="card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.1rem', fontWeight: 650, color: 'var(--ink)' }}>
                  Application Status
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: 4 }}>
                  {collab.is_applied 
                    ? `You submitted an application for this opportunity.` 
                    : isOwner 
                      ? 'You are the coordinator of this collaboration.' 
                      : 'Applications are currently open for this opportunity.'
                  }
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {(isOwner || (collab.is_applied && collab.application_status === 'accepted')) && (
                  <button className="btn btn-accent btn-sm" onClick={handleGoToTeamChat}>
                    Team Chat
                  </button>
                )}
                {collab.is_applied ? (
                  <span className={`role-badge ${
                    collab.application_status === 'accepted' ? 'role-club' : collab.application_status === 'rejected' ? 'role-admin' : 'role-student'
                  }`} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                    {collab.application_status === 'accepted' ? 'Accepted' : collab.application_status === 'rejected' ? 'Rejected' : 'Applied (Pending)'}
                  </span>
                ) : isOwner ? (
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/collaborations/${collab.collaboration_id}/applications`)}>
                    Manage Applicants ({collab.applications_count})
                  </button>
                ) : collab.status === 'open' ? (
                  <button className="btn btn-primary btn-sm" onClick={() => setShowApplyModal(true)}>
                    Apply for Position
                  </button>
                ) : (
                  <span className="role-badge role-admin" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                    Closed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Shared Files Section (visible to creator/accepted team members/admin) */}
          {canViewResources && (
            <div className="card fade-in" style={{ marginTop: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                  Shared Team Files
                </h2>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  Upload File
                </button>
              </div>

              {resourcesLoading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--ink-soft)' }}>
                  Loading files...
                </div>
              ) : resources.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', background: 'var(--bg-light)', border: '1.5px dashed var(--line)', borderRadius: 'var(--radius-md)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto var(--space-1)', color: 'var(--ink-faint)' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p className="eyebrow" style={{ fontStyle: 'italic', margin: 0 }}>No files shared in this collaboration project yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {resources.map((res) => {
                    const isUploader = currentUser?.user_id === res.uploaded_by;
                    const canDeleteResource = isUploader || currentUser?.role === 'admin';
                    
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
                      <div key={res.resource_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                          {renderFileIcon(res.file_type)}
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 650, color: 'var(--ink)' }}>
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
                              <span>{new Date(res.created_at).toLocaleDateString()}</span>
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

                          {canDeleteResource && (
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
          )}
        </div>

        {/* Apply Modal */}
        {showApplyModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(28, 27, 25, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999
          }}>
            <div className="pin-card pin-marigold fade-in" style={{ width: '90%', maxWidth: 500, background: '#fff', padding: 'var(--space-3)' }}>
              
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)' }}>
                  Submit Application
                </h3>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: '1.5rem', fontWeight: 'bold' }}
                >
                  &times;
                </button>
              </div>

              {modalError && <div className="alert alert-error">{modalError}</div>}
              {successMessage && <div className="alert alert-success">{successMessage}</div>}

              <form onSubmit={handleApplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                
                {/* Message text area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="eyebrow" htmlFor="message">Application Message *</label>
                  <textarea
                    id="message"
                    className="input"
                    rows={4}
                    placeholder="Introduce yourself and explain why you're a good fit for this project..."
                    value={applicationMessage}
                    onChange={(e) => setApplicationMessage(e.target.value)}
                    required
                    disabled={submitLoading || successMessage !== ''}
                  />
                </div>

                {/* Resume upload */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="eyebrow">Resume / Portfolio Upload *</label>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    {resumeFile ? (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                        border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-light)',
                        position: 'relative'
                      }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--ink)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {resumeFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={removeResume}
                          style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--coral)', fontSize: '12px',
                            boxShadow: 'var(--shadow)', zIndex: 10
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', border: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-light)', color: 'var(--ink-faint)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                      </div>
                    )}

                    <label
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 600, color: 'var(--sky-deep, #2C6E92)',
                        background: '#FFFFFF', border: '1.5px solid var(--sky)', borderRadius: 'var(--radius-sm)',
                        padding: '7px 16px', transition: 'background 150ms ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--sky-tint)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                    >
                      <span>Choose PDF/Word</span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        required={!resumeFile}
                        disabled={submitLoading || successMessage !== ''}
                      />
                    </label>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--ink-faint)' }}>
                    Max size: 5MB. Formats: PDF, DOC, DOCX.
                  </span>
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 'var(--space-1)' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowApplyModal(false)}
                    disabled={submitLoading || successMessage !== ''}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={submitLoading || successMessage !== '' || !resumeFile}
                  >
                    {submitLoading ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <ResourceUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={fetchResources}
        resourceType="collaboration"
        referenceId={collaborationId}
      />
    </div>
  );
}
