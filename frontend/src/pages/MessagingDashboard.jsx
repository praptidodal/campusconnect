import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import NameWithVerification from '../components/NameWithVerification';
import {
  getConversations,
  getConversationMessages,
  markConversationAsRead,
  sendMessage,
  deleteMessage,
  undoDeleteMessage,
  searchMessages,
  createOrGetConversation
} from '../services/chatService';
import { useConnections } from '../hooks/useConnections';
import CreateGroupModal from '../components/CreateGroupModal';

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessagingDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  // URL query params
  const queryParams = new URLSearchParams(location.search);
  const initialConversationId = queryParams.get('conversation_id');

  // Core state
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(
    initialConversationId ? parseInt(initialConversationId) : null
  );
  const [messages, setMessages] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [recipientId, setRecipientId] = useState(null);
  // Ticker to force countdown re-render every second
  const [tick, setTick] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const activeConversationIdRef = useRef(activeConversationId);

  // Keep ref in sync for WebSockets callback
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Tick every second to re-render countdown timers on deleted messages
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial conversations list
  const loadConversations = async (selectFirst = false) => {
    try {
      const res = await getConversations();
      setConversations(res.data || []);
      if (selectFirst && res.data && res.data.length > 0 && !activeConversationId) {
        setActiveConversationId(res.data[0].conversation_id);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoadingConvs(false);
    }
  };

  useEffect(() => {
    loadConversations(true);
  }, []);

  // Sync active conversation if URL query param changes
  useEffect(() => {
    if (initialConversationId) {
      const parsedId = parseInt(initialConversationId);
      if (parsedId !== activeConversationId) {
        setActiveConversationId(parsedId);
      }
    }
  }, [initialConversationId]);

  // Sync recipientId for DMs
  useEffect(() => {
    if (!activeConversationId || conversations.length === 0) {
      setRecipientId(null);
      return;
    }
    const activeConv = conversations.find((c) => c.conversation_id === activeConversationId);
    if (activeConv && activeConv.conversation_type === 'direct') {
      const other = activeConv.participants.find((p) => p.user_id !== currentUser?.user_id);
      setRecipientId(other ? other.user_id : null);
    } else {
      setRecipientId(null);
    }
  }, [activeConversationId, conversations, currentUser]);

  const { status: connectionStatus } = useConnections(recipientId);
  const isConnected = !recipientId ||
    currentUser?.role === 'faculty' ||
    currentUser?.role === 'admin' ||
    connectionStatus === 'connected';

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await getConversationMessages(activeConversationId, { limit: 50, offset: 0 });
        setMessages(res.data || []);
        // Mark conversation as read
        await markConversationAsRead(activeConversationId);
        // Refresh conversations list to update unread badge in sidebar
        loadConversations();
      } catch (err) {
        console.error('Failed to load messages', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
    connectWebSocket(activeConversationId);

    return () => {
      disconnectWebSocket();
    };
  }, [activeConversationId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket Connection Management
  const connectWebSocket = (convId) => {
    disconnectWebSocket();

    const token = localStorage.getItem('cc_token');
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL || '';
    const host = apiUrl ? new URL(apiUrl).host : window.location.host;
    const protocol = (apiUrl ? new URL(apiUrl).protocol : window.location.protocol) === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}/ws/chat/${convId}?token=${token}`;

    console.log(`Connecting to WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`WebSocket connected for conversation: ${convId}`);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('[WS] Received payload:', payload);
        if (payload.type === 'message') {
          // New message: append to current conversation, deduplicate by id
          if (Number(payload.message.conversation_id) === Number(activeConversationIdRef.current)) {
            setMessages((prev) => {
              if (prev.some((m) => Number(m.message_id) === Number(payload.message.message_id))) return prev;
              const updated = [...prev, payload.message];
              updated.sort((a, b) => Number(a.message_id) - Number(b.message_id));
              return updated;
            });

            if (Number(payload.message.sender_id) !== Number(currentUser?.user_id)) {
              markConversationAsRead(activeConversationIdRef.current).then(() => {
                loadConversations();
              });
            }
          } else {
            loadConversations();
          }
        } else if (payload.type === 'message_deleted') {
          // Message soft-deleted: update in-state (don't remove), show placeholder
          console.log('[WS] Processing message_deleted for id:', payload.message?.message_id);
          setMessages((prev) =>
            prev.map((m) =>
              Number(m.message_id) === Number(payload.message.message_id)
                ? { ...m, is_deleted: true, deleted_at: payload.message.deleted_at, message_text: payload.message.message_text, attachment_path: payload.message.attachment_path }
                : m
            )
          );
          loadConversations();
        } else if (payload.type === 'message_restored') {
          // Message restored: update in-state with full data
          console.log('[WS] Processing message_restored for id:', payload.message?.message_id);
          setMessages((prev) =>
            prev.map((m) =>
              Number(m.message_id) === Number(payload.message.message_id)
                ? { ...payload.message }
                : m
            )
          );
          loadConversations();
        } else if (payload.type === 'read_all') {
          setMessages((prev) =>
            prev.map((m) => (Number(m.sender_id) === Number(payload.user_id) ? { ...m, is_read: true } : m))
          );
        } else if (payload.type === 'read') {
          setMessages((prev) =>
            prev.map((m) => (Number(m.message_id) === Number(payload.message_id) ? { ...m, is_read: true } : m))
          );
        }
      } catch (err) {
        console.error('Failed to parse websocket payload', err);
      }
    };

    ws.onclose = (event) => {
      console.log(`WebSocket closed: ${event.reason}. Status: ${event.code}`);
      // Reconnect with backoff unless component unmounted or active room changed
      if (activeConversationIdRef.current === convId && localStorage.getItem('cc_token')) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket(convId);
        }, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket connection error', err);
      ws.close();
    };
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  // Sending message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !uploadFile) return;

    const textToSend = inputText.trim();
    const fileToSend = uploadFile;

    // Reset input states immediately for smooth UX
    setInputText('');
    setUploadFile(null);
    setUploadPreview(null);

    const fd = new FormData();
    fd.append('conversation_id', activeConversationId);
    if (textToSend) {
      fd.append('message_text', textToSend);
    }
    if (fileToSend) {
      fd.append('file', fileToSend);
    }

    try {
      const res = await sendMessage(fd);
      // Append locally first (avoid duplicate handles on ws message callback)
      setMessages((prev) => {
        if (prev.some((m) => m.message_id === res.data.message_id)) return prev;
        return [...prev, res.data];
      });
      loadConversations();
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Failed to send message.');
    }
  };

  // Deleting a message — optimistically update local state immediately, then call backend.
  // The WS message_deleted broadcast keeps OTHER connected clients in sync.
  const handleDeleteMessage = async (messageId) => {
    // Optimistic update: mark as deleted right away so the sender sees the
    // placeholder immediately without waiting for the WebSocket round-trip.
    const now = new Date().toISOString();
    setMessages((prev) =>
      prev.map((m) =>
        Number(m.message_id) === Number(messageId)
          ? { ...m, is_deleted: true, deleted_at: now }
          : m
      )
    );

    try {
      await deleteMessage(messageId);
      // WebSocket message_deleted event will update other participants
    } catch (err) {
      // Revert optimistic update if the API call failed
      setMessages((prev) =>
        prev.map((m) =>
          Number(m.message_id) === Number(messageId)
            ? { ...m, is_deleted: false, deleted_at: null }
            : m
        )
      );
      console.error('Failed to delete message:', err);
      alert(err.response?.data?.detail?.message || 'Failed to delete message.');
    }
  };

  // Restoring a deleted message — optimistically update local state immediately, then call backend.
  // The WS message_restored broadcast keeps OTHER connected clients in sync.
  const handleUndoMessage = async (messageId) => {
    // Optimistic update: restore the message text/attachment right away.
    // We keep existing sender_name / created_at / etc. — only flip the deleted flag.
    setMessages((prev) =>
      prev.map((m) =>
        Number(m.message_id) === Number(messageId)
          ? { ...m, is_deleted: false, deleted_at: null }
          : m
      )
    );

    try {
      await undoDeleteMessage(messageId);
      // WebSocket message_restored event will update other participants
    } catch (err) {
      // Revert optimistic update if the API call failed
      setMessages((prev) =>
        prev.map((m) =>
          Number(m.message_id) === Number(messageId)
            ? { ...m, is_deleted: true }
            : m
        )
      );
      console.error('Failed to restore message:', err);
      alert(err.response?.data?.detail?.message || 'Failed to restore message.');
    }
  };

  // Calculate remaining undo seconds from server-provided deleted_at timestamp
  const getUndoRemaining = (deleted_at) => {
    if (!deleted_at) return 0;
    const elapsed = Math.floor((Date.now() - new Date(deleted_at).getTime()) / 1000);
    return Math.max(0, 60 - elapsed);
  };

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit.');
      return;
    }

    setUploadFile(file);

    // Show preview for image files
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadPreview(null);
    }
  };

  // Trigger search of messages
  const handleSearchMessages = async (e) => {
    if (e) e.preventDefault();
    if (!messageSearchQuery.trim()) {
      setIsSearchingMessages(false);
      setSearchResults([]);
      return;
    }

    setIsSearchingMessages(true);
    try {
      const res = await searchMessages({
        keyword: messageSearchQuery.trim(),
        conversation_id: activeConversationId,
      });
      setSearchResults(res.data || []);
    } catch (err) {
      console.error('Failed to search messages', err);
    }
  };

  // Resolve chat visual label based on type
  const getConversationDetails = (conv) => {
    if (conv.conversation_type === 'direct') {
      const other = conv.participants.find((p) => p.user_id !== currentUser?.user_id) || {};
      return {
        title: other.name || 'Direct Chat',
        avatar: other.profile_picture,
        avatarText: initials(other.name),
        eyebrow: 'Direct Message',
        indicatorColor: 'pin-sky',
      };
    } else if (conv.conversation_type === 'community') {
      return {
        title: conv.community_name || 'Community Group',
        avatar: null,
        avatarText: initials(conv.community_name),
        eyebrow: 'Community Chat',
        indicatorColor: 'pin-marigold',
      };
    } else if (conv.conversation_type === 'group') {
      const count = conv.participants?.length || 0;
      return {
        title: conv.group_name || 'Group Chat',
        avatar: conv.group_avatar,
        avatarText: initials(conv.group_name || 'Group Chat'),
        eyebrow: `Group · ${count} member${count === 1 ? '' : 's'}`,
        indicatorColor: 'pin-coral',
      };
    } else {
      return {
        title: conv.collaboration_title || 'Team Chat',
        avatar: null,
        avatarText: initials(conv.collaboration_title),
        eyebrow: 'Collaboration Team',
        indicatorColor: 'pin-quad',
      };
    }
  };

  // Filter conversations list by keyword search input in sidebar
  const filteredConversations = conversations.filter((c) => {
    const details = getConversationDetails(c);
    return details.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const activeConv = conversations.find((c) => c.conversation_id === activeConversationId);
  const activeDetails = activeConv ? getConversationDetails(activeConv) : null;

  return (
    <div className="app-shell">
      <Sidebar active="messages" />
      <main className="app-main" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0, overflow: 'hidden' }}>
        
        {/* Main Grid Wrapper */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, background: 'var(--paper)' }}>
          
          {/* Left panel: Conversations list */}
          <div style={{
            width: 320,
            borderRight: '1.5px solid var(--line-strong)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--paper-raised)',
            flexShrink: 0
          }}>
            {/* Conversations list header */}
            <div style={{ padding: 'var(--space-3) var(--space-2)', borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <h2 style={{ fontSize: '1.25rem', fontFamily: 'Fraunces, serif', fontWeight: 700, margin: 0 }}>
                  Conversations
                </h2>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setIsCreateGroupOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: '0.78rem' }}
                  title="Create a chat group with your connections"
                >
                  <span style={{ fontWeight: 'bold' }}>+</span>
                  <span>New Group</span>
                </button>
              </div>
              {/* Filter conversations input */}
              <input
                type="text"
                placeholder="Search conversations..."
                className="input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem', padding: '6px 12px' }}
              />
            </div>

            {/* Conversations list items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-1) 0' }}>
              {loadingConvs ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--ink-faint)' }}>
                  <div className="spinner spinner-ink" style={{ width: 20, height: 20, borderWidth: 2, margin: '0 auto var(--space-1)' }} />
                  <p className="eyebrow" style={{ fontSize: '0.7rem' }}>Loading chats</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--ink-faint)', fontSize: '0.85rem' }}>
                  No active conversations found.
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const details = getConversationDetails(c);
                  const isActive = c.conversation_id === activeConversationId;
                  const isUnread = c.unread_count > 0;
                  
                  return (
                    <button
                      key={c.conversation_id}
                      onClick={() => setActiveConversationId(c.conversation_id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: 'var(--space-2) var(--space-3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        border: 'none',
                        borderBottom: '1px solid var(--line)',
                        background: isActive ? 'var(--quad-tint)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--paper)'; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Avatar */}
                      {details.avatar ? (
                        <img
                          src={details.avatar}
                          alt={details.title}
                          className="avatar"
                          style={{ width: 40, height: 40, objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="avatar" style={{ width: 40, height: 40, fontSize: '0.9rem', fontWeight: 'bold' }}>
                          {details.avatarText}
                        </div>
                      )}

                      {/* Summary */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <span style={{
                            fontSize: '0.9rem',
                            fontWeight: isUnread || isActive ? 700 : 500,
                            color: 'var(--ink)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {c.conversation_type === 'direct' ? (
                              <NameWithVerification
                                user={c.participants.find((p) => p.user_id !== currentUser?.user_id)}
                                badgeSize={14}
                              />
                            ) : (
                              details.title
                            )}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--ink-faint)' }}>
                            {c.latest_message ? new Date(c.latest_message.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{
                            fontSize: '0.8rem',
                            color: isUnread ? 'var(--ink)' : 'var(--ink-soft)',
                            fontWeight: isUnread ? 600 : 400,
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            width: '85%'
                          }}>
                            {c.latest_message 
                              ? `${c.latest_message.sender_id === currentUser?.user_id ? 'You: ' : ''}${c.latest_message.message_text || 'Sent an attachment'}`
                              : 'No messages yet.'
                            }
                          </p>
                          {isUnread && (
                            <span className="role-badge role-club" style={{
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
                              flexShrink: 0
                            }}>
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Active Chat window */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--paper)', minWidth: 0 }}>
            {activeConversationId && activeDetails ? (
              <>
                {/* Chat window Header */}
                <div style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderBottom: '1.5px solid var(--line-strong)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--paper-raised)',
                  zIndex: 10
                }}>
                  <div>
                    <span className="eyebrow" style={{ color: 'var(--ink-soft)', fontSize: '0.75rem', display: 'block', marginBottom: 2 }}>
                      {activeDetails.eyebrow}
                    </span>
                    <h2 style={{ fontSize: '1.15rem', fontFamily: 'Fraunces, serif', fontWeight: 700, margin: 0 }}>
                      {activeConv?.conversation_type === 'direct' ? (
                        <NameWithVerification
                          user={activeConv.participants.find((p) => p.user_id !== currentUser?.user_id)}
                          badgeSize={16}
                        />
                      ) : (
                        activeDetails.title
                      )}
                    </h2>
                  </div>

                  {/* Message Search form in Header */}
                  <form onSubmit={handleSearchMessages} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="Find in chat..."
                      className="input"
                      value={messageSearchQuery}
                      onChange={(e) => {
                        setMessageSearchQuery(e.target.value);
                        if (!e.target.value.trim()) {
                          setIsSearchingMessages(false);
                          setSearchResults([]);
                        }
                      }}
                      style={{ fontSize: '0.8rem', padding: '4px 10px', width: 160 }}
                    />
                    <button type="submit" className="btn btn-outline btn-sm" style={{ padding: '4px 10px' }}>
                      Search
                    </button>
                  </form>
                </div>

                {/* Message display container */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3)' }}>
                  
                  {/* Search results banner if message search active */}
                  {isSearchingMessages && (
                    <div className="card" style={{ marginBottom: 'var(--space-3)', borderColor: 'var(--marigold)', background: 'var(--marigold-tint)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                        <h4 style={{ fontSize: '0.85rem', fontFamily: 'JetBrains Mono', color: 'var(--ink)' }}>
                          Search results for "{messageSearchQuery}" ({searchResults.length})
                        </h4>
                        <button
                          onClick={() => {
                            setIsSearchingMessages(false);
                            setMessageSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: 2, height: 'auto', color: 'var(--ink-soft)' }}
                        >
                          Clear
                        </button>
                      </div>
                      {searchResults.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: 0 }}>No matches found.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {searchResults.map((m) => (
                            <div
                              key={`search-${m.message_id}`}
                              style={{ padding: 6, borderBottom: '1px dashed var(--line-strong)', cursor: 'pointer' }}
                              onClick={() => {
                                // Clear search overlay and let user view original message (scroll should align on it, but we simplify by closing overlay)
                                setIsSearchingMessages(false);
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: 2 }}>
                                <strong>
                                  <NameWithVerification
                                    user={{ name: m.sender_name, role: m.sender_role, is_verified: m.sender_verified }}
                                    badgeSize={12}
                                  />
                                </strong>
                                <span>{formatDate(m.created_at)}</span>
                              </div>
                              <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--ink)' }}>{m.message_text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Standard Messages stream */}
                  {loadingMessages ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
                      <div className="spinner spinner-ink" style={{ width: 24, height: 24, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
                      <p className="eyebrow">Loading messages</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-faint)' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 'var(--space-2)' }}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <p style={{ fontSize: '0.9rem' }}>No messages yet. Send a message to start the conversation.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {messages.map((m, index) => {
                        const isSelf = m.sender_id === currentUser?.user_id;
                        const showAvatar = index === 0 || messages[index - 1].sender_id !== m.sender_id;
                        const undoRemaining = m.is_deleted ? getUndoRemaining(m.deleted_at) : 0;

                        return (
                          <div
                            key={m.message_id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 12,
                              alignSelf: isSelf ? 'flex-end' : 'flex-start',
                              maxWidth: '70%',
                            }}
                          >
                            {/* Avatar on left (if not self and first in block) */}
                            {!isSelf && (
                              <div style={{ width: 36, flexShrink: 0 }}>
                                {showAvatar && (
                                  m.sender_avatar ? (
                                    <img
                                      src={m.sender_avatar}
                                      alt={m.sender_name}
                                      className="avatar"
                                      style={{ width: 36, height: 36, objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', fontWeight: 'bold' }}>
                                      {initials(m.sender_name)}
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                            {/* Message Bubble wrapper */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>

                              {/* Sender Name + Time block */}
                              {showAvatar && (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--ink)' }}>
                                    {isSelf ? 'You' : (
                                      <NameWithVerification
                                        user={{ name: m.sender_name, role: m.sender_role, is_verified: m.sender_verified }}
                                        badgeSize={12}
                                      />
                                    )}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', fontFamily: 'JetBrains Mono' }}>
                                    {formatDate(m.created_at)}
                                  </span>
                                </div>
                              )}

                              {/* Deleted message placeholder */}
                              {m.is_deleted ? (
                                <div
                                  style={{
                                    padding: '8px 14px',
                                    background: 'var(--paper-raised)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1.5px dashed var(--line-strong)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    opacity: 0.75,
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14H6L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4h6v2" />
                                  </svg>
                                  <span style={{ fontSize: '0.82rem', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                                    This message was deleted.
                                  </span>
                                  {/* Undo button: visible only to sender, only within 60 seconds */}
                                  {isSelf && undoRemaining > 0 && (
                                    <button
                                      onClick={() => handleUndoMessage(m.message_id)}
                                      style={{
                                        background: 'var(--marigold)',
                                        border: '1.5px solid var(--ink)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--ink)',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        fontFamily: 'JetBrains Mono, monospace',
                                      }}
                                    >
                                      Undo ({undoRemaining})
                                    </button>
                                  )}
                                </div>
                              ) : (
                                /* Normal message bubble */
                                <div
                                  className="pin-card"
                                  style={{
                                    padding: '10px 14px',
                                    background: isSelf ? 'var(--quad-tint)' : 'var(--paper-raised)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1.5px solid var(--ink)',
                                    boxShadow: 'none',
                                    position: 'relative',
                                  }}
                                >
                                  {/* Text */}
                                  {m.message_text && (
                                    <p style={{ fontSize: '0.9rem', color: 'var(--ink)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                      {m.message_text}
                                    </p>
                                  )}

                                  {/* Attachment Spec / Previews */}
                                  {m.attachment_path && (
                                    <div style={{ marginTop: m.message_text ? 'var(--space-2)' : 0 }}>
                                      {m.attachment_path.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                        <a href={m.attachment_path} target="_blank" rel="noopener noreferrer">
                                          <img
                                            src={m.attachment_path}
                                            alt="attachment"
                                            style={{
                                              maxWidth: '100%',
                                              maxHeight: 200,
                                              borderRadius: 'var(--radius-sm)',
                                              objectFit: 'contain',
                                              border: '1px solid var(--line-strong)',
                                              marginTop: 4
                                            }}
                                          />
                                        </a>
                                      ) : (
                                        <a
                                          href={m.attachment_path}
                                          download
                                          className="btn btn-outline btn-sm"
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', padding: '4px 10px' }}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                          </svg>
                                          Attachment Spec File
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  {/* Delete button (sender only, non-deleted messages) */}
                                  {isSelf && (
                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                                      <button
                                        onClick={() => handleDeleteMessage(m.message_id)}
                                        className="btn btn-ghost btn-sm"
                                        style={{
                                          color: 'var(--coral)',
                                          fontSize: '0.7rem',
                                          padding: '0 4px',
                                          height: 'auto',
                                          border: 'none',
                                        }}
                                      >
                                        Delete
                                      </button>
                                      <span style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', marginLeft: 6 }}>
                                        {m.is_read ? 'Read' : 'Sent'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}

                </div>

                {/* Message Send Form & Preview panel */}
                <div style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderTop: '1.5px solid var(--line-strong)',
                  background: 'var(--paper-raised)'
                }}>
                  {/* File preview bar */}
                  {uploadFile && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 12px',
                      background: 'var(--paper)',
                      border: '1.5px solid var(--ink)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--space-2)'
                    }}>
                      {uploadPreview ? (
                        <img
                          src={uploadPreview}
                          alt="preview"
                          style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: 44, height: 44, background: 'var(--quad-tint)', color: 'var(--quad-deep)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)'
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {uploadFile.name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', margin: 0 }}>
                          {(uploadFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadFile(null);
                          setUploadPreview(null);
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--coral)', padding: '0 6px' }}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Input form */}
                  {!isConnected ? (
                    <div style={{
                      padding: '12px var(--space-3)',
                      textAlign: 'center',
                      color: 'var(--ink-soft)',
                      fontFamily: 'Fraunces, serif',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      backgroundColor: 'var(--bg-light)',
                      border: '1.5px solid var(--ink)',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      Connect with this user to start messaging.
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Attachment trigger */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-outline"
                        style={{
                          padding: 0,
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                        title="Attach spec or picture"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                      
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.txt,.xls,.xlsx"
                      />

                      {/* Text input */}
                      <input
                        type="text"
                        className="input"
                        placeholder={`Message ${activeDetails.title}...`}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        style={{ flex: 1, padding: '10px 16px', fontSize: '0.9rem' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSendMessage();
                          }
                        }}
                      />

                      {/* Send button */}
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ padding: '10px 20px', flexShrink: 0 }}
                        disabled={!inputText.trim() && !uploadFile}
                      >
                        Send
                      </button>
                    </form>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-faint)' }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 650, color: 'var(--ink)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                  Your Inbox
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
                  Select a conversation from the sidebar or start chat from community / project pages.
                </p>
              </div>
            )}
          </div>

        </div>

      </main>

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={(newConv) => {
          if (newConv && newConv.conversation_id) {
            setConversations((prev) => [
              newConv,
              ...prev.filter((c) => c.conversation_id !== newConv.conversation_id),
            ]);
            setActiveConversationId(newConv.conversation_id);
            loadConversations();
          }
        }}
      />
    </div>
  );
}
