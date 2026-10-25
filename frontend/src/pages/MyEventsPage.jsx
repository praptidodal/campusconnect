import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getMyEvents, deleteEvent } from '../services/eventService';

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

export default function MyEventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');

  const loadEvents = async () => {
    try {
      const res = await getMyEvents();
      setEvents(res.data);
    } catch {
      setError('Failed to load organized events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleDelete = async (eventId) => {
    if (!window.confirm('WARNING: Are you sure you want to delete this event? This action cannot be undone.')) return;
    setActionLoading(prev => ({ ...prev, [eventId]: true }));
    try {
      await deleteEvent(eventId);
      setEvents(prev => prev.filter(e => e.event_id !== eventId));
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Failed to delete event.');
    } finally {
      setActionLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  return (
    <div className="app-shell">
      <Sidebar active="events" subtitle="My Hosted Events" />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/events')}>
            Back
          </button>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1, paddingLeft: 'var(--space-2)' }}>
            My Organized Events
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/events/create')}>
            Host event
          </button>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 720 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-3)' }}>
            Events Hosted by You
          </h2>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
              <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
              <p className="eyebrow">Loading organized events</p>
            </div>
          ) : (
            <>
              {events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: 'var(--paper-raised)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--line)' }}>
                  <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                    No events hosted
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', marginBottom: 'var(--space-3)' }}>
                    Host your first workshop or meet-up now!
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/events/create')}>
                    Host Event
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {events.map(ev => (
                    <div key={ev.event_id} className="card fade-in" style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap',
                      borderColor: ev.approval_status === 'pending' ? '#f59e0b' : ev.approval_status === 'rejected' ? 'var(--coral)' : undefined,
                      borderWidth: ev.approval_status !== 'approved' ? '1.5px' : undefined,
                    }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="role-badge role-faculty" style={{ fontSize: '0.6rem' }}>{ev.category}</span>
                          {ev.community_name && <span className="role-badge role-club" style={{ fontSize: '0.6rem' }}>{ev.community_name}</span>}
                          <span className={`role-badge ${ev.status === 'upcoming' ? 'role-student' : 'role-admin'}`} style={{ fontSize: '0.6rem', textTransform: 'capitalize' }}>{ev.status}</span>
                          {/* Approval Status Badge */}
                          {ev.approval_status === 'pending' && (
                            <span style={{ fontSize: '0.6rem', padding: '1px 7px', borderRadius: '4px', fontFamily: 'JetBrains Mono', fontWeight: 700, background: '#fff8e1', color: '#d97706', border: '1px solid #f59e0b', textTransform: 'uppercase' }}>
                              ⏳ Pending Approval
                            </span>
                          )}
                          {ev.approval_status === 'rejected' && (
                            <span style={{ fontSize: '0.6rem', padding: '1px 7px', borderRadius: '4px', fontFamily: 'JetBrains Mono', fontWeight: 700, background: '#fff1f2', color: '#e11d48', border: '1px solid #fda4af', textTransform: 'uppercase' }}>
                              ✕ Not Approved
                            </span>
                          )}
                        </div>
                        <h3 onClick={() => navigate(`/events/${ev.event_id}`)} className="hover:underline" style={{ fontFamily: 'Fraunces, serif', fontSize: '1.1rem', fontWeight: 650, color: 'var(--ink)', cursor: 'pointer', marginTop: 4, marginBottom: 4 }}>
                          {ev.title}
                        </h3>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--ink-faint)' }}>
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
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            <span>{ev.registered_count} registered {ev.max_participants && `/ ${ev.max_participants} max`}</span>
                          </div>
                        </div>
                          {ev.approval_notes && ev.approval_status !== 'approved' && (
                            <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#92400e', background: '#fffbea', border: '1px solid #f59e0b', borderRadius: '4px', padding: '4px 8px' }}>
                              <strong>Notes:</strong> {ev.approval_notes}
                            </div>
                          )}
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        {ev.approval_status === 'approved' && (
                          <button onClick={() => navigate(`/events/${ev.event_id}`)} className="btn btn-outline btn-sm">
                            Details
                          </button>
                        )}
                        <button onClick={() => navigate(`/events/edit/${ev.event_id}`)} className="btn btn-outline btn-sm">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(ev.event_id)}
                          disabled={actionLoading[ev.event_id]}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--coral)', borderColor: 'var(--coral-tint)' }}
                        >
                          {actionLoading[ev.event_id] ? '…' : 'Delete'}
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
