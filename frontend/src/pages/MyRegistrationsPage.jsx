import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getMyRegistrations, cancelRegistration } from '../services/eventService';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function MyRegistrationsPage() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');

  const loadRegistrations = async () => {
    try {
      const res = await getMyRegistrations();
      setRegistrations(res.data);
    } catch {
      setError('Failed to load registered events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const handleCancel = async (eventId) => {
    if (!window.confirm('Are you sure you want to cancel your registration?')) return;
    setActionLoading(prev => ({ ...prev, [eventId]: true }));
    try {
      await cancelRegistration(eventId);
      setRegistrations(prev => prev.filter(r => r.event_id !== eventId));
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Cancellation failed.');
    } finally {
      setActionLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  return (
    <div className="app-shell">
      <Sidebar active="events" subtitle="My Registrations" />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/events')}>
            Back
          </button>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1, paddingLeft: 'var(--space-2)' }}>
            My Registrations
          </span>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 720 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-3)' }}>
            Registered Events
          </h2>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
              <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
              <p className="eyebrow">Loading registrations</p>
            </div>
          ) : (
            <>
              {registrations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: 'var(--paper-raised)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--line)' }}>
                  <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                    No registrations found
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', marginBottom: 'var(--space-3)' }}>
                    Browse upcoming events to sign up!
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/events')}>
                    Browse Events
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {registrations.map(ev => (
                    <div key={ev.event_id} className="card fade-in" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <span className="role-badge role-student" style={{ fontSize: '0.6rem' }}>{ev.category}</span>
                        <h3 onClick={() => navigate(`/events/${ev.event_id}`)} className="hover:underline" style={{ fontFamily: 'Fraunces, serif', fontSize: '1.1rem', fontWeight: 650, color: 'var(--ink)', cursor: 'pointer', marginTop: 4, marginBottom: 4 }}>
                          {ev.title}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.725rem', color: 'var(--ink-soft)' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span>{formatDate(ev.start_datetime)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span>{ev.venue || 'No location specified'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => navigate(`/events/${ev.event_id}`)} className="btn btn-outline btn-sm">
                          View details
                        </button>
                        <button
                          onClick={() => handleCancel(ev.event_id)}
                          disabled={actionLoading[ev.event_id]}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--coral)', borderColor: 'var(--coral-tint)' }}
                        >
                          {actionLoading[ev.event_id] ? '…' : 'Cancel Registration'}
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
