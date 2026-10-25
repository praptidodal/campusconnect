import React, { useState } from 'react';
import { blockUser } from '../services/blockService';

export default function BlockConfirmModal({ isOpen, targetUserId, targetUserName, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirmBlock = async () => {
    setLoading(true);
    setError('');
    try {
      await blockUser(targetUserId);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail?.message || err.response?.data?.message || 'Failed to block user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', border: '2.5px solid var(--ink)', borderRadius: 'var(--radius-lg)',
        boxShadow: '6px 6px 0 var(--ink)', padding: 'var(--space-4)', width: '400px', maxWidth: '95vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', fontFamily: 'Fraunces, serif', margin: 0 }}>
            Block {targetUserName || 'User'}?
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--ink-soft)' }}>
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ fontSize: '0.8rem', padding: '8px 12px', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: '20px' }}>
          They will no longer be able to interact with you on CampusConnect.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-ghost"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmBlock}
            className="btn btn-sm btn-danger"
            disabled={loading}
          >
            {loading ? 'Blocking…' : 'Block User'}
          </button>
        </div>
      </div>
    </div>
  );
}
