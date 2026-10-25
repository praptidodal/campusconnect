import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NameWithVerification from '../components/NameWithVerification';
import { useAuth } from '../context/AuthContext';
import { getTeacherDirectory } from '../services/noticeService';
import { createOrGetConversation } from '../services/chatService';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function TeacherCard({ teacher }) {
  const navigate = useNavigate();
  const [messaging, setMessaging] = useState(false);

  const handleMessage = async () => {
    setMessaging(true);
    try {
      const res = await createOrGetConversation({
        conversation_type: 'direct',
        recipient_id: teacher.user_id,
        from_faculty_directory: true
      });
      const convId = res.data?.conversation_id;
      navigate(`/messages?conv=${convId}`);
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Could not start conversation.');
    } finally {
      setMessaging(false);
    }
  };

  return (
    <div className="card" style={{
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      transition: 'box-shadow 0.15s, transform 0.15s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Avatar + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {teacher.profile_picture ? (
          <img src={teacher.profile_picture} alt={teacher.name} className="avatar" style={{ width: 52, height: 52, flexShrink: 0, objectFit: 'cover' }} />
        ) : (
          <div className="avatar" style={{ width: 52, height: 52, fontSize: '1.1rem', fontWeight: 700, flexShrink: 0 }}>{initials(teacher.name)}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NameWithVerification
              user={{ ...teacher, role: 'faculty' }}
              nameStyle={{ fontWeight: 700, fontSize: '0.97rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              badgeSize={15}
            />
          </div>
          {teacher.designation && (
            <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginTop: 2 }}>{teacher.designation}</div>
          )}
          {teacher.department && (
            <div style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 600, marginTop: 2 }}>{teacher.department}</div>
          )}
        </div>
      </div>

      {/* Details */}
      {(teacher.office_hours || teacher.office_location || teacher.bio) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem', color: 'var(--ink-soft)', borderTop: '1px solid var(--line)', paddingTop: 'var(--space-2)' }}>
          {teacher.office_location && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {teacher.office_location}
            </span>
          )}
          {teacher.office_hours && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {teacher.office_hours}
            </span>
          )}
          {teacher.bio && (
            <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {teacher.bio}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'auto' }}>
        <button
          className="btn btn-outline btn-sm"
          style={{ flex: 1 }}
          onClick={() => navigate(`/profile/${teacher.user_id}`)}
        >
          View Profile
        </button>
        <button
          className="btn btn-primary btn-sm"
          style={{ flex: 1 }}
          onClick={handleMessage}
          disabled={messaging}
        >
          {messaging ? '...' : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Message
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export default function TeacherDirectoryPage() {
  const [teachers, setTeachers]   = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    getTeacherDirectory()
      .then(res => { setTeachers(res.data || []); setFiltered(res.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = teachers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.department || '').toLowerCase().includes(q) ||
        (t.designation || '').toLowerCase().includes(q)
      );
    }
    if (deptFilter) {
      list = list.filter(t => t.department === deptFilter);
    }
    setFiltered(list);
  }, [search, deptFilter, teachers]);

  const departments = [...new Set(teachers.map(t => t.department).filter(Boolean))].sort();

  return (
    <div className="app-shell">
      <Sidebar active="teacher-directory" />
      <main className="main-content" style={{ padding: 'var(--space-6) var(--space-5)' }}>

        {/* Header */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '2rem', fontWeight: 800, margin: '0 0 4px' }}>Faculty Directory</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', margin: 0 }}>
            Browse and connect with {teachers.length} verified faculty members.
          </p>
        </div>

        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-pill)', padding: '7px 14px', flex: '1 1 200px', maxWidth: 380 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8, color: 'var(--ink-faint)' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, department, designation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.87rem', color: 'var(--ink)', width: '100%' }}
            />
          </div>
          {departments.length > 0 && (
            <select
              className="input"
              style={{ flex: '0 0 auto', width: 200, borderRadius: 'var(--radius-pill)', padding: '7px 14px' }}
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--ink-faint)' }}>
            <div className="spinner spinner-ink" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto 16px' }} />
            <p className="eyebrow">Loading teachers</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--ink-faint)' }}>
            <div style={{ display: 'block', marginBottom: '8px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" style={{ margin: '0 auto' }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p>{search || deptFilter ? 'No teachers match your filters.' : 'No verified teachers found.'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            {filtered.map(t => <TeacherCard key={t.user_id} teacher={t} />)}
          </div>
        )}
      </main>
    </div>
  );
}
