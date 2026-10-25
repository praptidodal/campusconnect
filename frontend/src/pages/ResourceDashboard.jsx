import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NameWithVerification from '../components/NameWithVerification';
import { searchResources, downloadResource, deleteResource } from '../services/resourceService';
import { useAuth } from '../context/AuthContext';
import { useUndoDelete } from '../context/UndoDeleteContext';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatSize(bytes) {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function ResourceDashboard() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addPendingDelete } = useUndoDelete();

  const [keyword, setKeyword] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [fileType, setFileType] = useState('');
  
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchResults = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (keyword.trim()) params.keyword = keyword.trim();
      if (resourceType) params.resource_type = resourceType;
      if (fileType) params.file_type = fileType;

      const res = await searchResources(params);
      setResources(res.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch resources. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [resourceType, fileType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchResults();
  };

  const renderFileIcon = (type) => {
    const t = type?.toLowerCase() || '';
    if (t === 'pdf') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      );
    }
    if (['doc', 'docx', 'txt', 'rtf'].includes(t)) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--sky-deep)" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    }
    if (['zip', 'rar', 'tar', 'gz'].includes(t)) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--marigold)" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <circle cx="12" cy="14" r="2" />
        </svg>
      );
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(t)) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--quad)" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );
    }
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  };

  const handleDownload = async (res) => {
    try {
      const filename = res.file_path.split('/').pop() || 'resource';
      await downloadResource(res.resource_id, filename);
      // Refresh list to update download count
      fetchResults();
    } catch (err) {
      alert('Download failed. You might not have access.');
    }
  };

  const handleDelete = (res) => {
    if (!window.confirm(`Are you sure you want to delete "${res.title}"?`)) return;

    // Immediately remove from local state
    setResources(prev => prev.filter(r => r.resource_id !== res.resource_id));

    addPendingDelete(
      `resource_${res.resource_id}`,
      res.title,
      'resource',
      res.resource_id,
      async () => {
        try {
          await deleteResource(res.resource_id);
        } catch (err) {
          console.error('Failed to delete resource:', err);
        }
      },
      () => {
        // Restore callback: put the resource back in the list, chronologically sorted
        setResources(prev => {
          if (prev.some(r => r.resource_id === res.resource_id)) return prev;
          return [res, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });
      }
    );
  };

  const handleNavigateToHub = (res) => {
    if (res.resource_type === 'community') {
      navigate(`/communities/${res.reference_id}`);
    } else if (res.resource_type === 'event') {
      navigate(`/events/${res.reference_id}`);
    } else if (res.resource_type === 'collaboration') {
      navigate(`/collaborations/${res.reference_id}`);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar active="resources" subtitle="Resource Hub" />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.25rem', color: 'var(--ink)' }}>
            Resource Hub & Files
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', paddingRight: 'var(--space-2)' }}>
            Search shared files across your classes, clubs, and projects
          </span>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          {/* Helpful tips on sharing */}
          <div style={{
            background: 'var(--marigold-tint)',
            border: '1px solid var(--marigold)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-3)',
            marginBottom: 'var(--space-3)',
            fontSize: '0.85rem',
            color: 'var(--ink-soft)',
            lineHeight: 1.5
          }}>
            <strong>Sharing Resources:</strong> Files are shared directly within specific communities, events, or collaboration opportunities. To upload a file, navigate to that specific page (e.g. your community or event details) and select the <strong>Resources</strong> or <strong>Shared Team Files</strong> tab.
          </div>

          {/* Search and Filters block */}
          <div className="card" style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3)' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Search Row */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-light)', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', flex: 1 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8, color: 'var(--ink-soft)', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search shared resources by title or keywords..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.85rem', color: 'var(--ink)', width: '100%', padding: 0 }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px', height: 'auto' }}>
                  Search
                </button>
              </div>

              {/* Filters Row */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label className="eyebrow" htmlFor="filter-hub" style={{ margin: 0, fontSize: '0.7rem' }}>Shared In:</label>
                  <select
                    id="filter-hub"
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                    style={{ background: '#FFF', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: '0.8rem', color: 'var(--ink)', outline: 'none' }}
                  >
                    <option value="">All Hubs</option>
                    <option value="community">Communities</option>
                    <option value="event">Events</option>
                    <option value="collaboration">Collaborations</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label className="eyebrow" htmlFor="filter-format" style={{ margin: 0, fontSize: '0.7rem' }}>File Format:</label>
                  <select
                    id="filter-format"
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    style={{ background: '#FFF', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: '0.8rem', color: 'var(--ink)', outline: 'none' }}
                  >
                    <option value="">All Formats</option>
                    <option value="pdf">PDF Documents</option>
                    <option value="docx">Word Documents (.docx)</option>
                    <option value="zip">Zipped Archives</option>
                    <option value="png">Images (PNG/JPG)</option>
                    <option value="txt">Text Files</option>
                  </select>
                </div>
              </div>
            </form>
          </div>

          {/* Results Block */}
          {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
              <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
              <p className="eyebrow">Fetching resources...</p>
            </div>
          ) : resources.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: '#FFF', border: '1.5px dashed var(--line)', borderRadius: 'var(--radius-md)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto var(--space-2)', color: 'var(--ink-faint)' }}>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', color: 'var(--ink)', fontWeight: 600 }}>No resources found</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', maxWidth: 420, margin: '6px auto 0' }}>
                We couldn't find any resources matching your search. Ensure keywords are spelled correctly, or adjust your hubs and formats filter.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {resources.map((res) => {
                const isUploader = currentUser?.user_id === res.uploaded_by;
                const canDelete = isUploader || currentUser?.role === 'admin';

                return (
                  <div key={res.resource_id} className="card fade-in" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', background: '#FFF' }}>
                    {/* Left: Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
                      {renderFileIcon(res.file_type)}
                      <div style={{ minWidth: 0 }}>
                        {/* Title and context */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: '1.05rem', fontWeight: 600, color: 'var(--ink)' }}>
                            {res.title}
                          </h4>
                          <span
                            onClick={() => handleNavigateToHub(res)}
                            className={`role-badge ${
                              res.resource_type === 'community' ? 'role-club' : res.resource_type === 'event' ? 'role-student' : 'role-admin'
                            } hover:underline`}
                            style={{ fontSize: '0.75rem', cursor: 'pointer', textTransform: 'capitalize' }}
                          >
                            {res.resource_type} Hub
                          </span>
                        </div>

                        {res.description && (
                          <p style={{ margin: '2px 0 4px 0', fontSize: '0.9rem', color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {res.description}
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--ink-faint)', marginTop: 2 }}>
                          <span>By <NameWithVerification user={{ name: res.uploader_name, role: res.uploader_role, is_verified: res.uploader_verified }} /></span>
                          <span>•</span>
                          <span>{formatSize(res.file_size)}</span>
                          <span>•</span>
                          <span>{res.download_count} download{res.download_count !== 1 && 's'}</span>
                          <span>•</span>
                          <span>{formatDate(res.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => handleDownload(res)}
                        className="btn btn-outline btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                      </button>

                      {(isUploader || currentUser?.role === 'admin') && (
                        <button
                          onClick={() => navigate(`/resources/${res.resource_id}`)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--sky-deep)' }}
                        >
                          Analytics
                        </button>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => handleDelete(res)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--coral)' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
