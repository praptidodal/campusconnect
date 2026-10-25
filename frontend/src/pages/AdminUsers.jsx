import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import NameWithVerification from '../components/NameWithVerification';
import { getUsers, updateUserRole, updateUserStatus } from '../services/adminService';
import { getPendingTeachers, approveTeacher, rejectTeacher } from '../services/noticeService';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadPending = async () => {
    try {
      const res = await getPendingTeachers();
      setPendingTeachers(res.data || []);
    } catch (err) {
      console.error('Failed to load pending teachers:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers({
        page,
        limit: 10,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setUsers(res.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load user directories. Please check authorization policies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadPending();
  }, [page, roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setError('');
      setMessage('');
      await updateUserRole(userId, newRole);
      setMessage(`Successfully updated user role to ${newRole}`);
      loadUsers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to modify role.');
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      setError('');
      setMessage('');
      await updateUserStatus(userId, newStatus);
      setMessage(`Successfully changed user status to ${newStatus}`);
      loadUsers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleApproveTeacher = async (userId) => {
    try {
      setError('');
      setMessage('');
      await approveTeacher(userId);
      setMessage('Teacher account approved successfully.');
      loadPending();
      loadUsers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to approve teacher.');
    }
  };

  const handleRejectTeacher = async (userId) => {
    try {
      setError('');
      setMessage('');
      await rejectTeacher(userId);
      setMessage('Teacher account registration rejected.');
      loadPending();
      loadUsers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to reject teacher.');
    }
  };

  return (
    <AdminLayout activeTab="users">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        
        {/* Banner Messages */}
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {/* Pending Teacher Approvals Section */}
        {pendingTeachers.length > 0 && (
          <div className="card" style={{
            background: '#eff6ff',
            border: '2px solid #2563eb',
            boxShadow: '4px 4px 0 #2563eb',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-2)'
          }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Pending Teacher Approvals ({pendingTeachers.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingTeachers.map(t => (
                <div key={t.user_id} className="card" style={{
                  background: '#fff',
                  border: '1.5px solid var(--ink)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>
                        <NameWithVerification user={{ ...t, role: 'faculty' }} />
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{t.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ background: '#2563eb', border: '1.5px solid #2563eb' }}
                        onClick={() => handleApproveTeacher(t.user_id)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--coral)', border: '1.5px solid var(--coral)' }}
                        onClick={() => handleRejectTeacher(t.user_id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '8px 16px',
                    fontSize: '0.8rem',
                    color: 'var(--ink-soft)',
                    borderTop: '1px dashed var(--line)',
                    paddingTop: '8px',
                    marginTop: '4px'
                  }}>
                    {t.department && <div><strong>Dept:</strong> {t.department}</div>}
                    {t.designation && <div><strong>Role:</strong> {t.designation}</div>}
                    {t.employee_id && <div><strong>Emp ID:</strong> {t.employee_id}</div>}
                    {t.office_location && <div><strong>Office:</strong> {t.office_location}</div>}
                    {t.office_hours && <div><strong>Hours:</strong> {t.office_hours}</div>}
                    <div><strong>Registered:</strong> {formatDate(t.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Controls Row */}
        <div className="card" style={{ background: '#fff', border: '2px solid var(--ink)', padding: 'var(--space-2)' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            
            {/* Text Search */}
            <div style={{ flex: '2', minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                style={{ padding: '8px 12px' }}
              />
            </div>

            {/* Role Filter */}
            <div style={{ flex: '1', minWidth: '120px' }}>
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="input"
                style={{ padding: '8px 12px' }}
              >
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="club">Club</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ flex: '1', minWidth: '120px' }}>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="input"
                style={{ padding: '8px 12px' }}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>
            </div>

            {/* Submit search */}
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
              Search
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="card" style={{ background: '#fff', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: 'var(--space-3)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'JetBrains Mono', color: 'var(--ink-soft)' }}>
              Loading user registry...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2.5px solid var(--ink)', background: 'var(--paper)' }}>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>USER</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>DEPARTMENT / STUDY</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>ROLE</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>STATUS</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>JOINED</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id} style={{ borderBottom: '1px solid var(--line)' }}>
                      
                      {/* Name & Avatar */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {u.profile?.profile_picture ? (
                            <img
                              src={u.profile.profile_picture}
                              alt=""
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--ink)' }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div 
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                background: 'var(--marigold)', 
                                color: 'var(--ink)', 
                                border: '1px solid var(--ink)', 
                                fontWeight: 'bold', 
                                fontSize: '0.8rem',
                                flexShrink: 0
                              }}
                            >
                              {getInitials(u.name)}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: '600' }}>
                              <NameWithVerification user={u} />
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Profile details */}
                      <td style={{ padding: '10px 12px', color: 'var(--ink-soft)' }}>
                        {u.profile?.department ? (
                          <div>
                            <div>{u.profile.department}</div>
                            {u.profile.year_of_study && <div style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>Year: {u.profile.year_of_study}</div>}
                            {u.profile.designation && <div style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>{u.profile.designation}</div>}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>No profile details</span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`role-badge role-${u.role}`}>{u.role}</span>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`status-badge status-${u.status}`}>{u.status}</span>
                      </td>

                      {/* Date Joined */}
                      <td style={{ padding: '10px 12px', color: 'var(--ink-soft)', fontSize: '0.8rem' }}>
                        {formatDate(u.created_at)}
                      </td>

                      {/* Operations */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                          
                          {/* Role Selection Dropdown */}
                          <div>
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line-strong)', fontSize: '0.75rem', background: '#fff' }}
                            >
                              <option value="student">Student</option>
                              <option value="faculty">Faculty</option>
                              <option value="club">Club</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>

                          {/* Action toggle buttons */}
                          {u.status === 'active' ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => handleStatusChange(u.user_id, 'suspended')}
                                className="btn btn-sm btn-ghost"
                                style={{ color: 'var(--marigold-deep)', padding: '3px 8px', fontSize: '0.7rem' }}
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => handleStatusChange(u.user_id, 'banned')}
                                className="btn btn-sm btn-danger"
                                style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                              >
                                Ban
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(u.user_id, 'active')}
                              className="btn btn-sm btn-outline"
                              style={{ padding: '3px 8px', fontSize: '0.7rem', color: 'var(--quad)' }}
                            >
                              Activate
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                        No users match the search parameters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
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
              disabled={users.length < 10}
              onClick={() => setPage(page + 1)}
              className="btn btn-sm btn-outline"
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
