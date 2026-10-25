import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnections } from '../hooks/useConnections';
import { createOrGetConversation } from '../services/chatService';
import RemoveConnectionDialog from './RemoveConnectionDialog';

export default function ConnectionButton({ targetUserId, targetUserName, initialStatusInfo, onStatusChange, size = 'sm' }) {
  const navigate = useNavigate();
  const {
    status,
    requestId,
    loading: hookLoading,
    error,
    sendRequest,
    accept,
    reject,
    withdraw,
    remove
  } = useConnections(targetUserId, initialStatusInfo);

  const [actionLoading, setActionLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const dropdownRef = useRef(null);

  // Sync back status change events
  useEffect(() => {
    if (onStatusChange && status) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  // Close dropdown on click outside
  useEffect(() => {
    const clickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const handleConnect = async (e) => {
    e.stopPropagation();
    if (actionLoading) return;
    setActionLoading(true);
    setInlineError('');
    try {
      await sendRequest();
    } catch (err) {
      setInlineError(err.message || 'Failed to send connection request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.stopPropagation();
    if (!requestId || actionLoading) return;
    setActionLoading(true);
    setInlineError('');
    try {
      await withdraw(requestId);
    } catch (err) {
      setInlineError(err.message || 'Failed to withdraw connection request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (e) => {
    e.stopPropagation();
    if (!requestId || actionLoading) return;
    setActionLoading(true);
    setInlineError('');
    try {
      await accept(requestId);
    } catch (err) {
      setInlineError(err.message || 'Failed to accept connection request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.stopPropagation();
    if (!requestId || actionLoading) return;
    setActionLoading(true);
    setInlineError('');
    try {
      await reject(requestId);
    } catch (err) {
      setInlineError(err.message || 'Failed to reject connection request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveConfirm = async () => {
    setShowRemoveModal(false);
    if (actionLoading) return;
    setActionLoading(true);
    setInlineError('');
    try {
      await remove();
    } catch (err) {
      setInlineError(err.message || 'Failed to remove connection.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoToChat = async (e) => {
    e.stopPropagation();
    setInlineError('');
    try {
      const res = await createOrGetConversation({
        conversation_type: 'direct',
        recipient_id: typeof targetUserId === 'string' ? parseInt(targetUserId, 10) : targetUserId
      });
      navigate(`/messages?conversation_id=${res.data.conversation_id}`);
    } catch (err) {
      setInlineError(err.response?.data?.detail?.message || 'Failed to open message conversation.');
    }
  };


  if (hookLoading && !status) {
    return (
      <button className={`btn btn-outline btn-${size}`} disabled style={{ minWidth: 100 }}>
        <span className="spinner spinner-ink" style={{ width: 12, height: 12, borderWidth: 2 }} />
      </button>
    );
  }

  if (status === 'self') return null;

  if (status === 'none') {
    return (
      <button
        onClick={handleConnect}
        disabled={actionLoading}
        className={`btn btn-primary btn-${size}`}
        style={{ minWidth: 100 }}
      >
        {actionLoading ? 'Connecting…' : 'Connect'}
      </button>
    );
  }

  if (status === 'pending_sent') {
    return (
      <button
        onClick={handleWithdraw}
        disabled={actionLoading}
        className={`btn btn-outline btn-${size}`}
        style={{
          minWidth: 100,
          backgroundColor: 'var(--bg-light)',
          color: 'var(--ink-soft)'
        }}
        title="Click to withdraw request"
      >
        {actionLoading ? '…' : 'Requested'}
      </button>
    );
  }

  if (status === 'pending_received') {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleAccept}
          disabled={actionLoading}
          className={`btn btn-primary btn-${size}`}
          style={{ padding: '4px 10px' }}
        >
          Accept
        </button>
        <button
          onClick={handleReject}
          disabled={actionLoading}
          className={`btn btn-outline btn-${size}`}
          style={{ padding: '4px 10px', color: 'var(--coral)' }}
        >
          Ignore
        </button>
      </div>
    );
  }

  // Connected state
  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
        className={`btn btn-outline btn-${size}`}
        style={{
          minWidth: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          borderColor: 'var(--quad)',
          color: 'var(--quad)'
        }}
      >
        Connected
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 1l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 6,
          background: '#fff',
          border: '2px solid var(--ink)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '4px 4px 0 var(--ink)',
          zIndex: 100,
          minWidth: 160,
          overflow: 'hidden',
          animation: 'star-pop 120ms ease'
        }}>
          <button
            onClick={handleGoToChat}
            style={{
              width: '100%',
              padding: '10px var(--space-2)',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: 'var(--ink)',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            className="hover:bg-neutral-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Send Message
          </button>
          <div style={{ height: 1, background: 'var(--line)' }} />
          <button
            onClick={(e) => { e.stopPropagation(); setShowDropdown(false); setShowRemoveModal(true); }}
            style={{
              width: '100%',
              padding: '10px var(--space-2)',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: 'var(--coral)',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            className="hover:bg-neutral-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Remove Connection
          </button>
        </div>
      )}

      <RemoveConnectionDialog
        isOpen={showRemoveModal}
        userName={targetUserName || 'this user'}
        onConfirm={handleRemoveConfirm}
        onCancel={() => setShowRemoveModal(false)}
      />
    </div>
  );
}
