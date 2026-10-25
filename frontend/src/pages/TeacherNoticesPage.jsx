import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NameWithVerification from '../components/NameWithVerification';
import { useAuth } from '../context/AuthContext';
import { createNotice, getMyNotices, getReceivedNotices } from '../services/noticeService';
import { Megaphone } from 'lucide-react';

const AUDIENCES = [
  { value: 'all_students',       label: 'All Students' },
  { value: 'all_teachers',       label: 'All Teachers' },
  { value: 'specific_community', label: 'Specific Community' },
  { value: 'specific_event',     label: 'Specific Event' },
];

function NoticeCard({ notice, isOwn }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card" style={{
      padding: 'var(--space-4)',
      border: '1.5px solid var(--ink)',
      borderLeft: '4px solid #2563EB',
      transition: 'box-shadow 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: '#2563EB18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', flexShrink: 0 }}>
          <Megaphone size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>{notice.title}</span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px',
              background: '#2563EB', color: '#fff', borderRadius: 'var(--radius-pill)',
              letterSpacing: '0.05em', textTransform: 'uppercase'
            }}>IMPORTANT</span>
          </div>
          <p style={{
            fontSize: '0.87rem', color: 'var(--ink-soft)', margin: '0 0 8px',
            ...(expanded ? {} : { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' })
          }}>
            {notice.description}
          </p>
          {notice.description.length > 120 && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.75rem', padding: '2px 6px', height: 'auto' }}
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
          <div style={{ display: 'flex', gap: 14, fontSize: '0.75rem', color: 'var(--ink-faint)', marginTop: 6 }}>
            {isOwn ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                {notice.recipient_count} recipients
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                From: <strong>
                  <NameWithVerification
                    user={{ name: notice.teacher_name, role: 'faculty', is_verified: notice.teacher_verified }}
                    badgeSize={13}
                  />
                </strong>
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              {notice.target_audience.replace(/_/g, ' ')}
            </span>
            <span>{new Date(notice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherNoticesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFaculty = user?.role === 'faculty';
  const isFacultyVerified = isFaculty && user?.is_verified;

  const [tab, setTab] = useState(isFaculty ? 'my' : 'received');
  const [myNotices, setMyNotices]         = useState([]);
  const [receivedNotices, setReceived]    = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [formError, setFormError]         = useState('');
  const [success, setSuccess]             = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    target_audience: 'all_students',
    reference_id: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      if (isFacultyVerified) {
        const res = await getMyNotices();
        setMyNotices(res.data || []);
      }
      const recv = await getReceivedNotices();
      setReceived(recv.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const needsRef = ['specific_community', 'specific_event'].includes(form.target_audience);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim() || !form.description.trim()) {
      setFormError('Title and description are required.');
      return;
    }
    if (needsRef && !form.reference_id) {
      setFormError('Please enter the Community or Event ID.');
      return;
    }
    setSubmitting(true);
    try {
      await createNotice({
        title:           form.title.trim(),
        description:     form.description.trim(),
        target_audience: form.target_audience,
        reference_id:    form.reference_id ? parseInt(form.reference_id) : null,
      });
      setSuccess('Notice published successfully!');
      setShowForm(false);
      setForm({ title: '', description: '', target_audience: 'all_students', reference_id: '' });
      await load();
    } catch (err) {
      setFormError(err.response?.data?.detail?.message || 'Failed to create notice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar active="teacher-notices" />
      <main className="main-content" style={{ padding: 'var(--space-6) var(--space-5)', maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-5)' }}>
          <div>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '2rem', fontWeight: 800, margin: 0 }}>Official Notices</h1>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginTop: 4 }}>Publish and manage official communications to students and staff.</p>
          </div>
          {isFacultyVerified && (
            <button
              className="btn btn-primary"
              onClick={() => { setShowForm(s => !s); setFormError(''); setSuccess(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
            >
              <span style={{ fontSize: '1.1rem' }}>{showForm ? '✕' : '+'}</span>
              {showForm ? 'Cancel' : 'New Notice'}
            </button>
          )}
          {isFaculty && !isFacultyVerified && (
            <div style={{
              fontSize: '0.8rem', color: '#92400e', background: '#fef3c7',
              border: '1px solid #fbbf24', borderRadius: 'var(--radius-sm)',
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg> Account pending approval — notices disabled.
            </div>
          )}
        </div>

        {/* Success banner */}
        {success && (
          <div style={{ padding: '12px 16px', background: '#d1fae5', border: '1.5px solid #10b981', borderRadius: 'var(--radius-md)', color: '#065f46', marginBottom: 'var(--space-4)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Create Form */}
        {showForm && isFacultyVerified && (
          <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)', border: '2px solid #2563EB' }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-4)', color: '#2563EB', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Megaphone size={18} />
              Create Official Notice
            </h2>
            {formError && <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Notice Title *</label>
                <input
                  className="input"
                  placeholder="e.g. Exam Schedule Update"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  className="input"
                  rows={5}
                  placeholder="Write the full notice content here..."
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Audience *</label>
                <select
                  className="input"
                  value={form.target_audience}
                  onChange={e => setForm(p => ({ ...p, target_audience: e.target.value, reference_id: '' }))}
                >
                  {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              {needsRef && (
                <div className="form-group">
                  <label className="form-label">
                    {form.target_audience === 'specific_community' ? 'Community ID' : 'Event ID'} *
                  </label>
                  <input
                    className="input"
                    type="number"
                    placeholder="Enter numeric ID"
                    value={form.reference_id}
                    onChange={e => setForm(p => ({ ...p, reference_id: e.target.value }))}
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Megaphone size={14} />
                      Publish Notice
                    </span>
                  )}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        {isFaculty && (
          <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-4)', borderBottom: '1.5px solid var(--line-strong)' }}>
            {['my', 'received'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                  fontWeight: tab === t ? 700 : 400,
                  color: tab === t ? '#2563EB' : 'var(--ink-soft)',
                  borderBottom: tab === t ? '2.5px solid #2563EB' : '2.5px solid transparent',
                  fontSize: '0.9rem', transition: 'color 0.15s',
                }}
              >
                {t === 'my' ? `My Notices (${myNotices.length})` : `Received (${receivedNotices.length})`}
              </button>
            ))}
          </div>
        )}

        {/* Notice List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
            <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto 12px' }} />
            <p className="eyebrow">Loading notices</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {(isFaculty ? (tab === 'my' ? myNotices : receivedNotices) : receivedNotices).length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--ink-faint)' }}>
                <div style={{ display: 'block', marginBottom: '8px' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                  </svg>
                </div>
                <p>No notices yet.</p>
              </div>
            ) : (
              (isFaculty ? (tab === 'my' ? myNotices : receivedNotices) : receivedNotices)
                .map(n => <NoticeCard key={n.notice_id} notice={n} isOwn={tab === 'my' && isFaculty} />)
            )}
          </div>
        )}
      </main>
    </div>
  );
}
