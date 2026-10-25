import React, { useState, useEffect } from 'react';
import NameWithVerification from '../components/NameWithVerification';
import AdminLayout from '../components/AdminLayout';
import {
  getReports,
  getReportDetails,
  warnUser,
  suspendUser,
  unsuspendUser,
  banUser,
  unbanUser,
  deleteReportedContent,
  dismissReportItem,
} from '../services/adminService';

const FILTERS = [
  { label: 'Pending Only', key: 'pending' },
  { label: 'Reviewing', key: 'reviewing' },
  { label: 'Resolved', key: 'resolved' },
  { label: 'Dismissed', key: 'dismissed' },
  { label: 'All Reports', key: '' }
];

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Selected report detail modal state
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await getReports(statusFilter ? { status: statusFilter } : {});
      setReports(res.data || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve moderation reports queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const openReportDetail = async (reportId) => {
    setSelectedReportId(reportId);
    setDetailLoading(true);
    setActionReason('');
    try {
      const res = await getReportDetails(reportId);
      setReportDetail(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load report detail.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeReportDetail = () => {
    setSelectedReportId(null);
    setReportDetail(null);
    setActionReason('');
  };

  // Moderation Action Handlers
  const handleWarnUser = async (userId) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await warnUser(userId, selectedReportId, actionReason);
      setMessage(`Issued warning to user ID ${userId}.`);
      closeReportDetail();
      loadReports();
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to issue warning.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendUser = async (userId) => {
    if (!userId) return;
    if (!window.confirm('Are you sure you want to suspend this user?')) return;
    setActionLoading(true);
    try {
      await suspendUser(userId, selectedReportId, actionReason);
      setMessage(`Suspended user ID ${userId}.`);
      closeReportDetail();
      loadReports();
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to suspend user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspendUser = async (userId) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await unsuspendUser(userId, actionReason);
      setMessage(`Unsuspended user ID ${userId}.`);
      closeReportDetail();
      loadReports();
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to unsuspend user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async (userId) => {
    if (!userId) return;
    if (!window.confirm('Are you sure you want to PERMANENTLY BAN this user?')) return;
    setActionLoading(true);
    try {
      await banUser(userId, selectedReportId, actionReason);
      setMessage(`Banned user ID ${userId}.`);
      closeReportDetail();
      loadReports();
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to ban user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async (userId) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await unbanUser(userId, actionReason);
      setMessage(`Unbanned user ID ${userId}.`);
      closeReportDetail();
      loadReports();
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to unban user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteContent = async (contentType, contentId) => {
    if (!window.confirm(`Are you sure you want to DELETE this ${contentType}?`)) return;
    setActionLoading(true);
    try {
      await deleteReportedContent(contentType, contentId, selectedReportId, actionReason);
      setMessage(`Deleted violating ${contentType} (ID: ${contentId}).`);
      closeReportDetail();
      loadReports();
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to delete content.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismissReport = async (reportId) => {
    setActionLoading(true);
    try {
      await dismissReportItem(reportId, actionReason);
      setMessage(`Dismissed report ID ${reportId}.`);
      closeReportDetail();
      loadReports();
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to dismiss report.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout activeTab="reports">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>

        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', fontFamily: 'Fraunces, serif', margin: 0 }}>
              User Profile Reports Queue
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', margin: '4px 0 0' }}>
              Review reported user profiles, issue warnings, suspend or ban accounts, or dismiss reports.
            </p>
          </div>
        </div>
        
        {/* Banner alerts */}
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {/* Filters Row */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2.5px solid var(--ink)', paddingBottom: '8px', flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const isSel = statusFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setMessage(''); setError(''); }}
                className="btn"
                style={{
                  background: isSel ? 'var(--ink)' : 'transparent',
                  color: isSel ? 'var(--paper)' : 'var(--ink-soft)',
                  border: isSel ? '1.5px solid var(--ink)' : '1.5px solid var(--line-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: isSel ? '700' : '500',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Reports Queue List */}
        <div className="card" style={{ background: '#fff', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: 'var(--space-3)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'JetBrains Mono', color: 'var(--ink-soft)' }}>
              Loading reports queue…
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
              No reports matching status "{statusFilter || 'All'}". Excellent!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--ink)', textAlign: 'left', background: 'var(--paper)' }}>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', textTransform: 'uppercase' }}>Report ID</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', textTransform: 'uppercase' }}>Reporter</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', textTransform: 'uppercase' }}>Reported User</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', textTransform: 'uppercase' }}>Reason</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', textTransform: 'uppercase' }}>Description</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', textTransform: 'uppercase' }}>Created At</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', textTransform: 'uppercase' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    return (
                      <tr key={r.report_id} style={{ borderBottom: '1px solid var(--line)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '700', fontFamily: 'JetBrains Mono' }}>#{r.report_id}</td>
                        <td style={{ padding: '10px 12px' }}>{r.reporter_name}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '600' }}>{r.reported_user_name || '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--coral)', fontWeight: '600' }}>{r.reason}</td>
                        <td style={{ padding: '10px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink-soft)', fontStyle: r.description ? 'italic' : 'normal' }}>
                          {r.description || '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`status-badge status-${r.status}`} style={{ fontSize: '0.6rem', textTransform: 'capitalize' }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>
                          {formatDate(r.created_at)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            onClick={() => openReportDetail(r.report_id)}
                            className="btn btn-sm btn-outline"
                            style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                          >
                            Review →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Report Detail Modal / Drawer */}
        {selectedReportId && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}>
            <div style={{
              background: '#fff', border: '2.5px solid var(--ink)', borderRadius: 'var(--radius-lg)',
              boxShadow: '6px 6px 0 var(--ink)', padding: 'var(--space-4)', width: '650px', maxWidth: '95vw',
              maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--ink)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', fontFamily: 'Fraunces, serif', margin: 0 }}>
                  Report Detail #{selectedReportId}
                </h3>
                <button onClick={closeReportDetail} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>

              {detailLoading || !reportDetail ? (
                <div style={{ padding: '30px', textAlign: 'center', fontFamily: 'JetBrains Mono', color: 'var(--ink-soft)' }}>
                  Loading detail view…
                </div>
              ) : (
                <>
                  {/* Metadata Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--paper)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--line-strong)' }}>
                    <div>
                      <span className="eyebrow" style={{ fontSize: '0.65rem' }}>Content Type</span>
                      <div style={{ fontWeight: '700', textTransform: 'capitalize' }}>{reportDetail.content_type} (ID: {reportDetail.content_id})</div>
                    </div>
                    <div>
                      <span className="eyebrow" style={{ fontSize: '0.65rem' }}>Reason Category</span>
                      <div style={{ fontWeight: '700', color: 'var(--coral)' }}>{reportDetail.reason}</div>
                    </div>
                    <div>
                      <span className="eyebrow" style={{ fontSize: '0.65rem' }}>Reporter</span>
                      <div>{reportDetail.reporter?.name} ({reportDetail.reporter?.email})</div>
                    </div>
                    <div>
                      <span className="eyebrow" style={{ fontSize: '0.65rem' }}>Reported User</span>
                      <div>
                        {reportDetail.reported_user ? (
                          <>
                            <strong>{reportDetail.reported_user.name}</strong> ({reportDetail.reported_user.email})
                            <div style={{ fontSize: '0.75rem', marginTop: 2, color: 'var(--ink-soft)' }}>
                              Status: <span style={{ fontWeight: 700, color: reportDetail.reported_user.status === 'active' ? '#16a34a' : '#e11d48' }}>{reportDetail.reported_user.status}</span> · Warnings: <strong>{reportDetail.reported_user.warning_count}</strong>
                            </div>
                          </>
                        ) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Target Content Preview */}
                  <div style={{ background: '#fffbea', border: '1.5px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                    <span className="eyebrow" style={{ color: '#92400e', fontSize: '0.65rem' }}>Reported Entity Content Preview</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--ink)', fontWeight: '600', marginTop: '4px' }}>
                      {reportDetail.content_preview}
                    </div>
                    {reportDetail.description && (
                      <div style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--ink-soft)', fontStyle: 'italic', borderTop: '1px dashed #f59e0b', paddingTop: '6px' }}>
                        Reporter description: "{reportDetail.description}"
                      </div>
                    )}
                  </div>

                  {/* User Moderation History */}
                  {reportDetail.user_history && reportDetail.user_history.length > 0 && (
                    <div style={{ border: '1.5px solid var(--line-strong)', borderRadius: 'var(--radius-md)', padding: '10px' }}>
                      <span className="eyebrow" style={{ fontSize: '0.65rem', marginBottom: '6px', display: 'block' }}>Reported User Moderation History</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                        {reportDetail.user_history.map(h => (
                          <div key={h.log_id} style={{ fontSize: '0.75rem', background: 'var(--paper)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                            <strong style={{ textTransform: 'uppercase', color: 'var(--coral)' }}>{h.action}</strong> by {h.admin_name}: {h.reason} ({formatDate(h.created_at)})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Reason Input */}
                  <div>
                    <label className="eyebrow" style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'block' }}>
                      Reason / Notes for Moderation Action
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Repeated spam policy violation..."
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '2px solid var(--ink)', paddingTop: '12px' }}>
                    {reportDetail.reported_user && (
                      <>
                        <button
                          onClick={() => handleWarnUser(reportDetail.reported_user.user_id)}
                          className="btn btn-sm btn-outline"
                          disabled={actionLoading}
                          style={{ borderColor: '#f59e0b', color: '#b45309' }}
                        >
                          ⚠️ Issue Warning
                        </button>

                        {reportDetail.reported_user.status === 'suspended' ? (
                          <button
                            onClick={() => handleUnsuspendUser(reportDetail.reported_user.user_id)}
                            className="btn btn-sm"
                            disabled={actionLoading}
                            style={{ background: '#16a34a', color: '#fff' }}
                          >
                            ✓ Unsuspend User
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSuspendUser(reportDetail.reported_user.user_id)}
                            className="btn btn-sm"
                            disabled={actionLoading}
                            style={{ background: '#d97706', color: '#fff' }}
                          >
                            ⏸ Suspend User
                          </button>
                        )}

                        {reportDetail.reported_user.status === 'banned' ? (
                          <button
                            onClick={() => handleUnbanUser(reportDetail.reported_user.user_id)}
                            className="btn btn-sm"
                            disabled={actionLoading}
                            style={{ background: '#16a34a', color: '#fff' }}
                          >
                            ✓ Unban User
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBanUser(reportDetail.reported_user.user_id)}
                            className="btn btn-sm"
                            disabled={actionLoading}
                            style={{ background: '#be123c', color: '#fff' }}
                          >
                            🚫 Ban User
                          </button>
                        )}
                      </>
                    )}

                    <button
                      onClick={() => handleDismissReport(selectedReportId)}
                      className="btn btn-sm btn-ghost"
                      disabled={actionLoading}
                      style={{ marginLeft: 'auto', border: '1.5px solid var(--line-strong)' }}
                    >
                      Dismiss Report
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
