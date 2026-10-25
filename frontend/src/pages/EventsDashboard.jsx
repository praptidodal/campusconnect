import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { listEvents, searchEvents, registerForEvent, cancelRegistration } from '../services/eventService';
import { useAuth } from '../context/AuthContext';

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

export default function EventsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTitle, setSearchTitle] = useState('');
  const [searchCategory, setSearchCategory] = useState('All');
  const [searchCommunity, setSearchCommunity] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const CATEGORIES = [
    'All',
    'Workshop',
    'Seminar',
    'Club Meeting',
    'Social Event',
    'Competition',
    'Guest Lecture',
    'Other',
  ];

  const fetchEvents = async (title = '', cat = 'All', comm = '') => {
    setLoading(true);
    try {
      let res;
      const activeCat = cat === 'All' ? '' : cat;
      if (title || activeCat || comm) {
        res = await searchEvents({ title, category: activeCat, community: comm });
      } else {
        res = await listEvents();
      }
      setEvents(res.data);
    } catch {
      setError('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvents(searchTitle, searchCategory, searchCommunity);
  };

  const handleCategoryChange = (cat) => {
    setSearchCategory(cat);
    fetchEvents(searchTitle, cat, searchCommunity);
  };

  const handleRegisterToggle = async (eventId, isRegistered) => {
    setActionLoading(prev => ({ ...prev, [eventId]: true }));
    try {
      if (isRegistered) {
        await cancelRegistration(eventId);
        setEvents(prev =>
          prev.map(e =>
            e.event_id === eventId
              ? { ...e, is_registered: false, registration_status: 'cancelled', registered_count: Math.max(0, e.registered_count - 1), remaining_seats: e.remaining_seats !== null ? e.remaining_seats + 1 : null }
              : e
          )
        );
      } else {
        await registerForEvent(eventId);
        setEvents(prev =>
          prev.map(e =>
            e.event_id === eventId
              ? { ...e, is_registered: true, registration_status: 'registered', registered_count: e.registered_count + 1, remaining_seats: e.remaining_seats !== null ? Math.max(0, e.remaining_seats - 1) : null }
              : e
          )
        );
      }
    } catch (err) {
      setActionError(err.response?.data?.detail?.message || 'Registration failed.');
    } finally {
      setActionLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  // Group into featured (first 2 upcoming events) and normal list
  const featuredEvents = events.filter(e => e.status === 'upcoming').slice(0, 2);
  const otherEvents = events;

  return (
    <div className="app-shell">
      <Sidebar active="events" subtitle="Campus Events" />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1 }}>
            Campus Event Hub
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/events/my-registrations')}>
              My registrations
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/events/my-events')}>
              My events
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/events/create')}>
              Host event
            </button>
          </div>
        </div>

        <div style={{ padding: 'var(--space-4)' }}>
          {actionError && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>
              {actionError}
            </div>
          )}
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
            <input
              type="text"
              className="input"
              placeholder="Search by event title..."
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search by host community..."
              value={searchCommunity}
              onChange={(e) => setSearchCommunity(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
            />
            <button type="submit" className="btn btn-outline" style={{ minWidth: 100 }}>
              Filter
            </button>
          </form>

          {/* Categories bar */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 'var(--space-4)' }}>
            {CATEGORIES.map(cat => {
              const isActive = searchCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`tag ${isActive ? 'tag-quad' : 'tag-clickable'}`}
                  style={{ whiteSpace: 'nowrap', borderStyle: isActive ? 'solid' : 'dashed' }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
              <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
              <p className="eyebrow">Loading events list</p>
            </div>
          ) : (
            <>
              {/* Featured Section */}
              {!searchTitle && !searchCommunity && searchCategory === 'All' && featuredEvents.length > 0 && (
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-3)' }}>
                    Featured Events
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
                    {featuredEvents.map(ev => (
                      <div key={`feat-${ev.event_id}`} className="pin-card pin-marigold fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                        <div>
                          {/* Image Poster */}
                          {ev.poster_url && (
                            <div style={{ height: 160, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--line)', marginBottom: 'var(--space-2)' }}>
                              <img src={ev.poster_url} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.parentNode.style.display = 'none'} />
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                            <span className="role-badge role-admin" style={{ fontSize: '0.65rem' }}>{ev.category}</span>
                            {ev.community_name && <span className="role-badge role-club" style={{ fontSize: '0.65rem' }}>{ev.community_name}</span>}
                          </div>
                          <h3 onClick={() => navigate(`/events/${ev.event_id}`)} className="hover:underline" style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer', marginBottom: 8 }}>
                            {ev.title}
                          </h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 12 }}>
                            {ev.description}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              <span>{formatDate(ev.start_datetime)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <span>{ev.venue || 'No location specified'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--line)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>
                            {ev.registered_count} attending {ev.remaining_seats !== null && `(${ev.remaining_seats} left)`}
                          </span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => navigate(`/events/${ev.event_id}`)} className="btn btn-outline btn-sm">Details</button>
                            <button
                              onClick={() => handleRegisterToggle(ev.event_id, ev.is_registered)}
                              disabled={actionLoading[ev.event_id] || ev.status === 'cancelled'}
                              className={`btn btn-sm ${ev.is_registered ? 'btn-outline' : 'btn-primary'}`}
                              style={{ minWidth: 80 }}
                            >
                              {actionLoading[ev.event_id] ? '…' : ev.is_registered ? 'Leave' : 'Join'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Events list */}
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-3)' }}>
                {searchTitle || searchCommunity || searchCategory !== 'All' ? 'Search Results' : 'Explore All Events'}
              </h2>

              {otherEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: 'var(--paper-raised)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--line)' }}>
                  <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                    No events found
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)' }}>
                    Try adjusting your filters or hosting a new event!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 'var(--space-3)' }}>
                  {otherEvents.map(ev => (
                    <div key={ev.event_id} className="card fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                      <div>
                        {ev.poster_url && (
                          <div style={{ height: 130, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--line)', marginBottom: 'var(--space-2)' }}>
                            <img src={ev.poster_url} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.parentNode.style.display = 'none'} />
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                          <span className="role-badge role-student" style={{ fontSize: '0.6rem' }}>{ev.category}</span>
                          {ev.community_name && <span className="role-badge role-faculty" style={{ fontSize: '0.6rem' }}>{ev.community_name}</span>}
                          <span className={`role-badge ${ev.status === 'upcoming' ? 'role-student' : 'role-admin'}`} style={{ fontSize: '0.6rem', textTransform: 'capitalize' }}>{ev.status}</span>
                        </div>
                        <h3 onClick={() => navigate(`/events/${ev.event_id}`)} className="hover:underline" style={{ fontFamily: 'Fraunces, serif', fontSize: '1.05rem', fontWeight: 650, color: 'var(--ink)', cursor: 'pointer', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.title}
                        </h3>
                        <p style={{ fontSize: '0.825rem', color: 'var(--ink-soft)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 10 }}>
                          {ev.description}
                        </p>
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

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--line)' }}>
                        <span style={{ fontSize: '0.725rem', color: 'var(--ink-faint)' }}>
                          {ev.registered_count} attending {ev.remaining_seats !== null && `(${ev.remaining_seats} seats left)`}
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => navigate(`/events/${ev.event_id}`)} className="btn btn-outline btn-sm" style={{ padding: '4px 8px' }}>Details</button>
                          {ev.status === 'upcoming' && (
                            <button
                              onClick={() => handleRegisterToggle(ev.event_id, ev.is_registered)}
                              disabled={actionLoading[ev.event_id]}
                              className={`btn btn-sm ${ev.is_registered ? 'btn-outline' : 'btn-primary'}`}
                              style={{ minWidth: 68, padding: '4px 8px' }}
                            >
                              {actionLoading[ev.event_id] ? '…' : ev.is_registered ? 'Leave' : 'Join'}
                            </button>
                          )}
                        </div>
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
