import React, { useState } from 'react';
import { createReport } from '../services/adminService';
import { reportAndBlockUser } from '../services/blockService';

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'hate_speech', label: 'Hate Speech' },
  { key: 'fake_information', label: 'Fake Information' },
  { key: 'violence_threats', label: 'Violence / Threats' },
  { key: 'impersonation', label: 'Impersonation' },
  { key: 'inappropriate_content', label: 'Inappropriate Content' },
  { key: 'scam_fraud', label: 'Scam / Fraud' },
  { key: 'bullying', label: 'Bullying' },
  { key: 'other', label: 'Other' },
];

export default function ReportUserModal({ isOpen, targetUserId, targetUserName, isReportAndBlock, onClose, onSuccess }) {
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
      setError('Please provide additional details for your reason.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        content_type: 'profile',
        content_id: Number(targetUserId),
        reason: selectedReason,
        description: description.trim() || null,
      };

      if (isReportAndBlock) {
        await reportAndBlockUser(payload);
        setSuccessMsg('User reported and blocked successfully.');
      } else {
        await createReport(payload);
        setSuccessMsg('Your report has been submitted successfully.');
      }

      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccessMsg('');
        setDescription('');
        setSelectedReason('spam');
        onClose();
      }, 1800);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail?.message || err.response?.data?.message || 'Failed to process request.');
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
        boxShadow: '6px 6px 0 var(--ink)', padding: 'var(--space-4)', width: '460px', maxWidth: '95vw',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '2px solid var(--ink)', paddingBottom: '8px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', fontFamily: 'Fraunces, serif', margin: 0 }}>
            Report {targetUserName || 'User'}
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
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--ink)', display: 'block', marginBottom: '8px' }}>
                Why are you reporting this user?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {REPORT_REASONS.map((r) => {
                  const isSel = selectedReason === r.key;
                  return (
                    <label
                      key={r.key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem',
                        background: isSel ? 'var(--paper-raised)' : '#fff',
                        border: isSel ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                        fontWeight: isSel ? '600' : '400',
                      }}
                    >
                      <input
                        type="radio"
                        name="report_reason"
                        value={r.key}
                        checked={isSel}
                        onChange={() => setSelectedReason(r.key)}
                        style={{ accentColor: 'var(--ink)' }}
                      />
                      <span>{r.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--ink-soft)', display: 'block', marginBottom: '4px' }}>
                Additional Details {selectedReason === 'other' ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more information..."
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
                style={{ background: 'var(--ink)', color: '#fff' }}
                disabled={loading}
              >
                {loading ? 'Processing…' : (isReportAndBlock ? 'Report & Block' : 'Submit Report')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
