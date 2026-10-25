import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NetworkTabs from '../components/NetworkTabs';
import ConnectionCard from '../components/ConnectionCard';
import RequestCard from '../components/RequestCard';
import UserCard from '../components/UserCard';
import {
  getConnections,
  getPendingRequests,
  getSentRequests,
  getSuggestions,
  searchUsers,
  getConnectionCount,
  getNetworkSummary
} from '../services/connectionService';
import { useAuth } from '../context/AuthContext';

const FILTER_OPTIONS = [
  { label: 'Name',       key: 'name'       },
  { label: 'Department', key: 'department' },
  { label: 'Skill',      key: 'skill'      },
];

export default function NetworkPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'connections' | 'pending' | 'sent' | 'suggestions'
  
  // Tab counts state
  const [counts, setCounts] = useState({
    discover: null,
    connections: null,
    pending: null,
    sent: null,
    suggestions: null
  });

  // Data cache
  const [cache, setCache] = useState({
    discover: null,
    connections: null,
    pending: null,
    sent: null,
    suggestions: null
  });

  // Loading & error states per tab
  const [loadingStates, setLoadingStates] = useState({
    discover: false,
    connections: false,
    pending: false,
    sent: false,
    suggestions: false
  });

  const [errors, setErrors] = useState({
    discover: null,
    connections: null,
    pending: null,
    sent: null,
    suggestions: null
  });

  // Search & sorting for My Connections
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // Search & filters for Discover tab
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverFilterBy, setDiscoverFilterBy] = useState('name');

  // Pagination for Connections
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 12;

  // Single tab loading function
  const triggerLoad = useCallback(async (tabName, forceQuery = undefined) => {
    setLoadingStates(prev => ({ ...prev, [tabName]: true }));
    setErrors(prev => ({ ...prev, [tabName]: null }));

    try {
      if (tabName === 'discover') {
        const queryVal = forceQuery !== undefined ? forceQuery : discoverQuery;
        const params = queryVal ? { [discoverFilterBy]: queryVal } : {};
        const { data } = await searchUsers(params);
        setCache(prev => ({ ...prev, discover: data }));
      } else if (tabName === 'connections') {
        const { data } = await getConnections({
          search: searchQuery.trim() || undefined,
          page: 1,
          limit: LIMIT,
          sort: sortOrder
        });
        setCache(prev => ({ ...prev, connections: data }));
        setHasMore(data.length === LIMIT);
        setPage(1);
      } else if (tabName === 'pending') {
        const { data } = await getPendingRequests();
        setCache(prev => ({ ...prev, pending: data }));
      } else if (tabName === 'sent') {
        const { data } = await getSentRequests();
        setCache(prev => ({ ...prev, sent: data }));
      } else if (tabName === 'suggestions') {
        const { data } = await getSuggestions();
        setCache(prev => ({ ...prev, suggestions: data }));
      }
    } catch (err) {
      console.error(`Failed to load tab ${tabName}:`, err);
      setErrors(prev => ({ ...prev, [tabName]: 'Unable to load network information.' }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [tabName]: false }));
    }
  }, [discoverQuery, discoverFilterBy, searchQuery, sortOrder, user]);

  const loadAllCounts = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      const res = await getNetworkSummary();
      setCounts({
        discover: res.data.discover_count,
        connections: res.data.connections_count,
        pending: res.data.pending_requests_count,
        sent: res.data.sent_requests_count,
        suggestions: res.data.suggested_count
      });
    } catch (err) {
      console.error('Failed to load network summary counts:', err);
    }
  }, [user]);

  // Load active tab on mount or tab change if not cached
  useEffect(() => {
    if (cache[activeTab] === null) {
      triggerLoad(activeTab);
    }
  }, [activeTab, triggerLoad]);

  // Load counts on mount or user identity change
  useEffect(() => {
    loadAllCounts();
  }, [loadAllCounts]);

  // Handle connection events & invalidate cache globally
  useEffect(() => {
    const handleConnectionsChanged = () => {
      setCache({
        discover: null,
        connections: null,
        pending: null,
        sent: null,
        suggestions: null
      });
      // Force reload the active tab
      triggerLoad(activeTab);
      // Refresh all counts
      loadAllCounts();
    };

    window.addEventListener('connections-changed', handleConnectionsChanged);
    return () => {
      window.removeEventListener('connections-changed', handleConnectionsChanged);
    };
  }, [activeTab, triggerLoad, loadAllCounts]);

  // Reload connections when search or sort options change
  useEffect(() => {
    if (activeTab === 'connections') {
      setCache(prev => ({ ...prev, connections: null }));
      triggerLoad('connections');
    }
  }, [searchQuery, sortOrder]);

  // Load more pagination for Connections
  const loadMoreConnections = async () => {
    const nextPage = page + 1;
    setLoadingStates(prev => ({ ...prev, connections: true }));
    try {
      const { data } = await getConnections({
        search: searchQuery.trim() || undefined,
        page: nextPage,
        limit: LIMIT,
        sort: sortOrder
      });
      setCache(prev => ({
        ...prev,
        connections: [...(prev.connections || []), ...data]
      }));
      setHasMore(data.length === LIMIT);
      setPage(nextPage);
    } catch (err) {
      console.error('Failed to load more connections:', err);
      alert('Failed to load more connections.');
    } finally {
      setLoadingStates(prev => ({ ...prev, connections: false }));
    }
  };

  const handleDiscoverSearch = (e) => {
    if (e) e.preventDefault();
    triggerLoad('discover');
  };

  const handleDiscoverClear = () => {
    setDiscoverQuery('');
    triggerLoad('discover', '');
  };

  const handleDiscoverFilterChange = (key) => {
    setDiscoverFilterBy(key);
    setDiscoverQuery('');
    triggerLoad('discover', '');
  };

  const tabError = errors[activeTab];
  const tabLoading = loadingStates[activeTab];
  const tabData = cache[activeTab];

  return (
    <div className="app-shell">
      <Sidebar active="network" subtitle="Network & Connections" />

      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.25rem', color: 'var(--ink)', flex: 1 }}>
            My Network
          </span>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          
          {/* Navigation Tabs */}
          <NetworkTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            badgeCounts={counts}
          />

          {/* Error Message with Retry Button */}
          {tabError ? (
            <div className="card fade-in" style={{ textAlign: 'center', padding: 'var(--space-8)', border: '1.5px solid var(--coral)' }}>
              <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', color: 'var(--coral)', marginBottom: 12 }}>
                {tabError}
              </p>
              <button onClick={() => triggerLoad(activeTab)} className="btn btn-primary btn-sm">
                Retry
              </button>
            </div>
          ) : tabLoading && (!tabData || page === 1) ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
              <div className="spinner spinner-ink" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
              <p className="eyebrow">Loading network info</p>
            </div>
          ) : (
            <div className="fade-in">
              
              {/* DISCOVER TAB */}
              {activeTab === 'discover' && tabData && (
                <div>
                  <div className="card" style={{ marginBottom: 'var(--space-4)', border: '1.5px solid var(--ink)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-2)' }}>
                      {FILTER_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => handleDiscoverFilterChange(opt.key)}
                          className={discoverFilterBy === opt.key ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                          style={{ borderRadius: 'var(--radius-pill)' }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleDiscoverSearch} style={{ display: 'flex', gap: 10 }}>
                      <input
                        type="text"
                        className="input"
                        placeholder={`Search by ${discoverFilterBy}…`}
                        value={discoverQuery}
                        onChange={e => setDiscoverQuery(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                        Search
                      </button>
                      {discoverQuery && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ flexShrink: 0 }}
                          onClick={handleDiscoverClear}
                        >
                          Clear
                        </button>
                      )}
                    </form>
                  </div>

                  {tabData.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                      <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                        No users found
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)' }}>
                        Try a different search term or filter.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                        <p className="eyebrow" style={{ color: 'var(--ink-soft)', margin: 0 }}>
                          {tabData.length} {tabData.length === 1 ? 'person' : 'people'} found
                        </p>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 'var(--space-3)'
                      }}>
                        {tabData.map(user => (
                          <UserCard key={user.user_id} user={user} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* CONNECTIONS TAB */}
              {activeTab === 'connections' && tabData && (
                <>
                  <div style={{
                    display: 'flex',
                    gap: 12,
                    marginBottom: 'var(--space-4)',
                    flexWrap: 'wrap'
                  }}>
                    <input
                      type="text"
                      placeholder="Search connections by name…"
                      className="input"
                      style={{ flex: 1, minWidth: 200 }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <select
                      className="input"
                      style={{ width: 160 }}
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                    >
                      <option value="newest">Recently Connected</option>
                      <option value="oldest">First Connected</option>
                    </select>
                  </div>

                  {tabData.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                      <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                        No connections found
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', marginBottom: 'var(--space-3)' }}>
                        Build your professional network on campus to start messaging other students and faculty.
                      </p>
                      <button onClick={() => setActiveTab('discover')} className="btn btn-primary btn-sm">
                        Find People to Connect
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: 'var(--space-3)'
                    }}>
                      {tabData.map(c => (
                        <ConnectionCard key={c.user_id} connection={c} />
                      ))}
                    </div>
                  )}

                  {hasMore && !tabLoading && tabData.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
                      <button
                        onClick={loadMoreConnections}
                        className="btn btn-outline btn-sm"
                      >
                        Load More
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* PENDING REQUESTS TAB */}
              {activeTab === 'pending' && tabData && (
                <>
                  {tabData.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                      <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                        No pending requests
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)' }}>
                        When people ask to connect with you, their requests will appear here.
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: 'var(--space-3)'
                    }}>
                      {tabData.map(p => (
                        <RequestCard key={p.request_id} request={p} type="incoming" />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* SENT REQUESTS TAB */}
              {activeTab === 'sent' && tabData && (
                <>
                  {tabData.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                      <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                        No sent requests
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)' }}>
                        Requests you send to other users will show up here until they accept or ignore them.
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: 'var(--space-3)'
                    }}>
                      {tabData.map(s => (
                        <RequestCard key={s.request_id} request={s} type="outgoing" />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* SUGGESTED CONNECTIONS TAB */}
              {activeTab === 'suggestions' && tabData && (
                <>
                  {tabData.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                      <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                        No suggestions available
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)' }}>
                        We couldn't find any suggestions for you right now. Try updating your profile description or adding skills!
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: 'var(--space-3)'
                    }}>
                      {tabData.map(s => (
                        <UserCard key={s.user_id} user={s} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
