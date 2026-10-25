import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import UserCard from '../components/UserCard';
import { searchUsers } from '../services/connectionService';

const FILTER_OPTIONS = [
  { label: 'Name',       key: 'name'       },
  { label: 'Department', key: 'department' },
  { label: 'Skill',      key: 'skill'      },
];

export default function DiscoveryPage() {
  const location = useLocation();
  const isStudentDirectory = location.pathname === '/teacher/students';
  const [filterBy, setFilterBy]   = useState('name');
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searched, setSearched]   = useState(false);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const params = q ? { [filterBy]: q } : {};
      const { data } = await searchUsers(params);
      setResults(data);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filterBy]);

  // Load all users on mount
  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    load(query.trim());
  };

  const handleFilterChange = (key) => {
    setFilterBy(key);
    setQuery('');
    // Re-load without query when filter changes
    setLoading(true);
    searchUsers({}).then(({ data }) => setResults(data)).finally(() => setLoading(false));
  };

  return (
    <div className="app-shell">
      <Sidebar active={isStudentDirectory ? 'teacher-students' : 'discover'} subtitle={isStudentDirectory ? 'Student Directory' : 'Flow 3 — Discover'} />

      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1 }}>
            {isStudentDirectory ? 'Student Directory' : 'Discover people'}
          </span>
        </div>

        <div style={{ padding: 'var(--space-3) var(--space-4)' }}>

          {/* Search card */}
          <div className="card fade-in" style={{ marginBottom: 'var(--space-4)' }}>
            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-2)' }}>
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleFilterChange(opt.key)}
                  className={filterBy === opt.key ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                  style={{ borderRadius: 'var(--radius-pill)' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Search form */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                className="input"
                placeholder={`Search by ${filterBy}…`}
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                Search
              </button>
              {query && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flexShrink: 0 }}
                  onClick={() => { setQuery(''); load(); }}
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Results */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
              <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
              <p className="eyebrow">Loading people</p>
            </div>
          ) : (() => {
            const displayedResults = isStudentDirectory ? results.filter(u => u.role === 'student') : results;
            if (displayedResults.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                    No users found
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)' }}>
                    Try a different search term or filter.
                  </p>
                </div>
              );
            }
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <p className="eyebrow">{displayedResults.length} {displayedResults.length === 1 ? 'person' : 'people'} found</p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 'var(--space-3)',
                }}>
                  {displayedResults.map(user => (
                    <UserCard key={user.user_id} user={user} />
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
