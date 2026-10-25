import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getResourceDetails, getResourceAnalytics, deleteResource, downloadResource } from '../services/resourceService';
import { useAuth } from '../context/AuthContext';
import { useUndoDelete } from '../context/UndoDeleteContext';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSize(bytes) {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function ResourceDetailsPage() {
  const { resourceId } = useParams();
  const { user: currentUser } = useAuth();
  const { addPendingDelete } = useUndoDelete();
  const navigate = useNavigate();

  const [resource, setResource] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setError('');
      // Fetch details first
      const detailRes = await getResourceDetails(resourceId);
      setResource(detailRes.data);

      // Fetch analytics
      const analRes = await getResourceAnalytics(resourceId);
      setAnalytics(analRes.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail?.message || 'Failed to load resource analytics details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [resourceId]);

  const handleDownload = async () => {
    if (!resource) return;
    try {
      const filename = resource.file_path.split('/').pop() || 'resource';
      await downloadResource(resource.resource_id, filename);
      // Reload analytics to show new download count
      loadData();
    } catch (err) {
      alert('Download failed. You might not have access.');
    }
  };

  const handleDelete = () => {
    if (!resource) return;
    if (!window.confirm(`Are you sure you want to delete "${resource.title}"? This will permanently remove the file from storage.`)) return;
    
    // Navigate away first
    navigate('/resources');

    addPendingDelete(
      `resource_${resource.resource_id}`,
      resource.title,
      'resource',
      resource.resource_id,
      async () => {
        try {
          await deleteResource(resource.resource_id);
        } catch (err) {
          console.error('Failed to delete resource:', err);
        }
      },
      () => {
        // Restore callback: navigate back to details
        navigate(`/resources/${resource.resource_id}`);
      }
    );
  };

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar active="resources" />
        <main className="app-main">
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
            <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
            <p className="eyebrow">Loading analytics details</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="app-shell">
        <Sidebar active="resources" />
        <main className="app-main">
          <div style={{ padding: 'var(--space-4)' }}>
            <div className="alert alert-error">{error || 'Resource not found'}</div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)} style={{ marginTop: 'var(--space-2)' }}>
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar active="resources" subtitle="Resource Analytics" />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            Back
          </button>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1, paddingLeft: 'var(--space-2)' }}>
            Resource Info & Analytics
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleDownload}>
              Download file
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--coral)', borderColor: 'var(--coral-tint)' }}
              onClick={handleDelete}
            >
              Delete file
            </button>
          </div>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          {/* File summary details card */}
          <div className="pin-card pin-marigold fade-in" style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-1)' }}>
              <span className="role-badge role-student" style={{ textTransform: 'uppercase' }}>
                {resource.file_type || 'File'}
              </span>
              <span className="role-badge role-club" style={{ textTransform: 'capitalize' }}>
                {resource.resource_type} Resource
              </span>
            </div>

            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.6rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-2)' }}>
              {resource.title}
            </h1>

            {resource.description && (
              <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
                {resource.description}
              </p>
            )}

            {/* Grid stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-2)', borderTop: '1px solid var(--line)', paddingTop: 'var(--space-3)' }}>
              <div>
                <span className="eyebrow" style={{ color: 'var(--ink-faint)' }}>File Size</span>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>{formatSize(resource.file_size)}</p>
              </div>
              <div>
                <span className="eyebrow" style={{ color: 'var(--ink-faint)' }}>Uploaded By</span>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>{resource.uploader_name}</p>
              </div>
              <div>
                <span className="eyebrow" style={{ color: 'var(--ink-faint)' }}>Date Uploaded</span>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>{new Date(resource.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Analytics Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div className="card fade-in" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
              <div className="eyebrow" style={{ color: 'var(--ink-soft)' }}>Total Downloads</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: '3rem', fontWeight: 700, color: 'var(--quad)', margin: '8px 0' }}>
                {analytics?.total_downloads || 0}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--ink-faint)' }}>downloads logged in database</div>
            </div>

            <div className="card fade-in" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
              <div className="eyebrow" style={{ color: 'var(--ink-soft)' }}>Downloads (Last 7 Days)</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: '3rem', fontWeight: 700, color: 'var(--coral)', margin: '8px 0' }}>
                {analytics?.recent_downloads_count || 0}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--ink-faint)' }}>recent downloads activity</div>
            </div>
          </div>

          {/* Download logs list */}
          <div className="card fade-in">
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-3)' }}>
              Download History Log
            </h2>

            {!analytics?.downloads || analytics.downloads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--ink-faint)' }}>
                <p style={{ fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>No downloads recorded yet for this resource.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--ink)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 4px', color: 'var(--ink-soft)', fontWeight: 600 }}>User Name</th>
                      <th style={{ padding: '8px 4px', color: 'var(--ink-soft)', fontWeight: 600 }}>Downloaded At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.downloads.map((log) => (
                      <tr key={log.download_id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '10px 4px', fontWeight: 600, color: 'var(--ink)' }}>{log.user_name}</td>
                        <td style={{ padding: '10px 4px', color: 'var(--ink-soft)' }}>{formatDate(log.downloaded_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
