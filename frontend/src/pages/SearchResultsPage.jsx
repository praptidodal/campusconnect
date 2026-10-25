import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ConnectionButton from '../components/ConnectionButton';
import NameWithVerification from '../components/NameWithVerification';
import {
  globalSearch,
  searchUsers,
  searchSkills,
  searchPosts,
  searchCommunities,
  searchEvents,
  searchCollaborations
} from '../services/searchService';
import api from '../services/api'; // for quick follow, join, register actions

const TABS = [
  { label: 'All', key: 'all' },
  { label: 'People', key: 'people' },
  { label: 'Skills', key: 'skills' },
  { label: 'Posts', key: 'posts' },
  { label: 'Communities', key: 'communities' },
  { label: 'Events', key: 'events' },
  { label: 'Collaborations', key: 'collaborations' }
];

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  // Redirect to dashboard if search query is empty
  useEffect(() => {
    if (!query.trim()) {
      navigate('/dashboard');
    }
  }, [query, navigate]);

  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tab-specific paginated list data
  const [results, setResults] = useState([]);
  const [globalResults, setGlobalResults] = useState(null); // structure matching global overview

  // Pagination states
  const [page, setPage] = useState(1);
  const LIMIT = 10;
  const [hasMore, setHasMore] = useState(true);

  // Filters & Sorting state
  const [filterRole, setFilterRole] = useState(''); // student, faculty, club
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // event/collaboration status
  const [sortBy, setSortBy] = useState(''); // name, followers, likes, registrations, deadline
  const [sortOrder, setSortOrder] = useState('desc');

  // Trigger loading when tab, query, pagination, filters, or sorting changes
  useEffect(() => {
    setPage(1);
    setResults([]);
    loadData(1, true);
  }, [query, activeTab, filterRole, filterCategory, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    if (page > 1) {
      loadData(page, false);
    }
  }, [page]);

  const loadData = async (currentPage, resetList) => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'all') {
        const res = await globalSearch(query);
        setGlobalResults(res.data);
        setHasMore(false);
      } else {
        let res;
        const params = { q: query, page: currentPage, limit: LIMIT };

        if (activeTab === 'people') {
          if (filterRole) params.role = filterRole;
          if (sortBy) {
            params.sort_by = sortBy;
            params.order = sortOrder;
          }
          res = await searchUsers(params);
        } else if (activeTab === 'skills') {
          res = await searchSkills(params);
        } else if (activeTab === 'posts') {
          if (sortBy) {
            params.sort_by = sortBy;
            params.order = sortOrder;
          }
          res = await searchPosts(params);
        } else if (activeTab === 'communities') {
          if (filterCategory) params.category = filterCategory;
          res = await searchCommunities(params);
        } else if (activeTab === 'events') {
          if (filterCategory) params.category = filterCategory;
          if (filterStatus) params.status = filterStatus;
          if (sortBy) {
            params.sort_by = sortBy;
            params.order = sortOrder;
          }
          res = await searchEvents(params);
        } else if (activeTab === 'collaborations') {
          if (filterStatus) params.status = filterStatus;
          if (sortBy) {
            params.sort_by = sortBy;
            params.order = sortOrder;
          }
          res = await searchCollaborations(params);
        }

        const dataList = res.data || [];
        setResults((prev) => (resetList ? dataList : [...prev, ...dataList]));
        setHasMore(dataList.length === LIMIT);
      }
    } catch (err) {
      setError('An error occurred while performing search.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Action: Follow User
  const handleFollowUser = async (userId, index, isGlobal = false) => {
    try {
      await api.post(`/follow/${userId}`);
      alert('Followed user successfully!');
      // Update local followers count dynamically
      if (isGlobal) {
        setGlobalResults(prev => {
          const updatedUsers = prev.users.map(u => 
            u.user_id === userId ? { ...u, followers_count: u.followers_count + 1 } : u
          );
          return { ...prev, users: updatedUsers };
        });
      } else {
        setResults(prev => prev.map(u => 
          u.user_id === userId ? { ...u, followers_count: u.followers_count + 1 } : u
        ));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to follow user.');
    }
  };

  // Quick Action: Join Community
  const handleJoinCommunity = async (commId, isGlobal = false) => {
    try {
      await api.post(`/communities/${commId}/join`);
      alert('Joined community successfully!');
      if (isGlobal) {
        setGlobalResults(prev => {
          const updated = prev.communities.map(c => 
            c.community_id === commId ? { ...c, member_count: c.member_count + 1 } : c
          );
          return { ...prev, communities: updated };
        });
      } else {
        setResults(prev => prev.map(c => 
          c.community_id === commId ? { ...c, member_count: c.member_count + 1 } : c
        ));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join community.');
    }
  };

  // Quick Action: Register for Event
  const handleRegisterEvent = async (eventId, isGlobal = false) => {
    try {
      await api.post(`/events/${eventId}/register`);
      alert('Registered for event successfully!');
      if (isGlobal) {
        setGlobalResults(prev => {
          const updated = prev.events.map(e => 
            e.event_id === eventId ? { ...e, registrations_count: e.registrations_count + 1 } : e
          );
          return { ...prev, events: updated };
        });
      } else {
        setResults(prev => prev.map(e => 
          e.event_id === eventId ? { ...e, registrations_count: e.registrations_count + 1 } : e
        ));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register.');
    }
  };

  // Reset Filters helper
  const handleResetFilters = () => {
    setFilterRole('');
    setFilterCategory('');
    setFilterStatus('');
    setSortBy('');
    setSortOrder('desc');
  };

  return (
    <div className="app-shell">
      <Sidebar active="" />
      
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)' }}>
            Search Results
          </span>
        </div>

        {/* Tab Controllers */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--ink)', background: 'var(--paper-raised)', overflowX: 'auto' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); handleResetFilters(); }}
              style={{
                background: activeTab === tab.key ? 'var(--quad-tint)' : 'none',
                border: 'none',
                borderRight: '1.5px solid var(--ink)',
                padding: '12px 24px',
                fontSize: '0.85rem',
                fontWeight: activeTab === tab.key ? 700 : 500,
                color: 'var(--ink)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 150ms ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 'var(--space-4)', display: 'grid', gridTemplateColumns: activeTab === 'all' || activeTab === 'skills' ? '1fr' : '220px 1fr', gap: 'var(--space-4)' }}>
          
          {/* Filters Sidebar (Hidden on 'All' and 'Skills' tabs) */}
          {activeTab !== 'all' && activeTab !== 'skills' && (
            <aside className="card pin-card" style={{ padding: 'var(--space-3)', height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ fontFamily: 'Fraunces, serif', fontSize: '0.95rem', fontWeight: 700 }}>Filters</h4>
                <button onClick={handleResetFilters} style={{ background: 'none', border: 'none', color: 'var(--coral)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  Reset
                </button>
              </div>

              {/* People Filters */}
              {activeTab === 'people' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Role</label>
                    <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ width: '100%', padding: '6px', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <option value="">All Roles</option>
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="club">Club / Org</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Sort By</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: '100%', padding: '6px', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <option value="">Default</option>
                      <option value="name">Name</option>
                      <option value="followers">Connections Count</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Posts Filters */}
              {activeTab === 'posts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Sort By</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: '100%', padding: '6px', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <option value="">Date Created</option>
                      <option value="likes">Like Count</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Communities Filters */}
              {activeTab === 'communities' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Category</label>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ width: '100%', padding: '6px', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <option value="">All Categories</option>
                      <option value="Clubs">Clubs</option>
                      <option value="Departments">Departments</option>
                      <option value="Interest Groups">Interest Groups</option>
                      <option value="Research Groups">Research Groups</option>
                      <option value="Event Teams">Event Teams</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Events Filters */}
              {activeTab === 'events' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Status</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: '100%', padding: '6px', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <option value="">All statuses</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Sort By</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: '100%', padding: '6px', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <option value="">Date</option>
                      <option value="registrations">Popularity</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Collaborations Filters */}
              {activeTab === 'collaborations' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Status</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: '100%', padding: '6px', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <option value="">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Sort By</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: '100%', padding: '6px', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <option value="">Date Created</option>
                      <option value="deadline">Deadline</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Sorting Order Toggle (Visible if SortBy is active) */}
              {sortBy && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Order</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className={`btn btn-sm ${sortOrder === 'asc' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSortOrder('asc')} style={{ flex: 1 }}>Asc</button>
                    <button className={`btn btn-sm ${sortOrder === 'desc' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSortOrder('desc')} style={{ flex: 1 }}>Desc</button>
                  </div>
                </div>
              )}
            </aside>
          )}

          {/* Results List Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', minWidth: 0 }}>
            {error && <div className="alert alert-error">{error}</div>}

            {loading && results.length === 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
                <p className="eyebrow">Searching database...</p>
              </div>
            )}

            {/* 1. Global Overview (Tab = All) */}
            {activeTab === 'all' && globalResults && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* People Overview */}
                {globalResults.users?.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', fontWeight: 700, borderBottom: '2.5px solid var(--ink)', paddingBottom: 6, marginBottom: 12 }}>People</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                      {globalResults.users.map((u, i) => (
                        <div key={u.user_id} className="card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                          <img src={u.profile_picture || '/static/default.png'} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--ink)' }} onError={e => e.target.src = '/static/default.png'} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 onClick={() => navigate(`/profile/${u.user_id}`)} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <NameWithVerification user={u} badgeSize={13} />
                            </h4>
                            <p style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{u.headline}</p>
                            <p style={{ fontSize: '0.65rem', color: 'var(--ink-faint)', marginTop: 2 }}>{u.connections_count} connections</p>
                          </div>
                          <ConnectionButton targetUserId={u.user_id} targetUserName={u.name} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Communities Overview */}
                {globalResults.communities?.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', fontWeight: 700, borderBottom: '2.5px solid var(--ink)', paddingBottom: 6, marginBottom: 12 }}>Communities</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                      {globalResults.communities.map(c => (
                        <div key={c.community_id} className="card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 onClick={() => navigate(`/communities/${c.community_id}`)} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>{c.community_name}</h4>
                            <p style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</p>
                            <span style={{ fontSize: '0.65rem', color: 'var(--ink-faint)', display: 'block', marginTop: 4 }}>{c.member_count} members</span>
                          </div>
                          <button className="btn btn-primary btn-sm" onClick={() => handleJoinCommunity(c.community_id, true)} style={{ padding: '4px 8px', fontSize: '0.65rem' }}>Join</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Events Overview */}
                {globalResults.events?.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', fontWeight: 700, borderBottom: '2.5px solid var(--ink)', paddingBottom: 6, marginBottom: 12 }}>Events</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                      {globalResults.events.map(e => (
                        <div key={e.event_id} className="card" style={{ padding: 12 }}>
                          <h4 onClick={() => navigate(`/events/${e.event_id}`)} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>{e.title}</h4>
                          <span className="role-badge role-student" style={{ fontSize: '0.55rem', marginTop: 4 }}>{e.category}</span>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--ink-faint)' }}>{e.registrations_count} attendees</span>
                            <button className="btn btn-outline btn-sm" onClick={() => handleRegisterEvent(e.event_id, true)} style={{ padding: '3px 6px', fontSize: '0.6rem' }}>Register</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collaborations Overview */}
                {globalResults.collaborations?.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', fontWeight: 700, borderBottom: '2.5px solid var(--ink)', paddingBottom: 6, marginBottom: 12 }}>Collaborations</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                      {globalResults.collaborations.map(col => (
                        <div key={col.collaboration_id} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', justify: 'space-between' }}>
                          <div>
                            <h4 onClick={() => navigate(`/collaborations/${col.collaboration_id}`)} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>{col.title}</h4>
                            <p style={{ fontSize: '0.65rem', color: 'var(--ink-soft)', marginTop: 4 }}>Skills: {col.required_skills}</p>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--ink-faint)' }}>Status: {col.status}</span>
                            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/collaborations/${col.collaboration_id}`)} style={{ padding: '3px 6px', fontSize: '0.6rem' }}>Apply</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* If nothing matches at all */}
                {(!globalResults.users?.length && !globalResults.communities?.length && !globalResults.events?.length && !globalResults.collaborations?.length && !globalResults.skills?.length && !globalResults.posts?.length) && (
                  <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                    <p style={{ color: 'var(--ink-soft)' }}>No items matched your search query.</p>
                  </div>
                )}

              </div>
            )}

            {/* 2. Specific Tabs View */}
            {activeTab !== 'all' && (
              <>
                {results.length === 0 ? (
                  !loading && (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                      <p style={{ color: 'var(--ink-soft)' }}>No results found.</p>
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    
                    {/* People List */}
                    {activeTab === 'people' && results.map((u, i) => (
                      <div key={u.user_id} className="card" style={{ padding: 'var(--space-3)', display: 'flex', gap: 16, alignItems: 'center' }}>
                        <img src={u.profile_picture || '/static/default.png'} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--ink)' }} onError={e => e.target.src = '/static/default.png'} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 onClick={() => navigate(`/profile/${u.user_id}`)} style={{ fontFamily: 'Fraunces, serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <NameWithVerification user={u} badgeSize={15} />
                          </h3>
                          <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{u.headline}</p>
                          
                          {/* Skills List */}
                          {u.skills?.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                              {u.skills.map(sk => (
                                <span key={sk} className="role-badge role-student" style={{ fontSize: '0.6rem' }}>{sk}</span>
                              ))}
                            </div>
                          )}
                          <p style={{ fontSize: '0.65rem', color: 'var(--ink-faint)', marginTop: 6 }}>{u.connections_count} connections</p>
                        </div>
                        <ConnectionButton targetUserId={u.user_id} targetUserName={u.name} />
                      </div>
                    ))}

                    {/* Skills List */}
                    {activeTab === 'skills' && results.map(sk => (
                      <div key={sk.skill_name} className="card pin-card" style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>{sk.skill_name}</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: 4 }}>Possessed by {sk.users_count} user(s)</p>
                          </div>
                        </div>

                        {/* Related Users */}
                        {sk.related_users?.length > 0 && (
                          <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                            <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-faint)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Classmates with this skill:</span>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {sk.related_users.map(ru => (
                                <div
                                  key={ru.user_id}
                                  onClick={() => navigate(`/profile/${ru.user_id}`)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-light)', padding: '4px 10px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--line)', cursor: 'pointer', transition: 'background 150ms ease' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--quad-tint)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-light)'}
                                >
                                  <img src={ru.profile_picture || '/static/default.png'} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{ru.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Posts List */}
                    {activeTab === 'posts' && results.map(p => (
                      <div key={p.post_id} className="card" style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <img src={p.author.profile_picture || '/static/default.png'} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--ink)' }} />
                          <span onClick={() => navigate(`/profile/${p.author.user_id}`)} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>{p.author.name}</span>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                          {p.content_preview}
                        </p>
                        <div style={{ display: 'flex', gap: 12, marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8, fontSize: '0.75rem', color: 'var(--ink-faint)' }}>
                          <span>{p.like_count} likes</span>
                          <span>{p.comment_count} comments</span>
                        </div>
                      </div>
                    ))}

                    {/* Communities List */}
                    {activeTab === 'communities' && results.map(c => (
                      <div key={c.community_id} className="card" style={{ padding: 'var(--space-3)', display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 onClick={() => navigate(`/communities/${c.community_id}`)} style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>{c.community_name}</h3>
                          <p style={{ fontSize: '0.825rem', color: 'var(--ink-soft)', marginTop: 4 }}>{c.description}</p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', display: 'block', marginTop: 8 }}>{c.member_count} member(s)</span>
                        </div>
                        <button className="btn btn-primary" onClick={() => handleJoinCommunity(c.community_id, false)}>Join</button>
                      </div>
                    ))}

                    {/* Events List */}
                    {activeTab === 'events' && results.map(e => (
                      <div key={e.event_id} className="card pin-card pin-marigold" style={{ padding: 'var(--space-3)', display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span className="role-badge role-club" style={{ fontSize: '0.55rem' }}>{e.category}</span>
                          <h3 onClick={() => navigate(`/events/${e.event_id}`)} style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', marginTop: 4, cursor: 'pointer' }}>{e.title}</h3>
                          <p style={{ fontSize: '0.725rem', color: 'var(--ink-soft)', marginTop: 4 }}>Date: {new Date(e.start_date).toLocaleString()}</p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', display: 'block', marginTop: 6 }}>{e.registrations_count} active attendee(s)</span>
                        </div>
                        <button className="btn btn-outline" onClick={() => handleRegisterEvent(e.event_id, false)}>Register</button>
                      </div>
                    ))}

                    {/* Collaborations List */}
                    {activeTab === 'collaborations' && results.map(col => (
                      <div key={col.collaboration_id} className="card" style={{ padding: 'var(--space-3)', display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 onClick={() => navigate(`/collaborations/${col.collaboration_id}`)} style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>{col.title}</h3>
                          <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: 4 }}>Required skills: <span style={{ fontWeight: 600 }}>{col.required_skills}</span></p>
                          {col.deadline && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', marginTop: 4 }}>Deadline: {new Date(col.deadline).toLocaleDateString()}</p>
                          )}
                        </div>
                        <button className="btn btn-primary" onClick={() => navigate(`/collaborations/${col.collaboration_id}`)}>Apply</button>
                      </div>
                    ))}

                  </div>
                )}

                {/* Load More Button */}
                {hasMore && (
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loading}
                    className="btn btn-outline btn-full"
                    style={{ marginTop: 8 }}
                  >
                    {loading ? 'Searching...' : 'Load More Results'}
                  </button>
                )}
              </>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}
