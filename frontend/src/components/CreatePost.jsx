import { useState, useRef, useEffect } from 'react';
import { createPost, uploadPostPicture } from '../services/postService';

export default function CreatePost({ onPostCreated }) {
  const fileInputRef = useRef(null);
  const visMenuRef = useRef(null);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [visOpen, setVisOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [error, setError] = useState('');

  const maxLength = 5000;

  useEffect(() => {
    if (!visOpen) return;
    const handleClickOutside = (e) => {
      if (visMenuRef.current && !visMenuRef.current.contains(e.target)) {
        setVisOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visOpen]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImg(true);
    setError('');
    try {
      const { data } = await uploadPostPicture(file);
      setImageUrl(data.url);
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to upload image. Max size is 5MB.');
      setImageUrl('');
    } finally {
      setUploadingImg(false);
    }
  };

  const removeAttachedImage = () => {
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Content cannot be empty.');
      return;
    }
    if (content.length > maxLength) {
      setError(`Content exceeds maximum limit of ${maxLength} characters.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createPost({
        content: content.trim(),
        image_url: imageUrl || null,
        visibility
      });
      setContent('');
      setImageUrl('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onPostCreated) onPostCreated();
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to publish post. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card fade-in" style={{ marginBottom: 'var(--space-4)', position: 'relative', zIndex: visOpen ? 50 : 1 }}>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 'var(--space-2)' }}>
        Share something on campus
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ position: 'relative' }}>
          <textarea
            className="input"
            rows={3}
            placeholder="What's happening?"
            value={content}
            onChange={(e) => { setContent(e.target.value); setError(''); }}
            style={{
              resize: 'vertical',
              paddingBottom: 'var(--space-5)',
              minHeight: 80,
              fontSize: '0.9rem',
              lineHeight: 1.6
            }}
          />
          <span
            className="eyebrow"
            style={{
              position: 'absolute',
              bottom: 10,
              right: 12,
              fontSize: '0.75rem',
              color: content.length > maxLength ? 'var(--coral)' : 'var(--ink-faint)',
            }}
          >
            {content.length} / {maxLength}
          </span>
        </div>

        {uploadingImg && (
          <div style={{ marginTop: 'var(--space-2)', color: 'var(--ink-faint)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="spinner spinner-ink" style={{ width: 14, height: 14, borderWidth: 2 }} />
            <span>Uploading image…</span>
          </div>
        )}

        {imageUrl && (
          <div className="fade-in" style={{
            position: 'relative',
            marginTop: 'var(--space-2)',
            borderRadius: 'var(--radius-quad)',
            overflow: 'hidden',
            border: '1px solid var(--line)',
            maxHeight: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-light)'
          }}>
            <img src={imageUrl} alt="Upload Preview" style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain' }} />
            <button
              type="button"
              onClick={removeAttachedImage}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '50%',
                width: 24,
                height: 24,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: 'var(--coral)',
                boxShadow: 'var(--shadow)'
              }}
              title="Remove image"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginTop: 'var(--space-2)', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-3)', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>

            {/* Custom visibility dropdown — replaces native <select> so no emoji / browser-default styling leaks through */}
            <div style={{ position: 'relative' }} ref={visMenuRef}>
              <div
                onClick={() => setVisOpen(!visOpen)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#FFFFFF',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '7px 12px'
                }}
              >
                {visibility === 'public' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sky)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--quad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /><path d="M21 21v-2a4 4 0 00-3-3.87" />
                  </svg>
                )}
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--ink)' }}>
                  {visibility === 'public' ? 'Public' : 'Followers'}
                </span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {visOpen && (
                <div style={{
                  position: 'absolute',
                  top: 38,
                  left: 0,
                  background: '#FFFFFF',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: 150,
                  zIndex: 100,
                  overflow: 'hidden'
                }}>
                  <div
                    onClick={() => { setVisibility('public'); setVisOpen(false); }}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 14px',
                      fontSize: '0.8rem',
                      color: 'var(--ink)',
                      background: visibility === 'public' ? 'var(--sky-tint)' : 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--sky-tint)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = visibility === 'public' ? 'var(--sky-tint)' : 'transparent'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sky)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
                    </svg>
                    <span style={{ flex: 1 }}>Public</span>
                    {visibility === 'public' && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--sky)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                  <div
                    onClick={() => { setVisibility('followers'); setVisOpen(false); }}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 14px',
                      fontSize: '0.8rem',
                      color: 'var(--ink)',
                      borderTop: '1px solid var(--line)',
                      background: visibility === 'followers' ? 'var(--quad-tint)' : 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--quad-tint)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = visibility === 'followers' ? 'var(--quad-tint)' : 'transparent'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--quad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /><path d="M21 21v-2a4 4 0 00-3-3.87" />
                    </svg>
                    <span style={{ flex: 1 }}>Followers</span>
                    {visibility === 'followers' && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--quad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--sky-deep, #2C6E92)',
                background: '#FFFFFF',
                border: '1.5px solid var(--sky)',
                borderRadius: 'var(--radius-sm)',
                padding: '7px 16px',
                transition: 'background 150ms ease, transform 120ms ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--sky-tint)'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 9h18" />
                <circle cx="12" cy="15" r="3" />
              </svg>
              <span>Add photo</span>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={loading || uploadingImg || !content.trim() || content.length > maxLength}
            style={{ minWidth: 80 }}
          >
            {loading ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}