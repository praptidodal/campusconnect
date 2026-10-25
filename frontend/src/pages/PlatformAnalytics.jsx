import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { 
  getPlatformAnalytics, 
  getUserGrowth, 
  getPostAnalytics, 
  getContributors, 
  getTrendingSkills 
} from '../services/analyticsService';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function PlatformAnalytics() {
  const [filterDays, setFilterDays] = useState(30);
  const [platformData, setPlatformData] = useState(null);
  const [userGrowth, setUserGrowth] = useState([]);
  const [postData, setPostData] = useState(null);
  const [contributors, setContributors] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Custom date range state
  const [customRange, setCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async (days) => {
    setLoading(true);
    try {
      const [platformRes, growthRes, postsRes, contributorsRes, skillsRes] = await Promise.all([
        getPlatformAnalytics(),
        getUserGrowth(days),
        getPostAnalytics(days),
        getContributors(days),
        getTrendingSkills(days)
      ]);

      setPlatformData(platformRes.data);
      setUserGrowth(growthRes.data);
      setPostData(postsRes.data);
      setContributors(contributorsRes.data);
      setSkills(skillsRes.data?.skills || skillsRes.data?.top_skills || []);
    } catch (err) {
      console.error("Failed to load analytics data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filterDays);
  }, [filterDays]);

  const handleCustomRangeSubmit = (e) => {
    e.preventDefault();
    if (!startDate) return;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    loadData(diffDays);
  };

  // HSL tailored color list
  const colors = {
    quad: 'var(--quad)',
    marigold: 'var(--marigold)',
    sky: 'var(--sky)',
    coral: 'var(--coral)',
    ink: 'var(--ink)',
    inkSoft: 'var(--ink-soft)'
  };

  return (
    <div className="app-shell">
      <Sidebar active="analytics" />

      <main className="app-main">
        {/* Header Topbar */}
        <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.25rem', color: 'var(--ink)' }}>
            Platform Analytics & Insights
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`button ${filterDays === 7 && !customRange ? 'button-quad' : ''}`}
              style={{ fontSize: '0.8rem', padding: '6px 12px', border: '1.5px solid var(--ink)' }}
              onClick={() => { setCustomRange(false); setFilterDays(7); }}
            >
              7 Days
            </button>
            <button 
              className={`button ${filterDays === 30 && !customRange ? 'button-quad' : ''}`}
              style={{ fontSize: '0.8rem', padding: '6px 12px', border: '1.5px solid var(--ink)' }}
              onClick={() => { setCustomRange(false); setFilterDays(30); }}
            >
              30 Days
            </button>
            <button 
              className={`button ${filterDays === 90 && !customRange ? 'button-quad' : ''}`}
              style={{ fontSize: '0.8rem', padding: '6px 12px', border: '1.5px solid var(--ink)' }}
              onClick={() => { setCustomRange(false); setFilterDays(90); }}
            >
              90 Days
            </button>
            <button 
              className={`button ${customRange ? 'button-quad' : ''}`}
              style={{ fontSize: '0.8rem', padding: '6px 12px', border: '1.5px solid var(--ink)' }}
              onClick={() => setCustomRange(true)}
            >
              Custom Range
            </button>
          </div>
        </div>

        <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          
          {/* Custom Date Form */}
          {customRange && (
            <form onSubmit={handleCustomRangeSubmit} className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '16px', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', background: 'var(--paper-raised)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="eyebrow" style={{ fontSize: '0.7rem' }}>Start Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  style={{ padding: '6px', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="eyebrow" style={{ fontSize: '0.7rem' }}>End Date (Optional)</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  style={{ padding: '6px', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="button button-quad" style={{ padding: '8px 16px', border: '1.5px solid var(--ink)' }}>
                  Apply Filter
                </button>
              </div>
            </form>
          )}

          {/* Quick Stats Grid */}
          {platformData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                <p className="eyebrow">Total Users</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '4px 0' }}>{platformData.total_users}</h3>
                <span style={{ fontSize: '0.8rem', color: platformData.growth_percentage >= 0 ? 'var(--quad)' : 'var(--coral)', fontWeight: 'bold' }}>
                  {platformData.growth_percentage >= 0 ? '+' : ''}{platformData.growth_percentage}% growth
                </span>
              </div>
              <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                <p className="eyebrow">Active Users (30d)</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '4px 0' }}>{platformData.active_users}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                  DAU/MAU engaged
                </span>
              </div>
              <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                <p className="eyebrow">Total Posts</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '4px 0' }}>{platformData.total_posts}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--quad)' }}>
                  Social + Communities
                </span>
              </div>
              <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                <p className="eyebrow">Communities</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '4px 0' }}>{platformData.total_communities}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--sky)' }}>
                  Hubs created
                </span>
              </div>
              <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                <p className="eyebrow">Collaborations</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '4px 0' }}>{platformData.total_collaborations}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--marigold-deep)' }}>
                  Marketplace postings
                </span>
              </div>
            </div>
          )}

          {/* Quick Context Subnavigation */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1.5px solid var(--line)', paddingBottom: '8px', overflowX: 'auto' }}>
            <button className="button button-quad" style={{ fontSize: '0.8rem', padding: '4px 10px', border: '1px solid var(--ink)' }}>Platform Overview</button>
            <a href="/analytics/communities" className="button" style={{ fontSize: '0.8rem', padding: '4px 10px', border: '1px solid var(--ink)', background: 'var(--paper-raised)' }}>Community Metrics</a>
            <a href="/analytics/events" className="button" style={{ fontSize: '0.8rem', padding: '4px 10px', border: '1px solid var(--ink)', background: 'var(--paper-raised)' }}>Event Insights</a>
            <a href="/analytics/collaborations" className="button" style={{ fontSize: '0.8rem', padding: '4px 10px', border: '1px solid var(--ink)', background: 'var(--paper-raised)' }}>Collaboration Analytics</a>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px' }}>
              <div className="spinner spinner-ink" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
              <p className="eyebrow">Assembling platform insights</p>
            </div>
          ) : (
            <>
              {/* Primary Charts Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                {/* User Growth Area Chart */}
                <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'Fraunces' }}>User Registrations & Growth</h3>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={userGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.sky} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={colors.sky} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                        <XAxis dataKey="date" stroke="var(--ink-soft)" fontSize={10} fontFamily="JetBrains Mono" />
                        <YAxis stroke="var(--ink-soft)" fontSize={10} fontFamily="JetBrains Mono" />
                        <Tooltip contentStyle={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: '4px', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }} />
                        <Legend wrapperStyle={{ fontSize: '0.8rem', fontFamily: 'Inter' }} />
                        <Area type="monotone" dataKey="new_users" name="New Registrations" stroke={colors.sky} strokeWidth={2} fillOpacity={1} fill="url(#colorNewUsers)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Active Users Line Chart */}
                <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'Fraunces' }}>Daily Active Users Trend</h3>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={userGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                        <XAxis dataKey="date" stroke="var(--ink-soft)" fontSize={10} fontFamily="JetBrains Mono" />
                        <YAxis stroke="var(--ink-soft)" fontSize={10} fontFamily="JetBrains Mono" />
                        <Tooltip contentStyle={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: '4px', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }} />
                        <Legend wrapperStyle={{ fontSize: '0.8rem', fontFamily: 'Inter' }} />
                        <Line type="monotone" dataKey="active_users" name="Daily Active Users" stroke={colors.quad} strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Secondary Row: Posts & Activity Bar Chart */}
              {postData && (
                <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', fontFamily: 'Fraunces' }}>Engagement Snapshot (Posts, Likes & Comments)</h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                      <span>Posts: <strong style={{ color: colors.coral }}>{postData.posts_created}</strong></span>
                      <span>Likes: <strong style={{ color: colors.marigold }}>{postData.likes}</strong></span>
                      <span>Comments: <strong style={{ color: colors.sky }}>{postData.comments}</strong></span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Posts Created', count: postData.posts_created, fill: colors.coral },
                        { name: 'Total Likes', count: postData.likes, fill: colors.marigold },
                        { name: 'Total Comments', count: postData.comments, fill: colors.sky }
                      ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                        <XAxis dataKey="name" stroke="var(--ink-soft)" fontSize={10} fontFamily="Inter" />
                        <YAxis stroke="var(--ink-soft)" fontSize={10} fontFamily="JetBrains Mono" />
                        <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} contentStyle={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.8rem' }} />
                        <Bar dataKey="count" name="Activity count" stroke="var(--ink)" strokeWidth={1.5}>
                          {
                            [
                              { fill: colors.coral },
                              { fill: colors.marigold },
                              { fill: colors.sky }
                            ].map((entry, index) => (
                              <cell key={`cell-${index}`} fill={entry.fill} />
                            ))
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Widgets & Lists Bottom Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                {/* Trending Skills Widget */}
                <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '12px', fontFamily: 'Fraunces' }}>Trending Skills</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {skills.map((s, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', border: '1.5px solid var(--ink)', background: 'var(--paper)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>#{idx + 1}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.skill_name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
                          <span>{s.users_using_skill} users</span>
                          <span style={{ color: 'var(--quad)', fontWeight: 'bold' }}>+{s.growth_percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Contributors Widgets */}
                {contributors && (
                  <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '12px', fontFamily: 'Fraunces' }}>Top Active Users</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {contributors.most_active_users.map((c, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', border: '1.5px solid var(--ink)', background: 'var(--paper)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.name}</span>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: 'var(--ink-soft)' }}>
                            {c.activity_count} actions
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
