import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import NameWithVerification from './NameWithVerification';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    acceptConnectionRequest,
    rejectConnectionRequest
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleNotificationClick = async (notif) => {
    // Mark as read automatically if unread
    if (!notif.is_read) {
      await markAsRead(notif.notification_id);
    }
    setIsOpen(false);

    // Redirect based on reference type and notification type
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

  const timeAgo = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 8, borderRadius: '50%', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-soft)', transition: 'background 150ms ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-light)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: 'var(--coral)', color: '#fff',
            fontSize: '10px', fontWeight: 'bold', minWidth: 16, height: 16,
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', border: '1.5px solid var(--paper-raised)',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed', top: 52, right: 16,
          width: 'min(360px, calc(100vw - 32px))',
          background: '#fff', border: '1.5px solid var(--ink)',
          borderRadius: 'var(--radius-md)', boxShadow: '4px 4px 0 var(--ink)',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          maxHeight: 400, animation: 'star-pop 180ms ease'
        }}>
          {/* Header */}
          <div style={{
            padding: '10px var(--space-2)', borderBottom: '1.5px solid var(--line)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', fontFamily: 'JetBrains Mono, monospace' }}>
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: '0.85rem' }}>
                No notifications yet.
              </div>
            ) : (
              [...notifications]
                .sort((a, b) => {
                  const aIsConn = a.notification_type === 'connection_request';
                  const bIsConn = b.notification_type === 'connection_request';
                  if (aIsConn && !bIsConn) return -1;
                  if (!aIsConn && bIsConn) return 1;
                  return new Date(b.created_at) - new Date(a.created_at);
                })
                .slice(0, 5)
                .map((n) => {
                  if (n.notification_type === 'connection_request') {
                    return (
                      <div
                        key={n.notification_id}
                        style={{
                          padding: '12px var(--space-2)',
                          borderBottom: '1px solid var(--line)',
                          background: n.is_read ? 'transparent' : 'var(--quad-tint)',
                          display: 'flex',
                          gap: 12,
                          transition: 'background 150ms ease'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Avatar */}
                        <div
                          onClick={() => {
                            setIsOpen(false);
                            if (n.sender_id) navigate(`/profile/${n.sender_id}`);
                          }}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            backgroundColor: 'var(--quad-tint)',
                            color: 'var(--quad)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            flexShrink: 0,
                            cursor: 'pointer',
                            overflow: 'hidden'
                          }}
                        >
                          {n.sender_picture ? (
                            <img
                              src={n.sender_picture}
                              alt={n.sender_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            initials(n.sender_name || 'User')
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            onClick={() => {
                              setIsOpen(false);
                              if (n.sender_id) navigate(`/profile/${n.sender_id}`);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <h4 style={{
                              margin: 0,
                              fontFamily: 'Fraunces, serif',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: 'var(--ink)'
                            }}>
                              <NameWithVerification
                                user={{ name: n.sender_name || 'Someone', role: n.sender_role, is_verified: n.sender_verified }}
                                badgeSize={12}
                              />
                            </h4>
                            <p style={{
                              margin: '2px 0 4px',
                              fontSize: '0.7rem',
                              color: 'var(--ink-soft)',
                              textTransform: 'capitalize'
                            }}>
                              {n.sender_role || 'Student'}
                              {n.sender_department ? ` • ${n.sender_department}` : ''}
                            </p>
                          </div>
                          
                          <p style={{
                            margin: '4px 0 8px',
                            fontSize: '0.78rem',
                            color: 'var(--ink-soft)',
                            lineHeight: 1.3
                          }}>
                            wants to connect with you.
                          </p>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Notification Accept clicked: reference_id:', n.reference_id, 'notification_id:', n.notification_id);
                                try {
                                  await acceptConnectionRequest(n.reference_id, n.notification_id);
                                  console.log('Notification Accept success!');
                                } catch (err) {
                                  console.error('Notification Accept failed:', err);
                                  alert(err.message || 'Failed to accept request.');
                                }
                              }}
                              className="btn btn-accent btn-sm"
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                fontWeight: 600,
                                height: 'auto',
                                minHeight: 0
                              }}
                            >
                              Accept
                            </button>
                            <button
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Notification Ignore clicked: reference_id:', n.reference_id, 'notification_id:', n.notification_id);
                                try {
                                  await rejectConnectionRequest(n.reference_id, n.notification_id);
                                  console.log('Notification Ignore success!');
                                } catch (err) {
                                  console.error('Notification Ignore failed:', err);
                                  alert(err.message || 'Failed to ignore request.');
                                }
                              }}
                              className="btn btn-outline btn-sm"
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                fontWeight: 600,
                                color: 'var(--coral)',
                                borderColor: 'var(--coral-light)',
                                height: 'auto',
                                minHeight: 0
                              }}
                            >
                              Ignore
                            </button>
                          </div>

                          <span style={{
                            display: 'block',
                            marginTop: 8,
                            fontSize: '0.65rem',
                            color: 'var(--ink-faint)',
                            fontFamily: 'JetBrains Mono, monospace'
                          }}>
                            {timeAgo(n.created_at)}
                          </span>
                        </div>

                        {/* Delete cross */}
                        <button
                          onClick={() => deleteNotification(n.notification_id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--coral)',
                            cursor: 'pointer',
                            alignSelf: 'flex-start',
                            padding: 2,
                            fontSize: '16px',
                            lineHeight: 1,
                            fontWeight: 'bold'
                          }}
                          title="Delete"
                        >
                          &times;
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={n.notification_id}
                      style={{
                        padding: '10px var(--space-2)', borderBottom: '1px solid var(--line)',
                        background: n.is_read ? 'transparent' : 'var(--quad-tint)',
                        display: 'flex', gap: 10, cursor: 'pointer', position: 'relative',
                        transition: 'background 150ms ease'
                      }}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '0.8rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.title || 'Notification'}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--ink-faint)', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        
                        <p style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', lineHeight: 1.4, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {n.message}
                        </p>
                      </div>

                      {/* Actions */}
                      <div
                        style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!n.is_read && (
                          <button
                            onClick={() => markAsRead(n.notification_id)}
                            style={{
                              background: 'none', border: 'none', color: 'var(--quad)',
                              cursor: 'pointer', padding: 2, fontSize: '11px', fontWeight: 'bold'
                            }}
                            title="Mark read"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(n.notification_id)}
                          style={{
                            background: 'none', border: 'none', color: 'var(--coral)',
                            cursor: 'pointer', padding: 2, fontSize: '11px', fontWeight: 'bold'
                          }}
                          title="Delete"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1.5px solid var(--line)', padding: 8, textAlign: 'center', background: 'var(--bg-light)' }}>
            <button
              onClick={() => { setIsOpen(false); navigate('/notifications'); }}
              style={{
                background: 'none', border: 'none', color: 'var(--quad)',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
