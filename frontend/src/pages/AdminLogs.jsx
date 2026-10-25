import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getAdminLogs, getModerationLogs } from '../services/adminService';

export default function AdminLogs() {
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' | 'moderation'
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');
      if (activeTab === 'admin') {
        const res = await getAdminLogs({ page, limit: 15 });
        setLogs(res.data || []);
      } else {
        const res = await getModerationLogs({ page, limit: 15 });
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, activeTab]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <AdminLayout activeTab="logs">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        
        {error && <div className="alert alert-error">{error}</div>}

        {/* Tab Toggle Header */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2.5px solid var(--ink)', paddingBottom: '8px' }}>
          <button
            onClick={() => { setActiveTab('admin'); setPage(1); }}
            className="btn"
            style={{
              background: activeTab === 'admin' ? 'var(--ink)' : 'transparent',
              color: activeTab === 'admin' ? 'var(--paper)' : 'var(--ink-soft)',
              border: activeTab === 'admin' ? '1.5px solid var(--ink)' : '1.5px solid var(--line-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: activeTab === 'admin' ? '700' : '500',
              cursor: 'pointer'
            }}
          >
            System Admin Logs
          </button>
          <button
            onClick={() => { setActiveTab('moderation'); setPage(1); }}
            className="btn"
            style={{
              background: activeTab === 'moderation' ? 'var(--ink)' : 'transparent',
              color: activeTab === 'moderation' ? 'var(--paper)' : 'var(--ink-soft)',
              border: activeTab === 'moderation' ? '1.5px solid var(--ink)' : '1.5px solid var(--line-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: activeTab === 'moderation' ? '700' : '500',
              cursor: 'pointer'
            }}
          >
            Moderation Action Logs
          </button>
        </div>

        {/* Logs Card */}
        <div className="card" style={{ background: '#fff', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: 'var(--space-3)' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'Fraunces, serif', margin: 0 }}>
              {activeTab === 'admin' ? 'Administrative Audit Trails' : 'Moderation Action History Logs'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: '4px 0 0' }}>
              {activeTab === 'admin'
                ? 'Comprehensive audit log of system operations performed by administrators.'
                : 'Detailed history of moderation actions (warnings, suspensions, bans, deletions, dismissals).'}
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'JetBrains Mono', color: 'var(--ink-soft)' }}>
              Loading audit records…
            </div>
          ) : (
            <div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2.5px solid var(--ink)', background: 'var(--paper)' }}>
                      <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>LOG ID</th>
                      <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>ADMIN</th>
                      <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>ACTION</th>
                      {activeTab === 'moderation' ? (
                        <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>AFFECTED USER</th>
                      ) : (
                        <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>RESOURCE REFERENCE</th>
                      )}
                      <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>REASON / DETAILS</th>
                      <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.log_id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          #{log.log_id}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: '600' }}>{log.admin?.name || log.admin_name || 'Admin'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--ink-faint)' }}>{log.admin?.email || log.admin_email}</div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              background: activeTab === 'moderation' ? 'var(--coral)' : 'var(--ink)',
                              color: '#fff',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              fontFamily: 'JetBrains Mono'
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        {activeTab === 'moderation' ? (
                          <td style={{ padding: '10px 12px', fontSize: '0.8rem' }}>
                            {log.affected_user_name ? (
                              <>
                                <strong>{log.affected_user_name}</strong>
                                <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)' }}>{log.affected_user_email}</div>
                              </>
                            ) : 'N/A'}
                          </td>
                        ) : (
                          <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                            {log.entity_type} <span style={{ color: 'var(--coral)', fontWeight: 'bold' }}>({log.entity_id})</span>
                          </td>
                        )}
                        <td style={{ padding: '10px 12px', color: 'var(--ink-soft)', maxWidth: '280px', wordBreak: 'break-word' }}>
                          {log.details || log.reason || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--ink-faint)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {formatDate(log.created_at)}
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                          No audit entries recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pager */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1.5px solid var(--line)' }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="btn btn-sm btn-outline"
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', fontFamily: 'JetBrains Mono' }}>
                  Page {page}
                </span>
                <button
                  disabled={logs.length < 15}
                  onClick={() => setPage(page + 1)}
                  className="btn btn-sm btn-outline"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
