import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useNotifications } from '../context/NotificationContext';
import { getNotifications } from '../services/notificationService';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { markAsRead, deleteNotification, markAllAsRead, refreshNotifications } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, unread, read
  
  // Pagination state
  const [page, setPage] = useState(0);
  const LIMIT = 15;
  const [hasMore, setHasMore] = useState(true);

  const loadNotifications = async (currentPage, filter) => {
    setLoading(true);
    try {
      const skip = currentPage * LIMIT;
      // Get paginated notifications
      const res = await getNotifications({ skip, limit: LIMIT });
      const data = res.data || [];
      
      if (currentPage === 0) {
        setNotifications(data);
      } else {
        setNotifications((prev) => [...prev, ...data]);
      }

      setHasMore(data.length === LIMIT);
      setError('');
    } catch (err) {
      setError('Failed to retrieve notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(page, filterType);
  }, [page]);

  // Reset page when filterType changes, reload from page 0
  const handleFilterChange = (type) => {
    setFilterType(type);
    setPage(0);
    loadNotifications(0, type);
  };

  const handleMarkRead = async (notifId) => {
    await markAsRead(notifId);
    // Update local state is_read
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === notifId ? { ...n, is_read: true } : n))
    );
    refreshNotifications();
  };

  const handleDelete = async (notifId) => {
    await deleteNotification(notifId);
    setNotifications((prev) => prev.filter((n) => n.notification_id !== notifId));
    refreshNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    refreshNotifications();
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await handleMarkRead(notif.notification_id);
    }
    
    const refId = notif.reference_id;
    const refType = notif.reference_type;
    const type = notif.notification_type;

    if (!refId) return;

    if (refType === 'post') {
      navigate('/dashboard');
    } else if (refType === 'community') {
      navigate(`/communities/${refId}`);
    } else if (refType === 'event') {
      navigate(`/events/${refId}`);
    } else if (refType === 'collaboration') {
      if (type === 'application_received') {
        navigate(`/collaborations/${refId}/applications`);
      } else {
        navigate(`/collaborations/${refId}`);
      }
    } else if (refType === 'application') {
      if (type === 'application_received') {
        navigate(`/collaborations/${refId}/applications`);
      } else {
        navigate('/collaborations/applications/my');
      }
    } else if (refType === 'user') {
      navigate(`/profile/${refId}`);
    }
  };

  // Local filtering based on search query and tab type
  const filteredNotifications = notifications.filter((n) => {
    // 1. Filter by unread/read state
    if (filterType === 'unread' && n.is_read) return false;
    if (filterType === 'read' && !n.is_read) return false;

    // 2. Filter by search text (title or message)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = n.title?.toLowerCase().includes(q);
      const msgMatch = n.message?.toLowerCase().includes(q);
      return titleMatch || msgMatch;
    }

    return true;
  });

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="app-shell">
      <Sidebar active="notifications" />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)' }}>
            Notification Center
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/settings/notifications')}>
              Configure Toggles
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleMarkAllRead} disabled={notifications.every(n => n.is_read)}>
              Mark All Read
            </button>
          </div>
        </div>

        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 800 }}>
          
          {/* Filters & Search Row */}
          <div className="card" style={{ padding: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              
              {/* Tab Toggles */}
              <div style={{ display: 'flex', gap: 8 }}>
                {['all', 'unread', 'read'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleFilterChange(tab)}
                    className={`btn btn-sm ${filterType === tab ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Search Field */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-pill)', padding: '5px 16px', width: '100%', maxWidth: 280 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8, color: 'var(--ink-faint)' }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.85rem', color: 'var(--ink)', width: '100%' }}
                />
              </div>

            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* Notifications Card List */}
          {filteredNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-2)' }}>
                  <div className="spinner spinner-ink" style={{ width: 24, height: 24, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
                  <p className="eyebrow">Fetching...</p>
                </div>
              ) : (
                <p style={{ color: 'var(--ink-soft)' }}>No notifications match your filters.</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(() => {
                const sorted = [...filteredNotifications].sort((a, b) => {
                  const aOfficial = a.notification_type === 'warning_issued' && !a.is_read;
                  const bOfficial = b.notification_type === 'warning_issued' && !b.is_read;
                  if (aOfficial && !bOfficial) return -1;
                  if (!aOfficial && bOfficial) return 1;
                  return 0;
                });
                return sorted.map((n) => {
                  const isOfficial = n.notification_type === 'warning_issued';
                  return (
                    <div
                      key={n.notification_id}
                      className={`card fade-in`}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: n.is_read ? '#fff' : (isOfficial ? '#fff5f5' : 'var(--quad-tint)'),
                        borderColor: isOfficial ? '#dc2626' : (n.is_read ? 'var(--line)' : 'var(--quad)'),
                        borderWidth: isOfficial ? '2px' : '1.5px',
                        padding: 'var(--space-2) var(--space-3)',
                        transition: 'transform 150ms ease, border-color 150ms ease',
                        boxShadow: isOfficial && !n.is_read ? '0 0 8px rgba(220, 38, 38, 0.15)' : 'none',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => handleNotificationClick(n)}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className={`role-badge ${
                            isOfficial ? 'role-admin' : (n.notification_type.includes('accept') ? 'role-club' : n.notification_type.includes('reject') ? 'role-admin' : 'role-student')
                          }`} style={{
                            fontSize: '0.55rem',
                            background: isOfficial ? '#dc2626' : '',
                            color: isOfficial ? '#fff' : '',
                            borderColor: isOfficial ? '#dc2626' : ''
                          }}>
                            {isOfficial ? 'IMPORTANT NOTICE' : n.notification_type.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: '0.725rem', color: 'var(--ink-faint)', fontFamily: 'JetBrains Mono, monospace' }}>
                            {formatDate(n.created_at)}
                          </span>
                        </div>

                        <h4 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.1rem', fontWeight: n.is_read ? 600 : 700, color: 'var(--ink)', marginTop: 4, marginBottom: 2 }}>
                          {n.title}
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                          {n.message}
                        </p>
                      </div>

                      {/* Actions Column */}
                      <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                        {!n.is_read && (
                          <button
                            onClick={() => handleMarkRead(n.notification_id)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.725rem' }}
                          >
                            Read
                          </button>
                        )}
                        {/* Hide delete button for official admin warning notifications */}
                        {!isOfficial && (
                          <button
                            onClick={() => handleDelete(n.notification_id)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--coral)', padding: '4px 10px', fontSize: '0.725rem' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Load More Button */}
              {hasMore && (
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                  className="btn btn-outline btn-full"
                  style={{ marginTop: 8 }}
                >
                  {loading ? 'Loading...' : 'Load More Notifications'}
                </button>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
