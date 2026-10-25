import { useState } from 'react';
import { applyForMembership } from '../services/communityService';

export default function MembershipApplicationModal({
  isOpen,
  onClose,
  communityId,
  communityName,
  opening,
  onApplicationSubmitted,
}) {
  const [coverNote, setCoverNote] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !opening) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await applyForMembership(communityId, {
        cover_note: coverNote.trim() || null,
        resume_url: resumeUrl.trim() || null,
      });
      if (onApplicationSubmitted) {
        onApplicationSubmitted(res.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed to submit application.');
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
            <span className="eyebrow" style={{ color: 'var(--quad)' }}>Club Recruitment</span>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, margin: 0, fontSize: '1.25rem' }}>
              Apply for {communityName}
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

        {/* Opening Info Card */}
        <div
          style={{
            background: 'var(--sand-tint)',
            border: '1.5px solid var(--marigold)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>
            {opening.title}
          </div>
          {opening.description && (
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
              {opening.description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <label className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>
              Why do you want to join? (Cover Note)
            </label>
            <textarea
              className="input"
              rows={4}
              placeholder="Introduce yourself, your relevant skills, and why you would be a great addition to the team..."
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div>
            <label className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>
              Portfolio / Resume Link (Optional)
            </label>
            <input
              type="url"
              className="input"
              placeholder="https://github.com/... or Google Drive link"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
