import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import SearchSuggestions from './SearchSuggestions';
import MessageDropdown from './MessageDropdown';
import { Megaphone, Menu, X, Home, Users, Compass, Calendar, MoreHorizontal } from 'lucide-react';
import {
  getRecentSearches,
  clearRecentSearches,
  getTrending,
  globalSearch
} from '../services/searchService';


function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

const NAV_ITEMS = [
  { label: 'Dashboard',   key: 'dashboard',  path: '/dashboard',      disabled: false },
  { label: 'Network',     key: 'network',    path: '/network',        disabled: false },
  { label: 'Communities', key: 'communities',path: '/communities',    disabled: false },
  { label: 'Events',      key: 'events',     path: '/events',         disabled: false },
  { label: 'Collaborate', key: 'collaborate',path: '/collaborations', disabled: false },
  { label: 'Resources',   key: 'resources',  path: '/resources',      disabled: false },
];

export default function Sidebar({ active }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, profilePicture } = useAuth();

  // Mobile navigation drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Search state
  const [searchQuery, setSearchQuery]           = useState('');
  const [recent, setRecent]                     = useState([]);
  const [trendingSkills, setTrendingSkills]     = useState([]);
  const [suggestions, setSuggestions]           = useState({ users: [], skills: [], communities: [] });
  const [showSuggestions, setShowSuggestions]   = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchContainerRef                      = useRef(null);

  // Hover state for sidebar-user card
  const [userCardHovered, setUserCardHovered] = useState(false);

  // Load recent searches and trending skills when suggestions overlay opens
  const loadSuggestionsData = async () => {
    try {
      const recentRes = await getRecentSearches();
      setRecent(recentRes.data || []);
      const trendingRes = await getTrending();
      setTrendingSkills(trendingRes.data?.skills || []);
    } catch (err) {
      console.error('Failed to load suggestion prerequisites', err);
    }
  };

  useEffect(() => {
    if (showSuggestions) {
      loadSuggestionsData();
    }
  }, [showSuggestions]);

  // Click outside and Escape key listener to dismiss suggestions
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Debounced search autocomplete trigger
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions({ users: [], skills: [], communities: [] });
      return;
    }
    setLoadingSuggestions(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await globalSearch(searchQuery, true);
        setSuggestions({
          users:       res.data?.users       || [],
          skills:      res.data?.skills      || [],
          communities: res.data?.communities || []
        });
      } catch (err) {
        console.error('Autocompletion retrieval failure', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSelectRecent = (q) => {
    setSearchQuery(q);
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleSelectTrending = (skill) => {
    setSearchQuery(skill);
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(skill)}`);
  };

  const handleClearHistory = async () => {
    try {
      await clearRecentSearches();
      setRecent([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectSuggestion = (type, idOrName) => {
    setShowSuggestions(false);
    setSearchQuery('');
    if (type === 'user') {
      navigate(`/profile/${idOrName}`);
    } else if (type === 'community') {
      navigate(`/communities/${idOrName}`);
    } else if (type === 'skill') {
      navigate(`/search?q=${encodeURIComponent(idOrName)}`);
    }
  };

  const isProfileActive = active === 'profile';

  return (
    <>
      {/* Mobile Top Header Bar (< 960px) */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open Navigation Menu"
          >
            <Menu size={22} />
          </button>
          <span
            className="mobile-brand-title"
            onClick={() => navigate('/dashboard')}
            style={{ cursor: 'pointer' }}
          >
            CampusConnect
          </span>
        </div>

        <div className="mobile-header-actions">
          <MessageDropdown />
          <NotificationBell />
          <button
            type="button"
            className="mobile-avatar-btn"
            onClick={() => navigate('/profile')}
            title="My Profile"
          >
            {profilePicture ? (
              <img src={profilePicture} alt={user?.name} className="avatar-sm" />
            ) : (
              <div className="avatar-sm">{initials(user?.name)}</div>
            )}
          </button>
        </div>
      </header>

      {/* Backdrop overlay for off-canvas mobile drawer */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation drawer"
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand" style={{ paddingRight: 'var(--space-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="sidebar-brand-name">CampusConnect</div>
            <div className="sidebar-brand-sub">MIT-WPU Campus</div>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close Navigation Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} ref={searchContainerRef} style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1.5px solid var(--line)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-pill)', padding: '5px 12px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6, color: 'var(--ink-faint)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search CC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.8rem', color: 'var(--ink)', width: '100%', padding: 0 }}
            />
          </div>

          {showSuggestions && (
            <SearchSuggestions
              query={searchQuery}
              recent={recent}
              trendingSkills={trendingSkills}
              suggestions={suggestions}
              loadingSuggestions={loadingSuggestions}
              onSelectRecent={handleSelectRecent}
              onSelectTrending={handleSelectTrending}
              onSelectSuggestion={handleSelectSuggestion}
              onClearHistory={handleClearHistory}
            />
          )}
        </form>

        {/* Navigation Links */}
        <nav className="sidebar-nav" style={{ flex: 1 }}>
          {(() => {
            const navItems = [...NAV_ITEMS];
            if (user?.role === 'admin') {
              navItems.push({ label: 'Admin Panel', key: 'admin', path: '/admin', disabled: false });
            }
            if (user?.role === 'admin' || user?.role === 'faculty') {
              navItems.push({ label: 'Analytics', key: 'analytics', path: '/analytics', disabled: false });
            }

            return navItems.map(item => (
              <button
                key={item.key}
                className={[
                  'nav-item',
                  active === item.key ? 'active' : '',
                  item.disabled ? 'disabled' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  if (item.path) {
                    navigate(item.path);
                    setMobileOpen(false);
                  }
                }}
                title={item.disabled ? 'Coming soon' : undefined}
              >
                {item.label}
              </button>
            ));
          })()}

          {/* Teacher Tools Section — only for faculty */}
          {user?.role === 'faculty' && (
            <>
              <div style={{
                padding: '10px var(--space-3) 4px',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--ink-faint)',
                borderTop: '1.5px solid var(--line)',
                marginTop: 'var(--space-2)',
              }}>
                Faculty Tools
              </div>
              {[
                { label: 'My Dashboard',      key: 'teacher',           path: '/teacher', icon: 'dashboard' },
                ...(user?.is_verified ? [
                  { label: 'Official Notices',   key: 'teacher-notices',   path: '/teacher/notices', icon: 'notices' },
                  { label: 'Faculty Directory', key: 'teacher-directory', path: '/teacher/directory', icon: 'faculty' },
                  { label: 'Student Directory',  key: 'teacher-students',  path: '/teacher/students', icon: 'students' },
                ] : []),
              ].map(item => {
                let iconSvg = null;
                if (item.icon === 'dashboard') {
                  iconSvg = (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8, flexShrink: 0 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                      <line x1="15" y1="3" x2="15" y2="21" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="3" y1="15" x2="21" y2="15" />
                    </svg>
                  );
                } else if (item.icon === 'notices') {
                  iconSvg = (
                    <Megaphone size={14} style={{ marginRight: 8, flexShrink: 0 }} />
                  );
                } else if (item.icon === 'faculty') {
                  iconSvg = (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8, flexShrink: 0 }}>
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                    </svg>
                  );
                } else if (item.icon === 'students') {
                  iconSvg = (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8, flexShrink: 0 }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  );
                }

                return (
                  <button
                    key={item.key}
                    className={['nav-item', active === item.key ? 'active' : ''].filter(Boolean).join(' ')}
                    onClick={() => {
                      navigate(item.path);
                      setMobileOpen(false);
                    }}
                    style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}
                  >
                    {iconSvg}
                    {item.label}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* User Profile Summary — clickable, navigates to /profile */}
        <div
          className="sidebar-user"
          onClick={() => {
            navigate('/profile');
            setMobileOpen(false);
          }}
          onMouseEnter={() => setUserCardHovered(true)}
          onMouseLeave={() => setUserCardHovered(false)}
          title="Go to my profile"
          style={{
            cursor: 'pointer',
            background: isProfileActive || userCardHovered
              ? 'var(--quad-tint)'
              : 'transparent',
            borderTop: '1.5px solid var(--line)',
            borderBottom: 'none',
            transition: 'background 0.15s ease',
          }}
        >
          {/* Avatar: shows profile picture if available, else initials */}
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={user?.name}
              className="avatar"
              style={{ flexShrink: 0, objectFit: 'cover' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="avatar" style={{ flexShrink: 0 }}>
              {initials(user?.name)}
            </div>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              className="sidebar-user-name"
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {user?.name}
            </div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>

          {/* Subtle chevron to indicate it's clickable */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ink-faint)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, opacity: userCardHovered || isProfileActive ? 1 : 0.4, transition: 'opacity 0.15s ease' }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>

        {/* Sign Out Footer */}
        <div className="sidebar-footer" style={{ borderTop: 'none' }}>
          <button
            className="nav-item"
            style={{ color: 'var(--coral)', width: '100%', margin: 0 }}
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Global Floating Header Actions (Top-Right Corner of Viewport on Desktop) */}
      {location.pathname !== '/messages' && (
        <div
          className="desktop-floating-actions"
          style={{
            position: 'fixed',
            top: 12,
            right: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 1000,
          }}
        >
          <MessageDropdown />
          <NotificationBell />
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (< 640px) */}
      <nav className="mobile-bottom-nav">
        <button
          type="button"
          className={`mobile-bottom-item ${active === 'dashboard' ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
        >
          <Home size={20} />
          <span>Home</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-item ${active === 'network' ? 'active' : ''}`}
          onClick={() => navigate('/network')}
        >
          <Users size={20} />
          <span>Network</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-item ${active === 'communities' ? 'active' : ''}`}
          onClick={() => navigate('/communities')}
        >
          <Compass size={20} />
          <span>Groups</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-item ${active === 'events' ? 'active' : ''}`}
          onClick={() => navigate('/events')}
        >
          <Calendar size={20} />
          <span>Events</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-item ${mobileOpen ? 'active' : ''}`}
          onClick={() => setMobileOpen(prev => !prev)}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}