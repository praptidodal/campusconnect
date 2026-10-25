import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { createCollaboration, updateCollaboration, getCollaborationDetails } from '../services/collaborationService';
import { getMyProfile } from '../services/profileService';

export default function CreateOpportunityPage() {
  const { collaborationId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const isEditMode = Boolean(collaborationId);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Hackathons',
    required_skills: '',
    positions_available: 1,
    deadline: '',
    community_id: '',
    attachment_path: '',
  });

  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [error, setError] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const CATEGORIES = [
    'Hackathons',
    'Research Projects',
    'Startup Ideas',
    'Club Activities',
    'Team Formation',
    'Freelance Work'
  ];

  const formatForInput = (isoString) => {
    if (!isoString) return '';
    return isoString.slice(0, 16);
  };

  useEffect(() => {
    const loadFormInfo = async () => {
      try {
        const profRes = await getMyProfile();
        setCommunities(profRes.data.communities || []);

        if (isEditMode) {
          const res = await getCollaborationDetails(collaborationId);
          const col = res.data;
          setFormData({
            title: col.title || '',
            description: col.description || '',
            category: col.category || 'Hackathons',
            required_skills: col.required_skills || '',
            positions_available: col.positions_available || 1,
            deadline: formatForInput(col.deadline),
            community_id: col.community_id || '',
            attachment_path: col.attachment_path || '',
          });
        }
      } catch (err) {
        setError('Failed to load form details.');
      } finally {
        setFetching(false);
      }
    };
    loadFormInfo();
  }, [collaborationId, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Local validation
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    const forbidden = ['.exe', '.sh', '.bat', '.cmd', '.msi'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).lowerCase || '';
    if (forbidden.some(f => ext.endsWith(f))) {
      setError('Executable files are not allowed.');
      return;
    }

    setAttachmentFile(file);
    setError('');
  };

  const removeAttachment = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAttachmentFile(null);
    setFormData(prev => ({ ...prev, attachment_path: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }
    if (formData.positions_available <= 0) {
      setError('Positions available must be greater than 0');
      return;
    }
    const now = new Date();
    const deadDate = new Date(formData.deadline);
    if (deadDate <= now) {
      setError('Deadline must be in the future');
      return;
    }

    setLoading(true);

    const fd = new FormData();
    fd.append('title', formData.title.trim());
    fd.append('description', formData.description.trim());
    fd.append('category', formData.category);
    fd.append('required_skills', formData.required_skills.trim() || '');
    fd.append('positions_available', String(formData.positions_available));
    fd.append('deadline', formData.deadline);
    if (formData.community_id) {
      fd.append('community_id', String(formData.community_id));
    }
    
    if (attachmentFile) {
      fd.append('attachment', attachmentFile);
    } else if (!formData.attachment_path) {
      fd.append('clear_attachment', 'true');
    }

    try {
      if (isEditMode) {
        await updateCollaboration(collaborationId, fd);
        navigate(`/collaborations/${collaborationId}`);
      } else {
        const res = await createCollaboration(fd);
        navigate(`/collaborations/${res.data.collaboration_id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'An error occurred while saving the opportunity.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="app-shell">
        <Sidebar active="collaborate" />
        <main className="app-main">
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
            <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
            <p className="eyebrow">Loading details</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar active="collaborate" />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            Back
          </button>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1, paddingLeft: 'var(--space-2)' }}>
            {isEditMode ? 'Edit Opportunity' : 'Post New Opportunity'}
          </span>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 640 }}>
          <div className="pin-card pin-marigold fade-in">
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-1)' }}>
              {isEditMode ? 'Modify Collaboration Posting' : 'Post a Collaboration'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', marginBottom: 'var(--space-4)' }}>
              Form a team for hackathons, start research projects, look for startup co-founders, or recruit for club activities.
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="eyebrow" htmlFor="title">Opportunity Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  className="input"
                  placeholder="e.g. React Developer for MIT Hackathon"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="eyebrow" htmlFor="community_id">Host Community (Optional)</label>
                  <select
                    id="community_id"
                    name="community_id"
                    className="input"
                    value={formData.community_id}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ appearance: 'none', background: 'var(--paper-raised)' }}
                  >
                    <option value="">None (Personal opportunity)</option>
                    {communities.map(c => (
                      <option key={c.community_id} value={c.community_id}>
                        {c.community_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="eyebrow" htmlFor="positions_available">Open Positions *</label>
                  <input
                    type="number"
                    id="positions_available"
                    name="positions_available"
                    className="input"
                    min="1"
                    value={formData.positions_available}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="eyebrow" htmlFor="deadline">Application Deadline *</label>
                  <input
                    type="datetime-local"
                    id="deadline"
                    name="deadline"
                    className="input"
                    value={formData.deadline}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="eyebrow" htmlFor="required_skills">Required Skills (Comma Separated)</label>
                <input
                  type="text"
                  id="required_skills"
                  name="required_skills"
                  className="input"
                  placeholder="e.g. React, Python, UI Design"
                  value={formData.required_skills}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              {/* Attachment File Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="eyebrow">Project Specification / Attachment (Optional)</label>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {attachmentFile || formData.attachment_path ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: '#fff' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink)' }}>
                        {attachmentFile ? attachmentFile.name : 'Attached Document'}
                      </span>
                      <button
                        type="button"
                        onClick={removeAttachment}
                        style={{
                          background: 'rgba(255, 255, 255, 0.9)',
                          border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--coral)', fontSize: '12px',
                          boxShadow: 'var(--shadow)', zIndex: 10
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div style={{ width: 60, height: 60, borderRadius: 'var(--radius-sm)', border: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-light)', color: 'var(--ink-faint)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
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
                    <span>{uploadingAttachment ? 'Uploading...' : 'Choose File'}</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      disabled={loading}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="eyebrow" htmlFor="description">Project Description *</label>
                <textarea
                  id="description"
                  name="description"
                  className="input"
                  placeholder="Describe your project, team goals, required profiles, and what you are looking to build together..."
                  value={formData.description}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  rows={6}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ height: 1, background: 'var(--line)', margin: 'var(--space-2) 0' }} />

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Publish Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
