import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { getCollaborationAnalytics } from '../services/analyticsService';
import { useAuth } from '../context/AuthContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function CollaborationAnalytics() {
  const { user } = useAuth();
  const [collaborations, setCollaborations] = useState([]);
  const [selectedCollabId, setSelectedCollabId] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [filterDays, setFilterDays] = useState(30);

  // Load collaborations the user created
  useEffect(() => {
    const fetchCollaborations = async () => {
      setLoadingList(true);
      try {
        const { data } = user?.role === 'admin'
          ? await api.get('/collaborations')
          : await api.get('/collaborations/my');
        
        setCollaborations(data);
        if (data.length > 0) {
          setSelectedCollabId(data[0].collaboration_id);
        }
      } catch (err) {
        console.error("Failed to load collaborations list", err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchCollaborations();
  }, [user]);

  // Load collaboration analytics
  useEffect(() => {
    if (selectedCollabId === null) return;
    
    const loadAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const { data } = await getCollaborationAnalytics(selectedCollabId, filterDays);
        setAnalytics(data);
      } catch (err) {
        console.error("Failed to load collaboration analytics", err);
      } finally {
        setLoadingAnalytics(false);
      }
    };
    loadAnalytics();
  }, [selectedCollabId, filterDays]);

  const selectedCollab = collaborations.find(c => c.collaboration_id === Number(selectedCollabId));

  const colors = {
    quad: 'var(--quad)',
    sky: 'var(--sky)',
    marigold: 'var(--marigold)',
    coral: 'var(--coral)',
    inkSoft: 'var(--ink-soft)'
  };

  return (
    <div className="app-shell">
      <Sidebar active="analytics" />

      <main className="app-main">
        {/* Topbar */}
        <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.25rem', color: 'var(--ink)' }}>
            Collaboration Analytics
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
            <a href="/analytics/communities" className="button" style={{ fontSize: '0.8rem', padding: '4px 10px', border: '1px solid var(--ink)', background: 'var(--paper-raised)' }}>Community Metrics</a>
            <a href="/analytics/events" className="button" style={{ fontSize: '0.8rem', padding: '4px 10px', border: '1px solid var(--ink)', background: 'var(--paper-raised)' }}>Event Insights</a>
            <button className="button button-quad" style={{ fontSize: '0.8rem', padding: '4px 10px', border: '1px solid var(--ink)' }}>Collaboration Analytics</button>
          </div>

          {loadingList ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div className="spinner spinner-ink" style={{ width: 24, height: 24, margin: '0 auto 8px' }} />
              <p className="eyebrow">Fetching collaborations</p>
            </div>
          ) : collaborations.length === 0 ? (
            <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '32px', textAlign: 'center', background: 'var(--paper-raised)' }}>
              <h3 style={{ fontFamily: 'Fraunces', fontSize: '1.2rem', marginBottom: '8px' }}>No Collaboration Postings Found</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: '16px' }}>
                You must create a collaboration opportunity to view application metrics.
              </p>
              <a href="/collaborations/create" className="button button-quad" style={{ border: '1.5px solid var(--ink)', display: 'inline-block' }}>
                Post a Collaboration Opportunity
              </a>
            </div>
          ) : (
            <>
              {/* Selector Card */}
              <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="eyebrow" style={{ fontSize: '0.7rem' }}>Select Collaboration Posting</span>
                  <select 
                    value={selectedCollabId || ''} 
                    onChange={(e) => setSelectedCollabId(e.target.value)}
                    style={{ padding: '8px 12px', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)', background: 'var(--paper)', fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    {collaborations.map(c => (
                      <option key={c.collaboration_id} value={c.collaboration_id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedCollab && (
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p className="eyebrow">Category</p>
                      <strong style={{ fontSize: '1rem' }}>{selectedCollab.category || 'General'}</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="eyebrow">Positions Available</p>
                      <strong style={{ fontSize: '1.1rem', color: colors.quad }}>{selectedCollab.positions_available}</strong>
                    </div>
                  </div>
                )}
              </div>

              {loadingAnalytics ? (
                <div style={{ textAlign: 'center', padding: '64px' }}>
                  <div className="spinner spinner-ink" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
                  <p className="eyebrow">Compiling collaboration insights</p>
                </div>
              ) : analytics ? (
                <>
                  {/* KPI Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <p className="eyebrow">Total Applications</p>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '4px 0', color: colors.sky }}>
                        {selectedCollab?.applications_count || analytics.applications || 0}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Submitted resumes & proposals</span>
                    </div>
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <p className="eyebrow">Acceptance Rate</p>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '4px 0', color: colors.quad }}>
                        {analytics.acceptance_rate}%
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Accepted / Total applicants</span>
                    </div>
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <p className="eyebrow">Completion Rate</p>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '4px 0', color: colors.coral }}>
                        {analytics.completion_rate}%
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Project status completed</span>
                    </div>
                  </div>

                  {/* Visual Chart */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    
                    {/* Bar Chart comparing Applications vs Positions */}
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'Fraunces' }}>Applications vs Available Positions</h3>
                      <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            {
                              name: 'Open Positions',
                              count: selectedCollab?.positions_available || 1,
                              fill: colors.quad
                            },
                            {
                              name: 'Total Applicants',
                              count: selectedCollab?.applications_count || analytics.applications || 0,
                              fill: colors.sky
                            }
                          ]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                            <XAxis dataKey="name" stroke="var(--ink-soft)" fontSize={10} fontFamily="Inter" />
                            <YAxis stroke="var(--ink-soft)" fontSize={10} fontFamily="JetBrains Mono" />
                            <Tooltip contentStyle={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.8rem' }} />
                            <Bar dataKey="count" name="Count" stroke="var(--ink)" strokeWidth={1}>
                              <Cell fill={colors.quad} />
                              <Cell fill={colors.sky} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Applications status distribution Pie Chart */}
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'Fraunces' }}>Proposal Acceptance Breakdown</h3>
                      <div style={{ width: '100%', height: 260, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Accepted', value: analytics.acceptance_rate },
                                { name: 'Pending / Rejected', value: 100 - analytics.acceptance_rate }
                              ]}
                              cx="50%"
                              cy="45%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill={colors.quad} />
                              <Cell fill={colors.coral} />
                            </Pie>
                            <Tooltip formatter={(value) => `${value}%`} />
                            <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                          </PieChart>
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
