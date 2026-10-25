import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { createCommunity, uploadCommunityLogo } from '../services/communityService';

export default function CreateCommunityPage() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    community_name: '',
    description: '',
    category: 'Technology',
    logo_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleLogoFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    setError('');
    try {
      const res = await uploadCommunityLogo(file);
      setFormData(prev => ({ ...prev, logo_url: res.data.url }));
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const CATEGORIES = [
    'Technology',
    'Departments',
    'Interest Groups',
    'Research Groups',
    'Event Teams',
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.community_name.trim()) {
      setError('Community name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createCommunity({
        community_name: formData.community_name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        logo_url: formData.logo_url.trim() || null,
      });
      // Show pending approval message; don't navigate to detail (still pending)
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to create community. Ensure the name is unique.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success / Pending State ──
  if (submitted) {
    return (
      <div className="app-shell">
        <Sidebar active="communities" subtitle="Create Community" />
        <main className="app-main">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
            <div style={{ fontSize: '3rem' }}>🕐</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: 'Fraunces', textAlign: 'center', margin: 0 }}>
              Community Submitted for Review!
            </h2>
            <div style={{ maxWidth: '480px', textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 var(--space-2)' }}>
                Your community has been submitted for admin approval. You'll receive a notification once it's been reviewed.
              </p>
              <div style={{
                background: '#fff8e1', border: '1.5px solid #f59e0b', borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2)', fontSize: '0.85rem', color: '#92400e',
              }}>
                <strong>What happens next?</strong> An admin will review your community and either approve it,
                request changes, or decline it. You will be notified by email and in-app.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/communities/my')}
                className="btn btn-primary"
                id="view-my-communities-btn"
              >
                View My Communities
              </button>
              <button
                onClick={() => navigate('/communities')}
                className="btn btn-outline"
              >
                Browse Communities
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar active="communities" subtitle="Create Community" />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/communities')}>
            Back
          </button>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1, paddingLeft: 'var(--space-2)' }}>
            Start a Community
          </span>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 600 }}>
          <div className="pin-card pin-quad fade-in">
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-1)' }}>
              Create a New Community
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', marginBottom: 'var(--space-4)' }}>
              Clubs, departments, interest groups, or project teams. Create a hub to post updates, share work, and gather members.
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="eyebrow" htmlFor="community_name">Community Name *</label>
                <input
                  type="text"
                  id="community_name"
                  name="community_name"
                  className="input"
                  placeholder="e.g. AI Club, Computer Science Dept"
                  value={formData.community_name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="eyebrow" htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  className="input"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={loading}
                  style={{ appearance: 'none', background: 'var(--paper-raised)' }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="eyebrow">Community Logo Image (Optional)</label>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {formData.logo_url ? (
                    <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', overflow: 'hidden' }}>
                      <img src={formData.logo_url} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFormData(prev => ({ ...prev, logo_url: '' }));
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        style={{
                          position: 'absolute', top: 4, right: 4, background: 'rgba(255, 255, 255, 0.9)',
                          border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--coral)', fontSize: '14px',
                          zIndex: 10, boxShadow: 'var(--shadow)'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-sm)', border: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-light)', color: 'var(--ink-faint)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                  <label
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 600, color: 'var(--sky-deep, #2C6E92)',
                      background: '#FFFFFF', border: '1.5px solid var(--sky)', borderRadius: 'var(--radius-sm)',
                      padding: '7px 16px', transition: 'background 150ms ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--sky-tint)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                  >
                    <span>{uploadingLogo ? 'Uploading...' : 'Choose Logo Image'}</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      style={{ display: 'none' }}
                      disabled={uploadingLogo || loading}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="eyebrow" htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  className="input"
                  placeholder="Tell students what this community is about..."
                  value={formData.description}
                  onChange={handleChange}
                  disabled={loading}
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ height: 1, background: 'var(--line)', margin: 'var(--space-2) 0' }} />

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate('/communities')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
