import { useState, useEffect } from 'react';
import { getConnections } from '../services/connectionService';
import { createGroupConversation } from '../services/chatService';
import NameWithVerification from './NameWithVerification';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [groupName, setGroupName] = useState('');
  const [connections, setConnections] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setGroupName('');
    setSelectedMembers([]);
    setSearchQuery('');
    setError('');

    const fetchConnections = async () => {
      setLoadingConnections(true);
      try {
        const res = await getConnections({ limit: 100 });
        setConnections(res.data || []);
      } catch (err) {
        console.error('Failed to load connections:', err);
        setError('Failed to load eligible connections.');
      } finally {
        setLoadingConnections(false);
      }
    };

    fetchConnections();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleMember = (user) => {
    setError('');
    const exists = selectedMembers.some((m) => m.user_id === user.user_id);
    if (exists) {
      setSelectedMembers((prev) => prev.filter((m) => m.user_id !== user.user_id));
    } else {
      setSelectedMembers((prev) => [...prev, user]);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Please provide a group name.');
      return;
    }
    if (selectedMembers.length === 0) {
      setError('Please select at least one connected member.');
      return;
    }
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        group_name: groupName.trim(),
        member_ids: selectedMembers.map((m) => m.user_id),
      };
      const res = await createGroupConversation(payload);
      // Reset state on success
      setGroupName('');
      setSelectedMembers([]);
      setSearchQuery('');
      setError('');
      if (onGroupCreated) {
        onGroupCreated(res.data);
      }
      onClose();
    } catch (err) {
      let errorMsg = 'Failed to create group.';
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (detail && typeof detail === 'object') {
        if (detail.message) {
          errorMsg = detail.message;
        } else if (Array.isArray(detail)) {
          errorMsg = detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
        }
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const filteredConnections = connections.filter((c) =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(28, 27, 25, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 'var(--space-2)',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-4)',
          background: 'var(--paper-raised)',
          boxShadow: 'var(--shadow-modal, 8px 8px 0 var(--ink))',
          animation: 'star-pop 150ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--marigold-deep)' }}>New Group</span>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, margin: 0, fontSize: '1.25rem' }}>
              Create Chat Group
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline btn-sm"
            style={{ padding: '4px 10px', fontSize: '0.9rem' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Group Name input */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <label className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>
              Group Name *
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Robotics Project Team, Study Circle..."
              value={groupName}
              onChange={(e) => { setGroupName(e.target.value); setError(''); }}
              maxLength={150}
              required
              autoFocus
            />
          </div>

          {/* Selected Members Chips */}
          {selectedMembers.length > 0 && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>
                Selected Members ({selectedMembers.length})
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 80, overflowY: 'auto' }}>
                {selectedMembers.map((m) => (
                  <span
                    key={m.user_id}
                    className="tag tag-quad"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}
                  >
                    <span>{m.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleMember(m)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        fontWeight: 700,
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Connected Member Selection Notice & Filter */}
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="eyebrow">
                Eligible Connections ({connections.length})
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>
                Only mutual connections can be added
              </span>
            </div>
            <input
              type="text"
              className="input"
              placeholder="Filter connections by name or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          {/* Connections List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              border: '1.5px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--paper)',
              marginBottom: 'var(--space-4)',
              minHeight: 160,
              maxHeight: 220,
            }}
          >
            {loadingConnections ? (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--ink-soft)' }}>
                <span className="spinner spinner-ink" style={{ display: 'inline-block', marginBottom: 8 }} />
                <div>Loading your connections...</div>
              </div>
            ) : connections.length === 0 ? (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>No connections found.</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--ink-faint)' }}>
                  You must connect with classmates or faculty first to add them to a group.
                </p>
              </div>
            ) : filteredConnections.length === 0 ? (
              <div style={{ padding: 'var(--space-3)', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                No matching connections for "{searchQuery}"
              </div>
            ) : (
              filteredConnections.map((conn) => {
                const isSelected = selectedMembers.some((m) => m.user_id === conn.user_id);
                return (
                  <div
                    key={conn.user_id}
                    onClick={() => toggleMember(conn)}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--line)',
                      background: isSelected ? 'var(--quad-tint)' : 'transparent',
                      transition: 'background 120ms ease',
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent onClick
                      style={{ cursor: 'pointer', accentColor: 'var(--quad)' }}
                    />

                    {/* Avatar */}
                    {conn.profile_picture ? (
                      <img
                        src={conn.profile_picture}
                        alt={conn.name}
                        className="avatar"
                        style={{ width: 32, height: 32, objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="avatar"
                        style={{ width: 32, height: 32, fontSize: '0.75rem', background: 'var(--sand-tint)' }}
                      >
                        {initials(conn.name)}
                      </div>
                    )}

                    {/* User info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)' }}>
                        <NameWithVerification user={conn} badgeSize={13} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                        {conn.department || conn.role}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 'auto' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || selectedMembers.length === 0 || !groupName.trim()}
              style={{
                opacity: (loading || selectedMembers.length === 0 || !groupName.trim()) ? 0.5 : 1,
                cursor: (loading || selectedMembers.length === 0 || !groupName.trim()) ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {loading && (
                <span
                  className="spinner"
                  style={{
                    width: 14,
                    height: 14,
                    borderWidth: 2,
                    borderColor: '#fff #fff transparent transparent',
                    display: 'inline-block',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
              )}
              {loading
                ? 'Creating Group...'
                : !groupName.trim()
                ? 'Enter Group Name'
                : selectedMembers.length === 0
                ? 'Select Members'
                : `Create Group (${selectedMembers.length + 1} members)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
