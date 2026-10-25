import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NameWithVerification from '../components/NameWithVerification';
import { getEventDetails, registerForEvent, cancelRegistration, getEventParticipants, deleteEvent } from '../services/eventService';
import { useAuth } from '../context/AuthContext';
import { useUndoDelete } from '../context/UndoDeleteContext';
import { getResources, downloadResource, deleteResource } from '../services/resourceService';
import ResourceUploadModal from '../components/ResourceUploadModal';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function EventDetailsPage() {
  const { eventId } = useParams();
  const { user: currentUser } = useAuth();
  const { addPendingDelete } = useUndoDelete();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');

  // Flow 13 — Event Resources State
  const [activeTab, setActiveTab] = useState('details');
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fetchResources = async () => {
    if (!eventId) return;
    setResourcesLoading(true);
    try {
      const res = await getResources('event', eventId);
      setResources(res.data || []);
    } catch (err) {
      console.error('Failed to fetch resources', err);
    } finally {
      setResourcesLoading(false);
    }
  };

  const loadDetails = async () => {
    try {
      const res = await getEventDetails(eventId);
      const evData = res.data;
      setEvent(evData);

      // Check if user is organizer to load participant list
      const isOrganizer = currentUser && evData.organizer_id === currentUser.user_id;
      // Also allow community admins/owners if event is community-backed
      // We can optimistically load participants for them since API allows it
      if (isOrganizer || evData.role === 'owner' || evData.role === 'admin') {
        const partRes = await getEventParticipants(eventId);
        setParticipants(partRes.data || []);
      }

      const hasViewAccess = evData.is_registered || isOrganizer || evData.role || currentUser?.role === 'admin';
      if (hasViewAccess) {
        try {
          const resRes = await getResources('event', eventId);
          setResources(resRes.data || []);
        } catch (rErr) {
          console.error('Failed to pre-load resources', rErr);
        }
      } else {
        setResources([]);
      }
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [eventId]);

  const handleRegisterToggle = async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      if (event.is_registered) {
        if (!window.confirm('Are you sure you want to cancel your registration?')) return;
        await cancelRegistration(eventId);
        setEvent(prev => ({
          ...prev,
          is_registered: false,
          registration_status: 'cancelled',
          registered_count: Math.max(0, prev.registered_count - 1),
          remaining_seats: prev.remaining_seats !== null ? prev.remaining_seats + 1 : null,
        }));
        setTimeout(() => {
          const hasAccess = event.role || currentUser?.role === 'admin';
          if (hasAccess) {
            fetchResources();
          } else {
            setResources([]);
          }
        }, 100);
      } else {
        await registerForEvent(eventId);
        setEvent(prev => ({
          ...prev,
          is_registered: true,
          registration_status: 'registered',
          registered_count: prev.registered_count + 1,
          remaining_seats: prev.remaining_seats !== null ? Math.max(0, prev.remaining_seats - 1) : null,
        }));
        fetchResources();
      }
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Registration failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete this event? This action cannot be undone.')) return;
    setDeleteLoading(true);
    try {
      await deleteEvent(eventId);
      navigate('/events');
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Failed to delete event.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar active="events" subtitle="Event Details" />
        <main className="app-main">
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
            <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
            <p className="eyebrow">Loading event details</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="app-shell">
        <Sidebar active="events" subtitle="Error" />
        <main className="app-main">
          <div style={{ padding: 'var(--space-4)' }}>
            <div className="alert alert-error">{error || 'Event not found'}</div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/events')} style={{ marginTop: 'var(--space-2)' }}>
              Back to events
            </button>
          </div>
        </main>
      </div>
    );
  }

  const isOrganizer = currentUser && event.organizer_id === currentUser.user_id;
  const isCommunityLead = event.role === 'owner' || event.role === 'admin';
  const canEdit = isOrganizer || isCommunityLead;
  const canDelete = isOrganizer || event.role === 'owner';

  const hasViewAccess = event.is_registered || isOrganizer || event.role || currentUser?.role === 'admin';
  const canUpload = isOrganizer || isCommunityLead || currentUser?.role === 'admin';

  return (
    <div className="app-shell">
      <Sidebar active="events" subtitle={event.title} />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            Back
          </button>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1, paddingLeft: 'var(--space-2)' }}>
            Event Hub
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {canEdit && (
              <button className="btn btn-outline btn-sm" onClick={() => navigate(`/events/edit/${event.event_id}`)}>
                Edit event
              </button>
            )}
            {canDelete && (
              <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral-tint)' }} onClick={handleDeleteEvent} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting...' : 'Delete event'}
              </button>
            )}
          </div>
        </div>

        {/* Poster / Header Section */}
        {event.poster_url ? (
          <div style={{
            height: 280,
            width: '100%',
            overflow: 'hidden',
            borderBottom: '1px solid var(--line-strong)'
          }}>
            <img
              src={event.poster_url}
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        ) : (
          <div style={{
            height: 140,
            background: 'linear-gradient(135deg, var(--marigold-tint) 0%, var(--sky-tint) 100%)',
            borderBottom: '1px solid var(--line-strong)'
          }} />
        )}

        <div style={{ padding: 'var(--space-4)', maxWidth: 800 }}>
          {/* Tabs switcher */}
          {hasViewAccess && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 'var(--space-4)', gap: 16 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveTab('details')}
                style={{
                  borderRadius: 0,
                  borderBottom: activeTab === 'details' ? '2px solid var(--quad)' : 'none',
                  fontWeight: activeTab === 'details' ? 600 : 400,
                  color: activeTab === 'details' ? 'var(--ink)' : 'var(--ink-soft)'
                }}
              >
                Event Details
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveTab('resources')}
                style={{
                  borderRadius: 0,
                  borderBottom: activeTab === 'resources' ? '2px solid var(--quad)' : 'none',
                  fontWeight: activeTab === 'resources' ? 600 : 400,
                  color: activeTab === 'resources' ? 'var(--ink)' : 'var(--ink-soft)'
                }}
              >
                Resources ({resources.length})
              </button>
            </div>
          )}

          {activeTab === 'details' ? (
            <>
              {/* Main Info */}
              <div className="pin-card pin-marigold fade-in" style={{ marginTop: event.poster_url ? 'var(--space-2)' : -40, position: 'relative', zIndex: 5, marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                  <span className="role-badge role-student">{event.category}</span>
                  {event.community_name && (
                    <Link to={`/communities/${event.community_id}`} className="role-badge role-club hover:underline">
                      {event.community_name}
                    </Link>
                  )}
                  <span className={`role-badge ${event.status === 'upcoming' ? 'role-student' : 'role-admin'}`} style={{ textTransform: 'capitalize' }}>
                    {event.status}
                  </span>
                </div>

                <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.75rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-3)' }}>
                  {event.title}
                </h1>

                {/* Event Meta Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', margin: 'var(--space-3) 0', padding: 'var(--space-2) 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <span className="eyebrow" style={{ color: 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Date & Time
                    </span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--ink)', fontWeight: 600, marginTop: 2 }}>
                      {formatDate(event.start_datetime)}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: 2 }}>
                      {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                    </p>
                  </div>

                  <div>
                    <span className="eyebrow" style={{ color: 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      Venue
                    </span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--ink)', fontWeight: 600, marginTop: 2 }}>
                      {event.venue || 'No venue specified'}
                    </p>
                  </div>

                  <div>
                    <span className="eyebrow" style={{ color: 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Organizer
                    </span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--ink)', fontWeight: 600, marginTop: 2 }}>
                      <NameWithVerification user={{ name: event.organizer_name, role: event.organizer_role, is_verified: event.organizer_verified }} />
                    </p>
                  </div>
                </div>

                <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {event.description}
                </p>
              </div>

              {/* Seat booking widget */}
              <div className="card fade-in" style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.1rem', fontWeight: 650, color: 'var(--ink)' }}>
                      Registration status
                    </h3>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                      <div>Total Registrations: <strong>{event.registered_count}</strong></div>
                      {event.max_participants && (
                        <>
                          <div style={{ width: 1, height: 12, background: 'var(--line)' }} />
                          <div>Capacity: <strong>{event.max_participants} seats</strong></div>
                          <div style={{ width: 1, height: 12, background: 'var(--line)' }} />
                          <div>Seats Left: <strong style={{ color: event.remaining_seats === 0 ? 'var(--coral)' : 'var(--quad)' }}>{event.remaining_seats}</strong></div>
                        </>
                      )}
                    </div>
                    {event.registration_deadline && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-faint)', marginTop: 4 }}>
                        Registration deadline: {new Date(event.registration_deadline).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {event.status === 'upcoming' && (
                    <button
                      onClick={handleRegisterToggle}
                      disabled={actionLoading || (event.remaining_seats === 0 && !event.is_registered)}
                      className={`btn ${event.is_registered ? 'btn-outline' : 'btn-primary'}`}
                      style={{ minWidth: 150 }}
                    >
                      {actionLoading ? '…' : event.is_registered ? 'Cancel Registration' : (event.remaining_seats === 0 ? 'Fully Booked' : 'Register Now')}
                    </button>
                  )}
                </div>
              </div>

              {/* Participant Directory Card */}
              {participants.length > 0 && (
                <div className="card fade-in">
                  <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-3)' }}>
                    Registered Participants
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {participants.map(part => (
                      <div key={part.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                        {part.profile_picture ? (
                          <img src={part.profile_picture} alt={part.name} className="avatar" style={{ width: 36, height: 36 }} onError={e => e.target.style.display = 'none'} />
                        ) : (
                          <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.75rem' }}>{initials(part.name)}</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)' }}>{part.name}</span>
                            <span className={`role-badge ${part.registration_status === 'registered' ? 'role-student' : 'role-admin'}`} style={{ fontSize: '0.55rem', textTransform: 'capitalize' }}>
                              {part.registration_status}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, fontSize: '0.75rem', color: 'var(--ink-faint)' }}>
                            {part.department && <span>{part.department}</span>}
                            <span>Registered on {new Date(part.registered_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Resources Tab Content */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 650, color: 'var(--ink)', margin: 0 }}>
                  Event Resources
                </h3>
                {canUpload && (
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
                  <p className="eyebrow" style={{ fontStyle: 'italic', margin: 0 }}>No resources shared for this event yet.</p>
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
      </main>

      <ResourceUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={fetchResources}
        resourceType="event"
        referenceId={eventId}
      />
    </div>
  );
}
