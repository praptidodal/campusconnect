import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getMyApplications } from '../services/collaborationService';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function MyApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadApplications = async () => {
    try {
      const res = await getMyApplications();
      setApplications(res.data || []);
    } catch (err) {
      setError('Failed to load your submitted applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

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
            My Applications
          </span>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 750 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-3)' }}>
            Applications Submitted by You
          </h2>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
              <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
              <p className="eyebrow">Loading your applications</p>
            </div>
          ) : (
            <>
              {applications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: 'var(--paper-raised)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--line)' }}>
                  <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                    No applications found
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', marginBottom: 'var(--space-3)' }}>
                    Browse open positions on the collaboration marketplace to apply!
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/collaborations')}>
                    Browse Marketplace
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {applications.map(app => {
                    const col = app.collaboration;
                    return (
                      <div key={app.application_id} className="card fade-in" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="role-badge role-club" style={{ fontSize: '0.6rem' }}>{col?.category}</span>
                            {col?.community_name && <span className="role-badge role-faculty" style={{ fontSize: '0.6rem' }}>{col?.community_name}</span>}
                            <span className={`role-badge ${col?.status === 'open' ? 'role-student' : 'role-admin'}`} style={{ fontSize: '0.6rem', textTransform: 'capitalize' }}>
                              Collab: {col?.status}
                            </span>
                          </div>
                          
                          <h3 onClick={() => navigate(`/collaborations/${col?.collaboration_id}`)} className="hover:underline" style={{ fontFamily: 'Fraunces, serif', fontSize: '1.1rem', fontWeight: 650, color: 'var(--ink)', cursor: 'pointer', marginTop: 4, marginBottom: 4 }}>
                            {col?.title}
                          </h3>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.725rem', color: 'var(--ink-soft)' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span>Posted by: <strong>{col?.creator_name}</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span>Applied on: <strong>{formatDate(app.applied_at)}</strong></span>
                            </div>
                            {app.resume_path && (
                              <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 5 }}>
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <a href={app.resume_path} download style={{ color: 'var(--sky-deep, #2C6E92)', textDecoration: 'underline' }}>
                                  Submitted Resume
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Chip & Action */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <span className={`role-badge ${
                            app.status === 'accepted' ? 'role-club' : app.status === 'rejected' ? 'role-admin' : 'role-student'
                          }`} style={{ textTransform: 'capitalize', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {app.status === 'accepted' ? 'Accepted' : app.status === 'rejected' ? 'Rejected' : 'Pending'}
                          </span>
                          <button onClick={() => navigate(`/collaborations/${col?.collaboration_id}`)} className="btn btn-outline btn-sm">
                            View details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
