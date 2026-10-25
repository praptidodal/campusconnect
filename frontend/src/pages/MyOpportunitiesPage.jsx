import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getMyCollaborations, deleteCollaboration } from '../services/collaborationService';

function formatDate(dateStr) {
  if (!dateStr) return 'No deadline';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function MyOpportunitiesPage() {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');

  const loadOpportunities = async () => {
    try {
      const res = await getMyCollaborations();
      setOpportunities(res.data || []);
    } catch (err) {
      setError('Failed to load your posted opportunities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  const handleDelete = async (collabId) => {
    if (!window.confirm('Are you sure you want to delete this opportunity? This action cannot be undone.')) return;
    setActionLoading(prev => ({ ...prev, [collabId]: true }));
    try {
      await deleteCollaboration(collabId);
      setOpportunities(prev => prev.filter(o => o.collaboration_id !== collabId));
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Failed to delete opportunity.');
    } finally {
      setActionLoading(prev => ({ ...prev, [collabId]: false }));
    }
  };

  return (
    <div className="app-shell">
      <Sidebar active="collaborate" />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/collaborations')}>
            Back
          </button>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1, paddingLeft: 'var(--space-2)' }}>
            My Postings
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/collaborations/create')}>
            Post Opportunity
          </button>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 750 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-3)' }}>
            Opportunities Posted by You
          </h2>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
              <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
              <p className="eyebrow">Loading your opportunities</p>
            </div>
          ) : (
            <>
              {opportunities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: 'var(--paper-raised)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--line)' }}>
                  <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                    No opportunities posted
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', marginBottom: 'var(--space-3)' }}>
                    Looking for a co-founder, developer, designer, or study group? Post a posting now!
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/collaborations/create')}>
                    Post Opportunity
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {opportunities.map(opp => (
                    <div key={opp.collaboration_id} className="card fade-in" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="role-badge role-club" style={{ fontSize: '0.6rem' }}>{opp.category}</span>
                          {opp.community_name && <span className="role-badge role-faculty" style={{ fontSize: '0.6rem' }}>{opp.community_name}</span>}
                          <span className={`role-badge ${opp.status === 'open' ? 'role-student' : 'role-admin'}`} style={{ fontSize: '0.6rem', textTransform: 'capitalize' }}>
                            {opp.status}
                          </span>
                        </div>
                        <h3 onClick={() => navigate(`/collaborations/${opp.collaboration_id}`)} className="hover:underline" style={{ fontFamily: 'Fraunces, serif', fontSize: '1.1rem', fontWeight: 650, color: 'var(--ink)', cursor: 'pointer', marginTop: 4, marginBottom: 4 }}>
                          {opp.title}
                        </h3>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--ink-faint)' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 5 }}>
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span>Deadline: {formatDate(opp.deadline)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 5 }}>
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                            </svg>
                            <span>{opp.positions_available} open position{opp.positions_available !== 1 && 's'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ color: opp.applications_count > 0 ? 'var(--quad-deep)' : 'var(--ink-faint)', fontWeight: opp.applications_count > 0 ? 600 : 400 }}>
                              {opp.applications_count} applicant{opp.applications_count !== 1 && 's'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => navigate(`/collaborations/${opp.collaboration_id}/applications`)} className="btn btn-primary btn-sm">
                          Manage Applicants
                        </button>
                        <button onClick={() => navigate(`/collaborations/${opp.collaboration_id}`)} className="btn btn-outline btn-sm">
                          Details
                        </button>
                        <button onClick={() => navigate(`/collaborations/edit/${opp.collaboration_id}`)} className="btn btn-outline btn-sm">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(opp.collaboration_id)}
                          disabled={actionLoading[opp.collaboration_id]}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--coral)', borderColor: 'var(--coral-tint)' }}
                        >
                          {actionLoading[opp.collaboration_id] ? '…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
