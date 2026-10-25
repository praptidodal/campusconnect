import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getCollaborations, searchCollaborations } from '../services/collaborationService';

export default function CollaborationDashboard() {
  const navigate = useNavigate();
  const [collaborations, setCollaborations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter and Search states
  const [searchTitle, setSearchTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('open');
  const [searchSkill, setSearchSkill] = useState('');

  const CATEGORIES = [
    'Hackathons',
    'Research Projects',
    'Startup Ideas',
    'Club Activities',
    'Team Formation',
    'Freelance Work'
  ];

  const loadCollaborations = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (searchTitle.trim() || searchSkill.trim()) {
        // Use search endpoint
        res = await searchCollaborations({
          title: searchTitle.trim() || undefined,
          skill: searchSkill.trim() || undefined,
          category: selectedCategory || undefined,
        });
      } else {
        // Use standard filter endpoint
        res = await getCollaborations({
          category: selectedCategory || undefined,
          skill: searchSkill.trim() || undefined,
          status: selectedStatus || undefined,
        });
      }
      setCollaborations(res.data || []);
    } catch (err) {
      setError('Failed to retrieve collaboration opportunities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollaborations();
  }, [selectedCategory, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCollaborations();
  };

  const handleResetFilters = () => {
    setSearchTitle('');
    setSelectedCategory('');
    setSelectedStatus('open');
    setSearchSkill('');
    // Wait for state updates then reload is handled by trigger or direct call
    setTimeout(() => {
      loadCollaborations();
    }, 50);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No deadline';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="app-shell">
      <Sidebar active="collaborate" />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)' }}>
            Collaboration Marketplace
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/collaborations/applications/my')}>
              My Applications
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/collaborations/my')}>
              My Postings
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/collaborations/create')}>
              Post Opportunity
            </button>
          </div>
        </div>

        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Search and Filters panel */}
          <div className="card" style={{ padding: 'var(--space-3)' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="eyebrow">Search Title</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Hackathon, CS Research..."
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="eyebrow">Required Skill</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. React, Python, Figma..."
                    value={searchSkill}
                    onChange={(e) => setSearchSkill(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="eyebrow">Category</label>
                  <select
                    className="input"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{ appearance: 'none', background: 'var(--paper-raised)' }}
                  >
                    <option value="">All Categories</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="eyebrow">Status</label>
                  <select
                    className="input"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    disabled={Boolean(searchTitle.trim() || searchSkill.trim())}
                    style={{ appearance: 'none', background: 'var(--paper-raised)' }}
                  >
                    <option value="open">Open Positions</option>
                    <option value="closed">Closed</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleResetFilters}>
                  Reset
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Apply Filters
                </button>
              </div>
            </form>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* Listings */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
              <p className="eyebrow">Loading opportunities...</p>
            </div>
          ) : collaborations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
              <p style={{ color: 'var(--ink-soft)' }}>No collaboration opportunities match your search filters.</p>
              <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={handleResetFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-3)' }}>
              {collaborations.map(collab => (
                <div key={collab.collaboration_id} className="pin-card pin-marigold fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                  <div>
                    {/* Header tags */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="role-badge role-club" style={{ fontSize: '0.625rem' }}>{collab.category}</span>
                      {collab.community_name && (
                        <span className="role-badge role-faculty" style={{ fontSize: '0.625rem' }}>{collab.community_name}</span>
                      )}
                      <span className={`role-badge ${collab.status === 'open' ? 'role-student' : 'role-admin'}`} style={{ fontSize: '0.625rem', textTransform: 'capitalize' }}>
                        {collab.status}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 onClick={() => navigate(`/collaborations/${collab.collaboration_id}`)} className="hover:underline" style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer', marginBottom: 8 }}>
                      {collab.title}
                    </h3>

                    {/* Creator avatar and info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      {collab.creator_avatar ? (
                        <img src={collab.creator_avatar} alt={collab.creator_name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--sky-tint)', color: 'var(--sky-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>
                          {collab.creator_name ? collab.creator_name[0].toUpperCase() : 'U'}
                        </div>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                        Posted by {collab.creator_name}
                      </span>
                    </div>

                    {/* Short Description */}
                    <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 16 }}>
                      {collab.description}
                    </p>

                    {/* Required Skills */}
                    {collab.required_skills && (
                      <div style={{ marginBottom: 16 }}>
                        <div className="eyebrow" style={{ fontSize: '0.65rem', marginBottom: 4 }}>Required Skills</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {collab.required_skills.split(',').map((skill, idx) => (
                            <span key={idx} style={{ background: 'var(--bg-light)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '2px 6px', fontSize: '0.7rem', color: 'var(--ink-soft)' }}>
                              {skill.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Stats & Actions */}
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 12, fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-soft)' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>{collab.positions_available} open position{collab.positions_available > 1 && 's'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>Deadline: {formatDate(collab.deadline)}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                      <span style={{ fontSize: '0.725rem', color: 'var(--ink-faint)' }}>
                        {collab.applications_count} applicant{collab.applications_count !== 1 && 's'}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/collaborations/${collab.collaboration_id}`)}>
                          Details
                        </button>
                        {collab.is_applied ? (
                          <span className={`role-badge ${collab.application_status === 'accepted' ? 'role-club' : collab.application_status === 'rejected' ? 'role-admin' : 'role-student'}`} style={{ alignSelf: 'center', padding: '6px 12px', fontSize: '0.7rem' }}>
                            {collab.application_status === 'accepted' ? 'Accepted' : collab.application_status === 'rejected' ? 'Rejected' : 'Applied'}
                          </span>
                        ) : collab.status === 'open' ? (
                          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/collaborations/${collab.collaboration_id}`)}>
                            Apply
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
