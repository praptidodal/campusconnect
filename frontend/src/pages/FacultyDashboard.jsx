import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NameWithVerification from '../components/NameWithVerification';
import { useAuth } from '../context/AuthContext';
import { getMyNotices } from '../services/noticeService';
import { Megaphone } from 'lucide-react';

function StatCard({ label, value, icon, color = 'var(--quad-deep)' }) {
  return (
    <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: '1 1 160px', minWidth: 140 }}>
      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'Fraunces, serif', color }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'faculty') {
      navigate('/dashboard');
      return;
    }
    getMyNotices()
      .then(res => setNotices(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const totalRecipients = notices.reduce((sum, n) => sum + (n.recipient_count || 0), 0);

  return (
    <div className="app-shell">
      <Sidebar active="teacher" />
      <main className="main-content" style={{ padding: 'var(--space-6) var(--space-5)' }}>

        {/* Header */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '2rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
              Faculty Dashboard
            </h1>
          </div>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.95rem', margin: 0 }}>
            Welcome back, <NameWithVerification user={user} badgeSize={14} />. Manage your notices and explore the campus.
          </p>
          {!user?.is_verified && (
            <div style={{
              marginTop: 'var(--space-3)',
              padding: '12px 16px',
              background: 'var(--marigold-tint, #fffbeb)',
              border: '1.5px solid var(--marigold, #f59e0b)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--marigold, #f59e0b)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--ink)' }}>
                <strong>Account pending approval.</strong> Your teacher account is awaiting admin verification. Some features may be restricted until approved.
              </span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
          <StatCard
            label="Notices Sent"
            value={notices.length}
            icon={<Megaphone size={20} color="#2563EB" />}
            color="#2563EB"
          />
          <StatCard
            label="Students Reached"
            value={totalRecipients}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            color="#059669"
          />
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-3)' }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/teacher/notices')}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Megaphone size={14} />
              Create Notice
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigate('/teacher/directory')}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
              </svg>
              Faculty Directory
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigate('/teacher/students')}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Student Directory
            </button>
          </div>
        </div>

        {/* Recent Notices */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Recent Notices</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/teacher/notices')}>View All →</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
              <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto 12px' }} />
              <p className="eyebrow">Loading notices</p>
            </div>
          ) : notices.length === 0 ? (
            <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--ink-faint)' }}>
              <div style={{ display: 'block', marginBottom: '12px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                  <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
              </div>
              <p style={{ fontSize: '0.9rem', marginTop: 8 }}>No notices yet. Create your first official notice.</p>
              <button className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }} onClick={() => navigate('/teacher/notices')}>
                Create Notice
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {notices.slice(0, 5).map(notice => (
                <div key={notice.notice_id} className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)',
                    background: '#2563EB18', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#2563EB', flexShrink: 0
                  }}>
                    <Megaphone size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>{notice.title}</span>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px',
                        background: '#2563EB', color: '#fff', borderRadius: 'var(--radius-pill)',
                        letterSpacing: '0.04em', textTransform: 'uppercase'
                      }}>NOTICE</span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {notice.description}
                    </p>
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--ink-faint)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        {notice.recipient_count} recipients
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="6" />
                          <circle cx="12" cy="12" r="2" />
                        </svg>
                        {notice.target_audience.replace(/_/g, ' ')}
                      </span>
                      <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                    </div>
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
