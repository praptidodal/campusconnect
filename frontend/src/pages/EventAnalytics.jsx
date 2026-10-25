import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { getEventAnalytics } from '../services/analyticsService';
import { useAuth } from '../context/AuthContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function EventAnalytics() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [filterDays, setFilterDays] = useState(30);

  // Load events list the user organizes
  useEffect(() => {
    const fetchEvents = async () => {
      setLoadingList(true);
      try {
        const { data } = user?.role === 'admin'
          ? await api.get('/events')
          : await api.get('/events/my-events');
        
        setEvents(data);
        if (data.length > 0) {
          setSelectedEventId(data[0].event_id);
        }
      } catch (err) {
        console.error("Failed to load events list", err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchEvents();
  }, [user]);

  // Load event analytics
  useEffect(() => {
    if (selectedEventId === null) return;
    
    const loadAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const { data } = await getEventAnalytics(selectedEventId, filterDays);
        setAnalytics(data);
      } catch (err) {
        console.error("Failed to load event analytics", err);
      } finally {
        setLoadingAnalytics(false);
      }
    };
    loadAnalytics();
  }, [selectedEventId, filterDays]);

  const selectedEvent = events.find(e => e.event_id === Number(selectedEventId));

  const colors = {
    quad: 'var(--quad)',
    sky: 'var(--sky)',
    marigold: 'var(--marigold)',
    coral: 'var(--coral)',
    inkSoft: 'var(--ink-soft)'
  };

  const PIE_COLORS = [colors.sky, colors.marigold, colors.coral, colors.quad];

  return (
    <div className="app-shell">
      <Sidebar active="analytics" />

      <main className="app-main">
        {/* Topbar */}
        <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.25rem', color: 'var(--ink)' }}>
            Event Analytics
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
            <button className="button button-quad" style={{ fontSize: '0.8rem', padding: '4px 10px', border: '1px solid var(--ink)' }}>Event Insights</button>
            <a href="/analytics/collaborations" className="button" style={{ fontSize: '0.8rem', padding: '4px 10px', border: '1px solid var(--ink)', background: 'var(--paper-raised)' }}>Collaboration Analytics</a>
          </div>

          {loadingList ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div className="spinner spinner-ink" style={{ width: 24, height: 24, margin: '0 auto 8px' }} />
              <p className="eyebrow">Fetching events list</p>
            </div>
          ) : events.length === 0 ? (
            <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '32px', textAlign: 'center', background: 'var(--paper-raised)' }}>
              <h3 style={{ fontFamily: 'Fraunces', fontSize: '1.2rem', marginBottom: '8px' }}>No Organized Events Found</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: '16px' }}>
                You must be the host/organizer of an event to see event participation analytics.
              </p>
              <a href="/events/create" className="button button-quad" style={{ border: '1.5px solid var(--ink)', display: 'inline-block' }}>
                Host an Event
              </a>
            </div>
          ) : (
            <>
              {/* Selector Card */}
              <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="eyebrow" style={{ fontSize: '0.7rem' }}>Select Event</span>
                  <select 
                    value={selectedEventId || ''} 
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    style={{ padding: '8px 12px', border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)', background: 'var(--paper)', fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    {events.map(e => (
                      <option key={e.event_id} value={e.event_id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedEvent && (
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p className="eyebrow">Category</p>
                      <strong style={{ fontSize: '1rem' }}>{selectedEvent.category || 'General'}</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="eyebrow">Venue</p>
                      <strong style={{ fontSize: '1rem' }}>{selectedEvent.venue || 'TBD'}</strong>
                    </div>
                  </div>
                )}
              </div>

              {loadingAnalytics ? (
                <div style={{ textAlign: 'center', padding: '64px' }}>
                  <div className="spinner spinner-ink" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
                  <p className="eyebrow">Loading participation analytics</p>
                </div>
              ) : analytics ? (
                <>
                  {/* KPI Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <p className="eyebrow">Total Registrations</p>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '4px 0', color: colors.sky }}>
                        {selectedEvent?.registered_count || analytics.most_popular_events?.[0]?.registrations_count || 0}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Registered students</span>
                    </div>
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <p className="eyebrow">Attendance Rate</p>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '4px 0', color: colors.quad }}>
                        {analytics.attendance_rate}%
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Attended / Registered</span>
                    </div>
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <p className="eyebrow">Max Seating Limit</p>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '4px 0', color: colors.coral }}>
                        {selectedEvent?.max_participants || 'Unlimited'}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                        {selectedEvent?.remaining_seats !== null ? `${selectedEvent.remaining_seats} seats left` : 'Open enrollment'}
                      </span>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {/* Registration Trend Area Chart */}
                    <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'Fraunces' }}>Registrations Timeline</h3>
                      <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics.registrations} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorRegs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors.sky} stopOpacity={0.4}/>
                                <stop offset="95%" stopColor={colors.sky} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                            <XAxis dataKey="date" stroke="var(--ink-soft)" fontSize={10} fontFamily="JetBrains Mono" />
                            <YAxis stroke="var(--ink-soft)" fontSize={10} fontFamily="JetBrains Mono" />
                            <Tooltip contentStyle={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.8rem' }} />
                            <Area type="monotone" dataKey="count" name="Cumulative Registrations" stroke={colors.sky} strokeWidth={3} fillOpacity={1} fill="url(#colorRegs)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Category Distribution Pie Chart (If global event overview is active) */}
                    {analytics.category_distribution?.length > 1 ? (
                      <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'Fraunces' }}>Events Category Mix</h3>
                        <div style={{ width: '100%', height: 260, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analytics.category_distribution}
                                cx="50%"
                                cy="45%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                              >
                                {analytics.category_distribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      /* If specific event selected, show nice participant list summary */
                      <div className="card" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '16px', background: 'var(--paper-raised)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'Fraunces' }}>Participation Breakdown</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', height: '100%', minHeight: '200px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                            <span>Registrations:</span>
                            <strong style={{ color: colors.sky }}>{selectedEvent?.registered_count || 0}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                            <span>Target Seats:</span>
                            <strong>{selectedEvent?.max_participants || 'Open Enrollment'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                            <span>Attended Rate:</span>
                            <strong style={{ color: colors.quad }}>{analytics.attendance_rate}%</strong>
                          </div>
                        </div>
                      </div>
                    )}
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
