import { useState } from 'react';
import { updateMemberPosition } from '../services/communityService';
import NameWithVerification from './NameWithVerification';

const COMMON_POSITIONS = [
  'President',
  'Vice President',
  'Secretary',
  'Joint Secretary',
  'Treasurer',
  'Head',
  'Faculty Coordinator',
  'Technical Lead',
  'Design Lead',
  'Event Coordinator',
];

export default function SetMemberPositionModal({
  isOpen,
  onClose,
  communityId,
  member,
  onPositionUpdated,
}) {
  const [position, setPosition] = useState(member?.position || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !member) return null;

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await updateMemberPosition(communityId, member.user_id, position.trim() || null);
      if (onPositionUpdated) {
        onPositionUpdated(member.user_id, position.trim() || null);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed to update position.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setPosition('');
    setLoading(true);
    setError('');

    try {
      await updateMemberPosition(communityId, member.user_id, null);
      if (onPositionUpdated) {
        onPositionUpdated(member.user_id, null);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to clear position.');
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: 480,
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
            <span className="eyebrow" style={{ color: 'var(--marigold-deep)' }}>Club Leadership</span>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, margin: 0, fontSize: '1.25rem' }}>
              Assign Leadership Position
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline btn-sm"
            style={{ padding: '4px 10px' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>
            {error}
          </div>
        )}

        {/* Member Preview */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            background: 'var(--paper)',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--line)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <div style={{ fontWeight: 650, fontSize: '0.92rem', color: 'var(--ink)' }}>
            <NameWithVerification user={{ name: member.name, is_verified: member.is_verified }} />
          </div>
          <span className="eyebrow" style={{ color: 'var(--ink-soft)' }}>
            {member.department || member.role}
          </span>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>
              Position / Title
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. President, Vice President, Secretary..."
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              maxLength={100}
              autoFocus
            />
          </div>

          {/* Quick Preset Badges */}
          <div>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>
              Common Positions
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COMMON_POSITIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPosition(pos)}
                  className={`tag ${position.toLowerCase() === pos.toLowerCase() ? 'tag-quad' : 'tag-muted'}`}
                  style={{ cursor: 'pointer', border: 'none', padding: '4px 8px' }}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-3)' }}>
            {member.position ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleClear}
                disabled={loading}
                style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
              >
                Clear Position
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Position'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
