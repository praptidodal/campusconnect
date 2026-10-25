import React, { useState } from 'react';
import { createReport } from '../services/adminService';

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'hate_speech', label: 'Hate Speech' },
  { key: 'fake_information', label: 'Fake Information' },
  { key: 'violence', label: 'Violence' },
  { key: 'copyright', label: 'Copyright Violation' },
  { key: 'other', label: 'Other' },
];

export default function ReportModal({ isOpen, contentType, contentId, onClose, onSuccess }) {
  const [selectedReason, setSelectedReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (selectedReason === 'other' && !description.trim()) {
      setError('Please describe your reason for reporting.');
      return;
    }

    setLoading(true);
    try {
      await createReport({
        content_type: contentType,
        content_id: Number(contentId),
        reason: selectedReason,
        description: description.trim() || null,
      });

      setSuccessMsg('Your report has been submitted successfully.');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccessMsg('');
        setDescription('');
        setSelectedReason('spam');
        onClose();
      }, 1800);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail?.message || 'Failed to submit report. You may have already reported this content.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setError('');
    setSuccessMsg('');
    setDescription('');
    setSelectedReason('spam');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', border: '2.5px solid var(--ink)', borderRadius: 'var(--radius-lg)',
        boxShadow: '6px 6px 0 var(--ink)', padding: 'var(--space-3)', width: '450px', maxWidth: '95vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', fontFamily: 'Fraunces, serif', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🚩</span> Report {contentType ? contentType.charAt(0).toUpperCase() + contentType.slice(1) : 'Content'}
          </h3>
          <button
            onClick={handleModalClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--ink-soft)' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ fontSize: '0.8rem', padding: '8px 12px', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        {successMsg ? (
          <div style={{
            padding: '24px', textAlign: 'center', background: '#f0fdf4',
            border: '1.5px solid #16a34a', borderRadius: 'var(--radius-md)', color: '#15803d',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{successMsg}</div>
            <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--ink-soft)' }}>
              Thank you for helping keep CampusConnect safe.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Reason for reporting
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {REPORT_REASONS.map((r) => {
                  const isSel = selectedReason === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setSelectedReason(r.key)}
                      style={{
                        padding: '8px 10px', fontSize: '0.8rem', fontWeight: isSel ? '700' : '500',
                        textAlign: 'left', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        background: isSel ? 'var(--coral-tint, #fff1f2)' : 'var(--paper)',
                        color: isSel ? 'var(--coral, #e11d48)' : 'var(--ink)',
                        border: isSel ? '1.5px solid var(--coral, #e11d48)' : '1px solid var(--line-strong)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Additional details {selectedReason === 'other' ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any additional context or details about the issue..."
                rows={3}
                style={{
                  width: '100%', padding: '10px', border: '1.5px solid var(--line-strong)',
                  borderRadius: 'var(--radius-md)', fontFamily: 'inherit', fontSize: '0.85rem',
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleModalClose}
                className="btn btn-sm btn-ghost"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-sm"
                style={{ background: 'var(--coral, #e11d48)', color: '#fff', border: '1.5px solid #be123c' }}
                disabled={loading}
              >
                {loading ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
