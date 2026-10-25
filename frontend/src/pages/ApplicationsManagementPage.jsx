import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NameWithVerification from '../components/NameWithVerification';
import { getCollaborationDetails, getCollaborationApplications, acceptApplication, rejectApplication } from '../services/collaborationService';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export default function ApplicationsManagementPage() {
  const { collaborationId } = useParams();
  const navigate = useNavigate();

  const [collab, setCollab] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [collabRes, appsRes] = await Promise.all([
        getCollaborationDetails(collaborationId),
        getCollaborationApplications(collaborationId)
      ]);
      setCollab(collabRes.data);
      setApplications(appsRes.data || []);
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to retrieve applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [collaborationId]);

  const handleAccept = async (appId) => {
    setActionLoading(prev => ({ ...prev, [appId]: 'accept' }));
    try {
      await acceptApplication(appId);
      // Update local state status
      setApplications(prev => prev.map(a => a.application_id === appId ? { ...a, status: 'accepted' } : a));
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Failed to accept application.');
    } finally {
      setActionLoading(prev => ({ ...prev, [appId]: null }));
    }
  };

  const handleReject = async (appId) => {
    setActionLoading(prev => ({ ...prev, [appId]: 'reject' }));
    try {
      await rejectApplication(appId);
      // Update local state status
      setApplications(prev => prev.map(a => a.application_id === appId ? { ...a, status: 'rejected' } : a));
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Failed to reject application.');
    } finally {
      setActionLoading(prev => ({ ...prev, [appId]: null }));
    }
  };

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar active="collaborate" />
        <main className="app-main">
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
            <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
            <p className="eyebrow">Loading applicants list</p>
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
            <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

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
            Manage Applicants
          </span>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/collaborations/${collab.collaboration_id}`)}>
            View Posting
          </button>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 800 }}>
          {/* Header Info */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <span className="eyebrow" style={{ color: 'var(--ink-soft)' }}>Opportunity</span>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginTop: 2, marginBottom: 4 }}>
              {collab.title}
            </h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
              <span>Category: <strong>{collab.category}</strong></span>
              <div style={{ width: 1, height: 12, background: 'var(--line)' }} />
              <span>Positions: <strong>{collab.positions_available} open</strong></span>
              <div style={{ width: 1, height: 12, background: 'var(--line)' }} />
              <span>Applicants: <strong>{applications.length} total</strong></span>
            </div>
          </div>

          {applications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: 'var(--paper-raised)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--line)' }}>
              <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                No applications yet
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)' }}>
                When other students apply to this opportunity, their profiles and resumes will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {applications.map(app => (
                <div key={app.application_id} className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* Applicant Details */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {app.applicant_avatar ? (
                      <img src={app.applicant_avatar} alt={app.applicant_name} className="avatar avatar-lg" style={{ objectFit: 'cover' }} />
                    ) : (
                      <div className="avatar avatar-lg">{initials(app.applicant_name)}</div>
                    )}
                    
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)' }}>
                          <NameWithVerification user={{ name: app.applicant_name, role: app.applicant_role, is_verified: app.applicant_verified }} />
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                          ({app.applicant_email})
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.825rem', color: 'var(--quad-deep)', fontWeight: 500, marginTop: 2 }}>
                        {app.applicant_department || 'General Student'}
                      </div>

                      {app.applicant_skills && app.applicant_skills.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                          {app.applicant_skills.map((s, idx) => (
                            <span key={idx} className="tag" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span className={`role-badge ${
                        app.status === 'accepted' ? 'role-club' : app.status === 'rejected' ? 'role-admin' : 'role-student'
                      }`} style={{ textTransform: 'capitalize', fontSize: '0.75rem', padding: '6px 12px' }}>
                        {app.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'var(--line)' }} />

                  {/* Application Message */}
                  <div>
                    <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Cover Message</span>
                    <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', lineHeight: 1.5, whiteSpace: 'pre-wrap', background: 'var(--paper)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
                      {app.application_message || 'No cover message provided.'}
                    </p>
                  </div>

                  {/* Resume / Actions Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      {app.resume_path ? (
                        <a
                          href={app.resume_path}
                          download
                          className="btn btn-outline btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download Resume
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>No resume attached</span>
                      )}
                    </div>

                    {app.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--coral)', borderColor: 'var(--coral-tint)' }}
                          onClick={() => handleReject(app.application_id)}
                          disabled={actionLoading[app.application_id] !== undefined}
                        >
                          {actionLoading[app.application_id] === 'reject' ? '…' : 'Reject'}
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAccept(app.application_id)}
                          disabled={actionLoading[app.application_id] !== undefined}
                        >
                          {actionLoading[app.application_id] === 'accept' ? '…' : 'Accept Applicant'}
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
