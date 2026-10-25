import React from 'react';

export default function RemoveConnectionDialog({ isOpen, userName, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      animation: 'star-pop 150ms ease-out'
    }}>
      <div style={{
        backgroundColor: '#fff',
        border: '2px solid var(--ink)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '8px 8px 0 var(--ink)',
        width: '100%',
        maxWidth: 400,
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)'
      }}>
        <h3 style={{
          fontFamily: 'Fraunces, serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          color: 'var(--ink)',
          margin: 0
        }}>
          Remove Connection?
        </h3>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--ink-soft)',
          lineHeight: 1.5,
          margin: 0
        }}>
          Are you sure you want to remove <strong>{userName}</strong> from your connections? You will no longer be able to message each other unless you reconnect.
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          marginTop: 'var(--space-2)'
        }}>
          <button
            onClick={onCancel}
            className="btn btn-ghost btn-sm"
            style={{ minWidth: 80 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-primary btn-sm"
            style={{
              backgroundColor: 'var(--coral)',
              borderColor: 'var(--ink)',
              color: '#fff',
              minWidth: 80
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
