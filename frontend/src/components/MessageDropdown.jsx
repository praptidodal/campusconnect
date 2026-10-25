import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConversations, markConversationAsRead } from '../services/chatService';

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function MessageDropdown() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [dmConvs, setDmConvs] = useState([]);
  const [unreadDMsCount, setUnreadDMsCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchDMs = async () => {
    if (!currentUser) return;
    try {
      const res = await getConversations();
      // Filter only direct conversations
      const directChats = (res.data || []).filter((c) => c.conversation_type === 'direct');
      setDmConvs(directChats);
      // Count DMs that have at least one unread message
      const count = directChats.filter((c) => c.unread_count > 0).length;
      setUnreadDMsCount(count);
    } catch (err) {
      console.error('Failed to fetch DMs for dropdown', err);
    }
  };

  useEffect(() => {
    fetchDMs();
    const interval = setInterval(fetchDMs, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

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

  const handleDMClick = async (conv) => {
    setIsOpen(false);
    if (conv.unread_count > 0) {
      try {
        await markConversationAsRead(conv.conversation_id);
        fetchDMs();
      } catch (err) {
        console.error(err);
      }
    }
    navigate(`/messages?conversation_id=${conv.conversation_id}`);
  };

  // Resolve chat visual label based on type
  const getDMTitle = (conv) => {
    const other = conv.participants.find((p) => p.user_id !== currentUser?.user_id) || {};
    return {
      title: other.name || 'Direct Chat',
      avatar: other.profile_picture,
      avatarText: initials(other.name),
    };
  };

  return (
    <div className="message-dropdown-container" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Cute Message Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          borderRadius: '50%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-soft)',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-light)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        title="Direct Messages"
      >
        {/* Cute message icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        {/* Unseen DMs Count Badge */}
        {unreadDMsCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              background: 'var(--coral)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 'bold',
              minWidth: 16,
              height: 16,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '1.5px solid var(--paper-raised)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {unreadDMsCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            left: 'auto',
            marginTop: 8,
            width: 300,
            background: '#fff',
            border: '1.5px solid var(--ink)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '4px 4px 0 var(--ink)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 380,
            animation: 'star-pop 180ms ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '10px var(--space-2)',
              borderBottom: '1.5px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--paper)',
            }}
          >
            <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>
              Direct Messages
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/messages');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--quad)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Open Inbox
            </button>
          </div>

          {/* List of active DMs */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {dmConvs.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: '0.85rem' }}>
                No direct messages yet.
              </div>
            ) : (
              dmConvs.map((c) => {
                const details = getDMTitle(c);
                const isUnread = c.unread_count > 0;
                
                return (
                  <div
                    key={c.conversation_id}
                    onClick={() => handleDMClick(c)}
                    style={{
                      padding: '10px var(--space-2)',
                      borderBottom: '1px solid var(--line)',
                      background: isUnread ? 'var(--quad-tint)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'pointer',
                      transition: 'background 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isUnread) e.currentTarget.style.background = 'var(--paper)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isUnread) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Profile Initials/Avatar in front */}
                    {details.avatar ? (
                      <img
                        src={details.avatar}
                        alt={details.title}
                        className="avatar"
                        style={{ width: 32, height: 32, objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {details.avatarText}
                      </div>
                    )}

                    {/* Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.85rem',
                        fontWeight: isUnread ? 700 : 500,
                        color: 'var(--ink)',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {details.title}
                      </p>
                      {c.latest_message && (
                        <p style={{
                          fontSize: '0.75rem',
                          color: 'var(--ink-soft)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {c.latest_message.message_text || 'Attachment'}
                        </p>
                      )}
                    </div>

                    {/* Unread count in front of the name/profile */}
                    {isUnread && (
                      <span
                        className="role-badge role-club"
                        style={{
                          background: 'var(--coral)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          minWidth: 18,
                          height: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          padding: '0 4px',
                          flexShrink: 0,
                        }}
                      >
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
