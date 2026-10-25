import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { getDashboardSummary, getReports, getAdminLogs, getUsers, getApprovalCounts } from '../services/adminService';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [approvalCounts, setApprovalCounts] = useState({ pending_communities: 0, pending_events: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, reportsRes, logsRes, usersRes, approvalRes] = await Promise.all([
        getDashboardSummary(),
        getReports('pending'),
        getAdminLogs({ page: 1, limit: 5 }),
        getUsers({ page: 1, limit: 5 }),
        getApprovalCounts(),
      ]);
      setStats(statsRes.data);
      setReports(reportsRes.data.slice(0, 5));
      setLogs(logsRes.data);
      setRecentUsers(usersRes.data);
      setApprovalCounts(approvalRes.data || { pending_communities: 0, pending_events: 0 });
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve administrative overview metrics. Please ensure your session is active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout activeTab="dashboard">
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--space-2)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <div style={{ fontFamily: 'JetBrains Mono', color: 'var(--ink-soft)' }}>Retrieving dashboard statistics...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Stats Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-2)' }}>
            
            {/* Users */}
            <div className="pin-card pin-sky" style={{ background: '#fff', border: '2px solid var(--ink)', padding: 'var(--space-2)' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Total Users</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Fraunces', margin: '4px 0' }}>{stats?.total_users || 0}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--sky)', fontWeight: '600' }}>+{stats?.new_registrations || 0} new this week</div>
            </div>

            {/* Reports */}
            <div className="pin-card pin-coral" style={{ background: '#fff', border: '2px solid var(--ink)', padding: 'var(--space-2)' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Pending Reports</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Fraunces', margin: '4px 0', color: stats?.pending_reports > 0 ? 'var(--coral)' : 'var(--ink)' }}>
                {stats?.pending_reports || 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)' }}>Requires review</div>
            </div>

            {/* Posts */}
            <div className="pin-card pin-marigold" style={{ background: '#fff', border: '2px solid var(--ink)', padding: 'var(--space-2)' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Total Posts</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Fraunces', margin: '4px 0' }}>{stats?.total_posts || 0}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)' }}>Social feed entries</div>
            </div>

            {/* Communities */}
            <div className="pin-card pin-quad" style={{ background: '#fff', border: '2px solid var(--ink)', padding: 'var(--space-2)' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Communities</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Fraunces', margin: '4px 0' }}>{stats?.total_communities || 0}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--quad-deep)' }}>Campus chapters</div>
            </div>

            {/* Collaborations */}
            <div className="pin-card" style={{ background: '#fff', border: '2px solid var(--ink)', padding: 'var(--space-2)' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Opportunities</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Fraunces', margin: '4px 0' }}>{stats?.total_collaborations || 0}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)' }}>Active project recruitments</div>
            </div>

            {/* Pending Approvals — Communities */}
            <div
              className="pin-card"
              onClick={() => navigate('/admin/approvals')}
              style={{ background: '#fff8e1', border: '2px solid #f59e0b', padding: 'var(--space-2)', cursor: 'pointer', transition: 'transform 0.1s' }}
              title="View pending communities"
            >
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', textTransform: 'uppercase', color: '#92400e' }}>Pending Communities</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Fraunces', margin: '4px 0', color: approvalCounts.pending_communities > 0 ? '#d97706' : 'var(--ink)' }}>
                {approvalCounts.pending_communities}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Awaiting review →</div>
            </div>

            {/* Pending Approvals — Events */}
            <div
              className="pin-card"
              onClick={() => navigate('/admin/approvals?tab=events')}
              style={{ background: '#eff6ff', border: '2px solid #3b82f6', padding: 'var(--space-2)', cursor: 'pointer', transition: 'transform 0.1s' }}
              title="View pending events"
            >
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', textTransform: 'uppercase', color: '#1d4ed8' }}>Pending Events</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Fraunces', margin: '4px 0', color: approvalCounts.pending_events > 0 ? '#3b82f6' : 'var(--ink)' }}>
                {approvalCounts.pending_events}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: '600' }}>Awaiting review →</div>
            </div>

          </div>

          {/* Detailed Lists Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-3)' }}>
            
            {/* Column 1: Pending reports queue */}
            <div className="card" style={{ background: '#fff', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Pending Reports ({reports.length})</h3>
                <button onClick={() => navigate('/admin/reports')} className="btn btn-sm btn-outline">View All</button>
              </div>

              {reports.length === 0 ? (
                <div style={{ padding: 'var(--space-3) 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                  No pending flags. Content is clear!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {reports.map((r) => (
                    <div key={r.report_id} style={{ padding: '10px', border: '1.5px solid var(--line-strong)', borderRadius: 'var(--radius-md)', background: 'var(--paper)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', background: 'var(--coral-tint)', color: 'var(--coral)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--coral)', textTransform: 'uppercase' }}>
                          {r.content_type}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--ink-faint)' }}>{formatDate(r.created_at)}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--ink)' }}>Reason: {r.reason || 'Not specified'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: '2px', wordBreak: 'break-all' }}>Target: {r.content_preview}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Recent User Registrations */}
            <div className="card" style={{ background: '#fff', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Recent Registrations</h3>
                <button onClick={() => navigate('/admin/users')} className="btn btn-sm btn-outline">View All</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentUsers.slice(0, 5).map((u) => (
                  <div key={u.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>{u.email}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`role-badge role-${u.role}`}>{u.role}</span>
                      <span className={`status-badge status-${u.status}`}>{u.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Audit Logs Row */}
          <div className="card" style={{ background: '#fff', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Recent Activity Logs</h3>
              <button onClick={() => navigate('/admin/logs')} className="btn btn-sm btn-outline">All Logs</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2.5px solid var(--ink)', background: 'var(--paper)' }}>
                    <th style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>ADMIN</th>
                    <th style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>ACTION</th>
                    <th style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>TARGET</th>
                    <th style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>DETAILS</th>
                    <th style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 5).map((log) => (
                    <tr key={log.log_id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '600' }}>{log.admin?.name || 'Admin'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ background: 'var(--paper)', border: '1px solid var(--line-strong)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem' }}>
                        {log.entity_type} ({log.entity_id})
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--ink-soft)' }}>{log.details}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--ink-faint)', fontSize: '0.75rem' }}>{formatDate(log.created_at)}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: 'var(--ink-soft)' }}>No logs compiled.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </AdminLayout>
  );
}
