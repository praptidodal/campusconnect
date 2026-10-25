import React from 'react';

export default function SearchSuggestions({
  query,
  recent,
  trendingSkills,
  suggestions,
  loadingSuggestions,
  onSelectRecent,
  onSelectTrending,
  onSelectSuggestion,
  onClearHistory
}) {
  const hasRecent = recent && recent.length > 0;
  const hasTrending = trendingSkills && trendingSkills.length > 0;
  const hasSuggestions = suggestions && (
    (suggestions.users && suggestions.users.length > 0) ||
    (suggestions.skills && suggestions.skills.length > 0) ||
    (suggestions.communities && suggestions.communities.length > 0)
  );

  return (
    <div style={{
      position: 'absolute',
      left: 0,
      top: '100%',
      marginTop: 8,
      width: 280,
      background: '#fff',
      border: '1.5px solid var(--ink)',
      borderRadius: 'var(--radius-md)',
      boxShadow: '4px 4px 0 var(--ink)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 'min(380px, 60vh)',
      overflowY: 'auto',
      animation: 'star-pop 180ms ease'
    }}>
      {/* 1. Loading active suggestions */}
      {query.trim() !== '' && loadingSuggestions && (
        <div style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--ink-faint)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="spinner spinner-ink" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
          <span>Searching suggestions...</span>
        </div>
      )}

      {/* 2. Active search suggestions list (when typing) */}
      {query.trim() !== '' && !loadingSuggestions && (
        <>
          {!hasSuggestions ? (
            <div style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--ink-faint)', fontSize: '0.75rem' }}>
              No matches found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Users */}
              {suggestions.users && suggestions.users.length > 0 && (
                <div style={{ borderBottom: '1px solid var(--line)' }}>
                  <div style={{ padding: '4px 12px', fontSize: '0.625rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-faint)', textTransform: 'uppercase', background: 'var(--bg-light)' }}>
                    People
                  </div>
                  {suggestions.users.map(u => (
                    <div
                      key={u.user_id}
                      onClick={() => onSelectSuggestion('user', u.user_id)}
                      style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'background 150ms ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--quad-tint)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {u.profile_picture ? (
                        <img src={u.profile_picture} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--ink)' }} />
                      ) : (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--line-strong)', border: '1px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.name}
                        </div>
                        {u.headline && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.headline}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Communities */}
              {suggestions.communities && suggestions.communities.length > 0 && (
                <div style={{ borderBottom: '1px solid var(--line)' }}>
                  <div style={{ padding: '4px 12px', fontSize: '0.625rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-faint)', textTransform: 'uppercase', background: 'var(--bg-light)' }}>
                    Communities
                  </div>
                  {suggestions.communities.map(c => (
                    <div
                      key={c.community_id}
                      onClick={() => onSelectSuggestion('community', c.community_id)}
                      style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'background 150ms ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--quad-tint)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {c.logo_url ? (
                        <img src={c.logo_url} alt="" style={{ width: 20, height: 20, borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--ink)' }} />
                      ) : (
                        <div style={{ width: 20, height: 20, borderRadius: 'var(--radius-sm)', background: 'var(--marigold-tint)', border: '1px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.community_name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Skills */}
              {suggestions.skills && suggestions.skills.length > 0 && (
                <div>
                  <div style={{ padding: '4px 12px', fontSize: '0.625rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-faint)', textTransform: 'uppercase', background: 'var(--bg-light)' }}>
                    Skills
                  </div>
                  {suggestions.skills.map(sk => (
                    <div
                      key={sk.skill_name}
                      onClick={() => onSelectSuggestion('skill', sk.skill_name)}
                      style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'background 150ms ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--quad-tint)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--ink-faint)', flexShrink: 0 }}>
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sk.skill_name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 3. Recent searches (when search input is empty) */}
      {query.trim() === '' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {hasRecent && (
            <div style={{ borderBottom: '1px solid var(--line)' }}>
              <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-light)' }}>
                <span style={{ fontSize: '0.625rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>
                  Recent Searches
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onClearHistory(); }}
                  style={{ background: 'none', border: 'none', color: 'var(--coral)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Clear All
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recent.map(h => (
                  <div
                    key={h.search_id}
                    onClick={() => onSelectRecent(h.search_query)}
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'background 150ms ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-light)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--ink-faint)', flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.search_query}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Trending skills section */}
          {hasTrending && (
            <div>
              <div style={{ padding: '6px 12px', background: 'var(--bg-light)' }}>
                <span style={{ fontSize: '0.625rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>
                  Trending Skills
                </span>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {trendingSkills.map(ts => (
                  <button
                    key={ts.skill_name}
                    onClick={() => onSelectTrending(ts.skill_name)}
                    className="role-badge role-student"
                    style={{
                      border: '1px solid var(--ink)',
                      borderRadius: 'var(--radius-pill)',
                      padding: '3px 8px',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: '#fff',
                      color: 'var(--ink)',
                      transition: 'transform 100ms ease, background 150ms ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.background = 'var(--quad-tint)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.background = '#fff';
                    }}
                  >
                    {ts.skill_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasRecent && !hasTrending && (
            <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: '0.75rem' }}>
              Search for users, posts, clubs, events, and collaborations!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
