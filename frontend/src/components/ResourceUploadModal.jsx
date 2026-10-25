import { useState, useRef } from 'react';
import { uploadResource } from '../services/resourceService';

export default function ResourceUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  resourceType,
  referenceId,
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      if (!title) {
        // Auto-fill title with file name (without extension)
        const nameWithoutExt = droppedFile.name.substring(0, droppedFile.name.lastIndexOf('.')) || droppedFile.name;
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) {
        const nameWithoutExt = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
        setTitle(nameWithoutExt);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('resource_type', resourceType);
    formData.append('reference_id', referenceId);
    formData.append('file', file);

    try {
      await uploadResource(formData);
      setSuccess('Resource uploaded successfully!');
      setTimeout(() => {
        // Reset states and close modal
        setTitle('');
        setDescription('');
        setFile(null);
        setSuccess('');
        onUploadSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      console.error('File upload failed', err);
      setError(err.response?.data?.detail?.message || 'Failed to upload resource. Ensure you are authorized to upload here.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(28, 27, 25, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999
    }}>
      <div className="pin-card pin-marigold fade-in" style={{ width: '90%', maxWidth: 500, background: '#fff', padding: 'var(--space-3)' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)' }}>
            Upload Resource File
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: '1.5rem', fontWeight: 'bold' }}
            disabled={loading}
          >
            &times;
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-2)' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 'var(--space-2)' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {/* File Drag & Drop Zone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="eyebrow">Select File *</label>
            
            {file ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px var(--space-2)',
                border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-light)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-soft)', flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span style={{ fontSize: '0.85rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name} ({Math.round(file.size / 1024)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--coral)',
                    fontWeight: 'bold', fontSize: '1.2rem', padding: '0 4px'
                  }}
                  disabled={loading}
                >
                  &times;
                </button>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? '2px dashed var(--ink)' : '1.5px dashed var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3) var(--space-2)',
                  textAlign: 'center',
                  background: isDragging ? 'var(--sand-tint)' : 'var(--bg-light)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto var(--space-1)', color: 'var(--ink-faint)' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
                  Drag and drop your file here, or <span style={{ color: 'var(--sky-deep, #2C6E92)', textDecoration: 'underline' }}>browse</span>
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--ink-faint)' }}>
                  Supports documents, PDFs, presentation slides, images up to 50MB
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Title input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="eyebrow" htmlFor="resource-title">Title *</label>
            <input
              id="resource-title"
              type="text"
              className="input"
              placeholder="e.g. Lecture 3 Notes, Project Brief"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Description input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="eyebrow" htmlFor="resource-desc">Description</label>
            <textarea
              id="resource-desc"
              className="input"
              rows={3}
              placeholder="Provide a short description of the file..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !file || !title.trim()}
            >
              {loading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
