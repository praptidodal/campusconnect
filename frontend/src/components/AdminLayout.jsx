import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

const ADMIN_NAV_ITEMS = [
  { label: 'Admin Dashboard', key: 'dashboard', path: '/admin' },
  { label: 'Users Management', key: 'users', path: '/admin/users' },
  { label: 'Content Moderation', key: 'content', path: '/admin/posts' },
  { label: 'Reports Queue', key: 'reports', path: '/admin/reports' },
  { label: 'Approvals', key: 'approvals', path: '/admin/approvals' },
  { label: 'Audit Logs', key: 'logs', path: '/admin/logs' },
  { label: 'Analytics Panel', key: 'analytics', path: '/admin/analytics' },
];

export default function AdminLayout({ children, activeTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Enforce frontend protection: redirect non-admin users immediately
  React.useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="app-shell" style={{ gridTemplateColumns: '260px 1fr' }}>
      {/* Admin Sidebar */}
      <aside className="sidebar" style={{ background: '#1c1b19', borderRight: '2px solid #1c1b19', color: '#fbf8f2' }}>
        {/* Header */}
        <div className="sidebar-brand" style={{ borderBottom: '1.5px solid #2f2e2a', padding: 'var(--space-3) var(--space-2)' }}>
          <div className="sidebar-brand-name" style={{ color: 'var(--marigold)', fontSize: '1.3rem' }}>CampusConnect</div>
          <div className="sidebar-brand-sub" style={{ color: 'var(--ink-faint)', fontSize: '0.65rem' }}>Control Panel</div>
        </div>

        {/* Admin user info */}
        <div className="sidebar-user" style={{ borderBottom: '1.5px solid #2f2e2a', padding: 'var(--space-2)' }}>
          <div className="avatar" style={{ background: 'var(--coral)', color: '#fff', border: '1.5px solid var(--marigold)' }}>
            {initials(user?.name)}
          </div>
          <div style={{ minWidth: 0, marginLeft: '8px' }}>
            <div className="sidebar-user-name" style={{ color: '#fff' }}>{user?.name}</div>
            <div className="sidebar-user-role" style={{ color: 'var(--coral)', fontFamily: 'JetBrains Mono', fontSize: '0.6rem' }}>
              System Admin
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="sidebar-nav" style={{ padding: 'var(--space-2) 0' }}>
          <div className="sidebar-section-label" style={{ color: '#7a766c', fontSize: '0.6rem', padding: '0 var(--space-2) 6px' }}>
            Management
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  style={{
                    color: isActive ? 'var(--ink)' : '#c8c5bc',
                    background: isActive ? 'var(--marigold)' : 'transparent',
                    margin: '0 var(--space-2)',
                    width: 'calc(100% - 24px)',
                    fontWeight: isActive ? '700' : '500',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px var(--space-2)',
                    transition: 'all 0.15s ease',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="sidebar-section-label" style={{ color: '#7a766c', fontSize: '0.6rem', padding: 'var(--space-3) var(--space-2) 6px' }}>
            Links
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="nav-item"
            style={{
              color: '#c8c5bc',
              margin: '0 var(--space-2)',
              width: 'calc(100% - 24px)',
              padding: '10px var(--space-2)',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Back to Campus
          </button>
        </nav>

        {/* Footer sign out */}
        <div className="sidebar-footer" style={{ borderTop: '1.5px solid #2f2e2a' }}>
          <button
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="btn btn-sm btn-danger btn-full"
            style={{ border: '1.5px solid var(--coral)', color: 'var(--coral)' }}
          >
            Exit Dashboard
          </button>
        </div>
      </aside>

      {/* Admin Content Area */}
      <main className="app-main" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        {/* Header toolbar */}
        <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid var(--ink)', background: 'var(--paper-raised)', padding: 'var(--space-2) var(--space-3)' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'var(--marigold)', border: '1.5px solid var(--ink)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontFamily: 'JetBrains Mono', color: 'var(--ink)' }}>
                ADMIN
              </span>
              CampusConnect Control Panel
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
              Logged in as: <strong style={{ color: 'var(--ink)' }}>{user?.name}</strong>
            </span>
          </div>
        </header>

        {/* Sub-page */}
        <div style={{ padding: 'var(--space-3)', flex: 1, background: 'var(--paper)' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
