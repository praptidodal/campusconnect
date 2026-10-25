import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { createEvent, updateEvent, getEventDetails, uploadEventPoster } from '../services/eventService';
import { getMyProfile } from '../services/profileService';

const formatForInput = (isoString) => {
  if (!isoString) return '';
  return isoString.slice(0, 16);
};

export default function CreateEventPage() {
  const fileInputRef = useRef(null);
  const { eventId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(eventId);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Workshop',
    venue: '',
    start_datetime: '',
    end_datetime: '',
    registration_deadline: '',
    poster_url: '',
    community_id: '',
    max_participants: '',
  });

  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [error, setError] = useState('');
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedTitle, setSubmittedTitle] = useState('');

  const handlePosterFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPoster(true);
    setError('');
    try {
      const res = await uploadEventPoster(file);
      setFormData(prev => ({ ...prev, poster_url: res.data.url }));
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to upload event poster.');
    } finally {
      setUploadingPoster(false);
    }
  };

  const CATEGORIES = [
    'Workshop',
    'Seminar',
    'Club Meeting',
    'Social Event',
    'Competition',
    'Guest Lecture',
    'Other',
  ];

  useEffect(() => {
    const loadFormInfo = async () => {
      try {
        // Fetch user communities to populate dropdown
        const profRes = await getMyProfile();
        setCommunities(profRes.data.communities || []);

        if (isEditMode) {
          const eventRes = await getEventDetails(eventId);
          const ev = eventRes.data;
          setFormData({
            title: ev.title || '',
            description: ev.description || '',
            category: ev.category || 'Workshop',
            venue: ev.venue || '',
            start_datetime: formatForInput(ev.start_datetime),
            end_datetime: formatForInput(ev.end_datetime),
            registration_deadline: formatForInput(ev.registration_deadline),
            poster_url: ev.poster_url || '',
            community_id: ev.community_id || '',
            max_participants: ev.max_participants || '',
          });
        }
      } catch (err) {
        setError('Failed to load form details.');
      } finally {
        setFetching(false);
      }
    };
    loadFormInfo();
  }, [eventId, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    const start = new Date(formData.start_datetime);
    const end = new Date(formData.end_datetime);
    if (end <= start) {
      setError('End date and time must be after the start date and time');
      return;
    }

    if (formData.registration_deadline) {
      const deadline = new Date(formData.registration_deadline);
      if (deadline > start) {
        setError('Registration deadline must be before or equal to the event start time');
        return;
      }
    }

    setLoading(true);
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      venue: formData.venue.trim() || null,
      start_datetime: formData.start_datetime,
      end_datetime: formData.end_datetime,
      registration_deadline: formData.registration_deadline || null,
      poster_url: formData.poster_url.trim() || null,
      community_id: formData.community_id ? Number(formData.community_id) : null,
      max_participants: formData.max_participants ? Number(formData.max_participants) : null,
    };

    try {
      if (isEditMode) {
        await updateEvent(eventId, payload);
        navigate(`/events/${eventId}`);
      } else {
        const res = await createEvent(payload);
        // Show pending approval message instead of navigating to pending event
        setSubmittedTitle(payload.title);
        setSubmitted(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'An error occurred while saving the event.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success / Pending State ──
  if (submitted) {
    return (
      <div className="app-shell">
        <Sidebar active="events" subtitle="Create Event" />
        <main className="app-main">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
            <div style={{ fontSize: '3rem' }}>🕐</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: 'Fraunces', textAlign: 'center', margin: 0 }}>
              Event Submitted for Review!
            </h2>
            <div style={{ maxWidth: '480px', textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 var(--space-2)' }}>
                Your event <strong>"{submittedTitle}"</strong> has been submitted for admin approval.
                You'll be notified once it's been reviewed.
              </p>
              <div style={{
                background: '#fff8e1', border: '1.5px solid #f59e0b', borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2)', fontSize: '0.85rem', color: '#92400e',
              }}>
                <strong>What happens next?</strong> An admin will review your event and either approve it,
                request changes, or decline it. You will be notified by email and in-app.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/events/my-events')}
                className="btn btn-primary"
                id="view-my-events-btn"
              >
                View My Events
              </button>
              <button
                onClick={() => navigate('/events')}
                className="btn btn-outline"
              >
                Browse Events
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="app-shell">
        <Sidebar active="events" subtitle={isEditMode ? "Edit Event" : "Create Event"} />
        <main className="app-main">
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
            <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
            <p className="eyebrow">Loading form details</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar active="events" subtitle={isEditMode ? "Edit Event" : "Create Event"} />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            Back
          </button>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1, paddingLeft: 'var(--space-2)' }}>
            {isEditMode ? 'Modify Event Details' : 'Host a New Event'}
          </span>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 640 }}>
          <div className="pin-card pin-marigold fade-in">
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-1)' }}>
              {isEditMode ? 'Update Campus Event' : 'Create a Campus Event'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', marginBottom: 'var(--space-4)' }}>
              Host workshops, seminars, club social events, or events on behalf of your communities.
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="eyebrow" htmlFor="title">Event Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  className="input"
                  placeholder="e.g. Annual AI Symposium"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="eyebrow" htmlFor="category">Category</label>
                  <select
                    id="category"
                    name="category"
                    className="input"
                    value={formData.category}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ appearance: 'none', background: 'var(--paper-raised)' }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="eyebrow" htmlFor="community_id">Host Community</label>
                  <select
                    id="community_id"
                    name="community_id"
                    className="input"
                    value={formData.community_id}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ appearance: 'none', background: 'var(--paper-raised)' }}
                  >
                    <option value="">Personal / Individual (No Community)</option>
                    {communities.map(c => (
                      <option key={c.community_id} value={c.community_id}>
                        {c.community_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="eyebrow" htmlFor="venue">Venue / Location</label>
                  <input
                    type="text"
                    id="venue"
                    name="venue"
                    className="input"
                    placeholder="e.g. Auditorium Hall B"
                    value={formData.venue}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="eyebrow" htmlFor="max_participants">Max Capacity / Seats (Optional)</label>
                  <input
                    type="number"
                    id="max_participants"
                    name="max_participants"
                    className="input"
                    placeholder="e.g. 100"
                    min="1"
                    value={formData.max_participants}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="eyebrow" htmlFor="start_datetime">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    id="start_datetime"
                    name="start_datetime"
                    className="input"
                    value={formData.start_datetime}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="eyebrow" htmlFor="end_datetime">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    id="end_datetime"
                    name="end_datetime"
                    className="input"
                    value={formData.end_datetime}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="eyebrow" htmlFor="registration_deadline">Registration Deadline (Optional)</label>
                  <input
                    type="datetime-local"
                    id="registration_deadline"
                    name="registration_deadline"
                    className="input"
                    value={formData.registration_deadline}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="eyebrow">Event Poster Image (Optional)</label>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    {formData.poster_url ? (
                      <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', overflow: 'hidden' }}>
                        <img src={formData.poster_url} alt="Poster Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, poster_url: '' }));
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          style={{
                            position: 'absolute', top: 4, right: 4, background: 'rgba(255, 255, 255, 0.9)',
                            border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--coral)', fontSize: '14px',
                            zIndex: 10, boxShadow: 'var(--shadow)'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-sm)', border: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-light)', color: 'var(--ink-faint)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
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
                      <span>{uploadingPoster ? 'Uploading...' : 'Choose Poster Image'}</span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handlePosterFileChange}
                        style={{ display: 'none' }}
                        disabled={uploadingPoster || loading}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="eyebrow" htmlFor="description">Event Description *</label>
                <textarea
                  id="description"
                  name="description"
                  className="input"
                  placeholder="Describe details, agenda, requirements, guest speakers..."
                  value={formData.description}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ height: 1, background: 'var(--line)', margin: 'var(--space-2) 0' }} />

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
