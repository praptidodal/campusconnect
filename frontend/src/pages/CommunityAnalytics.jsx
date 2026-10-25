import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { getCommunityAnalytics } from '../services/analyticsService';
import { useAuth } from '../context/AuthContext';
import {
  ResponsiveContainer,
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

export default function CommunityAnalytics() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [selectedCommId, setSelectedCommId] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [filterDays, setFilterDays] = useState(30);

  // Load communities the user has rights to view
  useEffect(() => {
    const fetchCommunities = async () => {
      setLoadingList(true);
      try {
        const { data } = await api.get('/communities');
        // If admin, show all. Otherwise, show where user is owner or admin
        const filtered = user?.role === 'admin' 
          ? data 
          : data.filter(c => c.is_joined && (c.role === 'owner' || c.role === 'admin'));
        
        setCommunities(filtered);
        if (filtered.length > 0) {
          setSelectedCommId(filtered[0].community_id);
        }
      } catch (err) {
        console.error("Failed to load communities list", err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchCommunities();
  }, [user]);

  // Load analytics when community or filter changes
  useEffect(() => {
    if (selectedCommId === null) return;
    
    const loadAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const { data } = await getCommunityAnalytics(selectedCommId, filterDays);
        setAnalytics(data);
      } catch (err) {
        console.error("Failed to load community analytics", err);
      } finally {
        setLoadingAnalytics(false);
      }
    };
    loadAnalytics();
  }, [selectedCommId, filterDays]);

  const colors = {
    quad: 'var(--quad)',
    sky: 'var(--sky)',
    coral: 'var(--coral)',
    inkSoft: 'var(--ink-soft)'
  };

  const selectedCommunity = communities.find(c => c.community_id === Number(selectedCommId));

  return (
    <div className="app-shell">
      <Sidebar active="analytics" />

      <main className="app-main">
        {/* Topbar */}
        <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.25rem', color: 'var(--ink)' }}>
            Community Analytics
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`button ${filterDays === 7 ? 'button-quad' : ''}`}
              style={{ fontSize: '0.8rem', padding: '6px 12px', border: '1.5px solid var(--ink)' }}
              onClick={() => setFilterDays(7)}
            >
              7 Days
            </button>
            <button 
              className={`button ${filterDays === 30 ? 'button-quad' : ''}`}
              style={{ fontSize: '0.8rem', padding: '6px 12px', border: '1.5px solid var(--ink)' }}
              onClick={() => setFilterDays(30)}
            >
              30 Days
            </button>
            <button 
              className={`button ${filterDays === 90 ? 'button-quad' : ''}`}
              style={{ fontSize: '0.8rem', padding: '6px 12px', border: '1.5px solid var(--ink)' }}
              onClick={() => setFilterDays(90)}
            >
              90 Days
            </button>
          </div>
        </div>

        <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          
          {/* Subnavigation */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1.5px solid var(--line)', paddingBottom: '8px', overflowX: 'auto' }}>
            {user?.role === 'admin' || user?.role === 'faculty' ? (
              <a href="/analytics" className="button" style={{ fontSize: '0.8rem', padding: '4px 10px', border: '1px solid var(--ink)', background: 'var(--paper-raised)' }}>Platform Overview</a>
            ) : null}
            <button className="button button-quad" style={{ fontSize: '0.8rem', padding: '4px 10px', border: '1px solid var(--ink)' }}>Community Metrics</button>
            <a href="/analytics/events" className="button" style={{ fontSize: '0.8rem', padding: '4px 10px', border: '1px solid var(--ink)', background: 'var(--paper-raised)' }}>Event Insights</a>
            <a href="/analytics/collaborations" className="button" style={{ fontSize: '0.8rem', padding: '4px 10px', border: '1px solid var(--ink)', background: 'var(--paper-raised)' }}>Collaboration Analytics</a>
          </div>

          {loadingList ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div className="spinner spinner-ink" style={{ width: 24, height: 24, margin: '0 auto 8px' }} />
              <p className="eyebrow">Fetching communities</p>
            </div>
          ) : communities.length === 0 ? (
            <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '32px', textAlign: 'center', background: 'var(--paper-raised)' }}>
              <h3 style={{ fontFamily: 'Fraunces', fontSize: '1.2rem', marginBottom: '8px' }}>No Managed Communities Found</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: '16px' }}>
                You must be an Owner or Admin of a community to view community-specific analytics.
              </p>
              <a href="/communities/create" className="button button-quad" style={{ border: '1.5px solid var(--ink)', display: 'inline-block' }}>
                Create a Community
              </a>
            </div>
          ) : (
            <>
              {/* Selector Switcher Card */}
              <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="eyebrow" style={{ fontSize: '0.7rem' }}>Select Community</span>
                  <select 
                    value={selectedCommId || ''} 
                    onChange={(e) => setSelectedCommId(e.target.value)}
                    style={{ padding: '8px 12px', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)', background: 'var(--paper)', fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    {communities.map(c => (
                      <option key={c.community_id} value={c.community_id}>
                        {c.community_name} {c.role ? `(${c.role})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedCommunity && (
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p className="eyebrow">Category</p>
                      <strong style={{ fontSize: '1rem' }}>{selectedCommunity.category || 'General'}</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="eyebrow">Total Members</p>
                      <strong style={{ fontSize: '1.1rem', color: colors.quad }}>{selectedCommunity.member_count}</strong>
                    </div>
                  </div>
                )}
              </div>

              {loadingAnalytics ? (
                <div style={{ textAlign: 'center', padding: '64px' }}>
                  <div className="spinner spinner-ink" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
                  <p className="eyebrow">Compiling community metrics</p>
                </div>
              ) : analytics ? (
                <>
                  {/* Top Stats Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <p className="eyebrow">Members Growth</p>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '4px 0', color: colors.quad }}>
                        {selectedCommunity?.member_count || 0}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Total joined members</span>
                    </div>
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <p className="eyebrow">Active Posts</p>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '4px 0', color: colors.coral }}>
                        {analytics.top_communities?.[0]?.post_count || 0}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Community forum postings</span>
                    </div>
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <p className="eyebrow">Hosted Events</p>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '4px 0', color: colors.sky }}>
                        {analytics.event_activity?.reduce((acc, curr) => acc + curr.count, 0) || 0}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Events in range</span>
                    </div>
                  </div>

                  {/* Main Charts */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {/* Member Growth Chart */}
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'Fraunces' }}>Membership Growth Trend</h3>
                      <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analytics.member_growth} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                            <XAxis dataKey="date" stroke="var(--ink-soft)" fontSize={10} fontFamily="JetBrains Mono" />
                            <YAxis stroke="var(--ink-soft)" fontSize={10} fontFamily="JetBrains Mono" />
                            <Tooltip contentStyle={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.8rem' }} />
                            <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                            <Line type="monotone" dataKey="count" name="Total Members" stroke={colors.quad} strokeWidth={3} dot={{ r: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Post and Event Activity Chart */}
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'Fraunces' }}>Post & Event Frequency</h3>
                      <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.post_activity.map((p, idx) => ({
                            date: p.date,
                            posts: p.count,
                            events: analytics.event_activity[idx]?.count || 0
                          }))} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                            <XAxis dataKey="date" stroke="var(--ink-soft)" fontSize={10} fontFamily="JetBrains Mono" />
                            <YAxis stroke="var(--ink-soft)" fontSize={10} fontFamily="JetBrains Mono" />
                            <Tooltip contentStyle={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.8rem' }} />
                            <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                            <Bar dataKey="posts" name="New Posts" fill={colors.coral} stroke="var(--ink)" strokeWidth={1} />
                            <Bar dataKey="events" name="Hosted Events" fill={colors.sky} stroke="var(--ink)" strokeWidth={1} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}

        </div>
      </main>
    </div>
  );
}
