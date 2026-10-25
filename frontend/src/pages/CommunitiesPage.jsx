import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getCommunities, searchCommunities, joinCommunity, leaveCommunity, getMyCommunities } from '../services/communityService';
import { useAuth } from '../context/AuthContext';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export default function CommunitiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const CATEGORIES = [
    'All Categories',
    'Technology',
    'Clubs',
    'Departments',
    'Interest Groups',
    'Research Groups',
    'Event Teams',
  ];

  const [myCommunities, setMyCommunities] = useState([]);

  const fetchMyCommunities = async () => {
    try {
      const res = await getMyCommunities();
      // Only show non-approved (pending/rejected) ones here as a heads-up banner
      setMyCommunities((res.data || []).filter(c => c.approval_status !== 'approved'));
    } catch {
      // silently fail — not critical
    }
  };

  const fetchCommunities = async (name = '', category = '') => {
    setLoading(true);
    try {
      const activeCategory = category === 'All Categories' ? '' : category;
      let res;
      if (name || activeCategory) {
        res = await searchCommunities({ name, category: activeCategory });
      } else {
        res = await getCommunities();
      }
      setCommunities(res.data);
    } catch {
      setError('Failed to load communities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
    fetchMyCommunities();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCommunities(searchName, searchCategory);
  };

  const handleCategoryChange = (cat) => {
    setSearchCategory(cat);
    fetchCommunities(searchName, cat);
  };

  const handleJoinToggle = async (commId, isJoined, role) => {
    setActionError('');
    setActionLoading(prev => ({ ...prev, [commId]: true }));
    try {
      if (isJoined) {
        if (role === 'owner') {
          setActionError('As owner, you cannot leave until you transfer ownership to someone else in the Members tab.');
          return;
        }
        await leaveCommunity(commId);
        setCommunities(prev =>
          prev.map(c =>
            c.community_id === commId
              ? { ...c, is_joined: false, role: null, member_count: Math.max(0, c.member_count - 1) }
              : c
          )
        );
      } else {
        await joinCommunity(commId);
        setCommunities(prev =>
          prev.map(c =>
            c.community_id === commId
              ? { ...c, is_joined: true, role: 'member', member_count: c.member_count + 1 }
              : c
          )
        );
      }
    } catch (err) {
      setActionError(err.response?.data?.detail?.message || 'Action failed.');
    } finally {
      setActionLoading(prev => ({ ...prev, [commId]: false }));
    }
  };

  return (
    <div className="app-shell">
      <Sidebar active="communities" subtitle="Browse Communities" />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1 }}>
            Campus Communities
          </span>
          {(user?.role === 'club' || user?.role === 'admin') && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/communities/create')}
            >
              Create community
            </button>
          )}
        </div>

        <div style={{ padding: 'var(--space-4)' }}>
          {actionError && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>
              {actionError}
            </div>
          )}
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
            <input
              type="text"
              className="input"
              placeholder="Search by community name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <button type="submit" className="btn btn-outline" style={{ minWidth: 100 }}>
              Search
            </button>
          </form>

          {/* Categories bar */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 'var(--space-4)' }}>
            {CATEGORIES.map(cat => {
              const isActive = (cat === 'All Categories' && !searchCategory) || searchCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`tag ${isActive ? 'tag-quad' : 'tag-clickable'}`}
                  style={{ whiteSpace: 'nowrap', borderStyle: isActive ? 'solid' : 'dashed' }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* ── Pending/Rejected Communities Banner (only visible to creator) ── */}
          {myCommunities.length > 0 && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '0.85rem', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: '8px' }}>
                Your Pending Communities
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myCommunities.map(c => (
                  <div key={c.community_id} style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: c.approval_status === 'pending' ? '1.5px solid #f59e0b' : '1.5px solid var(--coral)',
                    background: c.approval_status === 'pending' ? '#fffbea' : '#fff1f2',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                  }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {c.community_name}
                        <span style={{
                          fontSize: '0.6rem', fontFamily: 'JetBrains Mono', fontWeight: 700, textTransform: 'uppercase',
                          padding: '2px 8px', borderRadius: '4px',
                          background: c.approval_status === 'pending' ? '#fff8e1' : '#fff1f2',
                          color: c.approval_status === 'pending' ? '#d97706' : '#e11d48',
                          border: `1px solid ${c.approval_status === 'pending' ? '#f59e0b' : '#fda4af'}`,
                        }}>
                          {c.approval_status === 'pending' ? '⏳ Pending Approval' : '✕ Not Approved'}
                        </span>
                      </div>
                      {c.approval_notes && (
                        <div style={{ fontSize: '0.78rem', color: '#92400e', marginTop: '4px' }}>
                          <strong>Notes:</strong> {c.approval_notes}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => navigate(`/communities/${c.community_id}`)}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
              <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
              <p className="eyebrow">Loading communities</p>
            </div>
          ) : (
            <>
              {communities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: 'var(--paper-raised)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--line)' }}>
                  <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                    No communities found
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', marginBottom: 'var(--space-3)' }}>
                    Try searching for another keyword or category, or create your own!
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/communities/create')}>
                    Create community
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
                  {communities.map(comm => (
                    <div key={comm.community_id} className="card fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                      <div>
                        {/* Header */}
                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                          {comm.logo_url ? (
                            <img
                              src={comm.logo_url}
                              alt={comm.community_name}
                              className="avatar"
                              style={{ width: 44, height: 44, objectFit: 'cover' }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="avatar" style={{ width: 44, height: 44, fontSize: '0.9rem' }}>
                              {initials(comm.community_name)}
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <h3
                              onClick={() => navigate(`/communities/${comm.community_id}`)}
                              className="hover:underline"
                              style={{ fontFamily: 'Fraunces, serif', fontSize: '1.1rem', fontWeight: 650, color: 'var(--ink)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {comm.community_name}
                            </h3>
                            <span className="role-badge role-student" style={{ fontSize: '0.65rem' }}>
                              {comm.category || 'General'}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 'var(--space-3)' }}>
                          {comm.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Footer */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--line-strong)' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--ink-faint)' }}>
                          {comm.member_count} {comm.member_count === 1 ? 'member' : 'members'}
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => navigate(`/communities/${comm.community_id}`)}
                            className="btn btn-outline btn-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleJoinToggle(comm.community_id, comm.is_joined, comm.role)}
                            disabled={actionLoading[comm.community_id]}
                            className={`btn btn-sm ${comm.is_joined ? 'btn-outline' : 'btn-primary'}`}
                            style={{ minWidth: 70 }}
                          >
                            {actionLoading[comm.community_id] ? '…' : comm.is_joined ? 'Leave' : 'Join'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
