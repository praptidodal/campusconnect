import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getAnalytics } from '../services/adminService';

// ── Reusable Premium Neobrutalist Chart Component ──────────────────────────
function NeobrutalistChart({ data = [], title, type = 'line', color = 'var(--sky)', tint = 'var(--sky-tint)' }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: '220px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-md)' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', fontStyle: 'italic' }}>No chart data.</span>
      </div>
    );
  }

  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const counts = data.map(d => d.count);
  const maxVal = Math.max(...counts, 5); // baseline minimum height

  const getCoordinates = () => {
    return data.map((d, index) => {
      const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.count / maxVal) * chartHeight;
      return { x, y, date: d.date, count: d.count };
    });
  };

  const points = getCoordinates();

  // Create path for line graph
  const pathD = points.reduce((acc, p, index) => {
    return index === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  // Create filled polygon area path
  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : '';

  // Helper to format dates on x-axis (show only a few ticks to avoid clutter)
  const renderXTicks = () => {
    const ticksCount = 4;
    const interval = Math.floor(points.length / ticksCount);
    return points.map((p, idx) => {
      if (idx % interval === 0 || idx === points.length - 1) {
        // Parse date for cleaner display
        const dateObj = new Date(p.date);
        const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return (
          <text
            key={idx}
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            fill="var(--ink-soft)"
            fontSize="9px"
            fontFamily="JetBrains Mono"
          >
            {dateStr}
          </text>
        );
      }
      return null;
    });
  };

  // Helper for Y ticks
  const renderYTicks = () => {
    const ticks = [0, Math.floor(maxVal / 2), maxVal];
    return ticks.map((val, idx) => {
      const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
      return (
        <g key={idx}>
          <text
            x={paddingLeft - 8}
            y={y + 3}
            textAnchor="end"
            fill="var(--ink-soft)"
            fontSize="9px"
            fontFamily="JetBrains Mono"
          >
            {val}
          </text>
          <line
            x1={paddingLeft}
            y1={y}
            x2={width - paddingRight}
            y2={y}
            stroke="var(--line)"
            strokeWidth="1"
            strokeDasharray={idx === 0 ? "none" : "3 3"}
          />
        </g>
      );
    });
  };

  return (
    <div className="card" style={{ background: '#fff', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
      
      {/* Title & Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', fontFamily: 'Fraunces' }}>{title}</h3>
        {hoveredIndex !== null && (
          <div style={{ background: 'var(--ink)', color: '#fff', border: '1.5px solid var(--ink)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'JetBrains Mono', display: 'flex', gap: '6px' }}>
            <span>{new Date(points[hoveredIndex].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}:</span>
            <strong style={{ color: 'var(--marigold)' }}>{points[hoveredIndex].count}</strong>
          </div>
        )}
      </div>

      {/* SVG Canvas wrapper */}
      <div style={{ width: '100%', overflowX: 'hidden' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
          
          {/* Y Axis Gridlines */}
          {renderYTicks()}

          {/* X Axis ticks */}
          {renderXTicks()}

          {/* Chart Rendering */}
          {type === 'line' ? (
            <>
              {/* Area Under Line */}
              <path d={areaD} fill={tint} opacity="0.6" />
              
              {/* Main Line path */}
              <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />

              {/* Data Point interactive nodes */}
              {points.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={hoveredIndex === idx ? 6 : 2}
                  fill={hoveredIndex === idx ? 'var(--ink)' : color}
                  stroke="var(--ink)"
                  strokeWidth={hoveredIndex === idx ? 2 : 0}
                  style={{ transition: 'all 0.1s ease', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </>
          ) : (
            <>
              {/* Bar Graph rendering */}
              {(() => {
                const barWidth = Math.max(3, Math.floor(chartWidth / data.length) - 3);
                return points.map((p, idx) => {
                  const barHeight = chartHeight - (p.count / maxVal) * chartHeight;
                  const rectY = p.y;
                  const rectHeight = paddingTop + chartHeight - rectY;
                  return (
                    <rect
                      key={idx}
                      x={p.x - barWidth / 2}
                      y={rectY}
                      width={barWidth}
                      height={rectHeight}
                      fill={hoveredIndex === idx ? 'var(--ink)' : color}
                      stroke="var(--ink)"
                      strokeWidth="1.5"
                      style={{ cursor: 'pointer', transition: 'fill 0.1s ease' }}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  );
                });
              })()}
            </>
          )}

          {/* Core Neobrutalist border outline of the active chart area */}
          <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={paddingTop + chartHeight} stroke="var(--ink)" strokeWidth="2" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="var(--ink)" strokeWidth="2" />

        </svg>
      </div>

    </div>
  );
}


// ── Main Page ───────────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getAnalytics();
      setData(res.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch platform metrics from the analytics engine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <AdminLayout activeTab="analytics">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card" style={{ background: '#fff', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', padding: 'var(--space-3)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'Fraunces' }}>Analytics & Engagement metrics</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
            Showing 30-day activity trends and community engagement metrics across Dr. Vishwanath Karad MIT-WPU Pune databases.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'JetBrains Mono', color: 'var(--ink-soft)' }}>
            Generating statistics...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            
            {/* DAU */}
            <NeobrutalistChart
              data={data?.daily_active_users}
              title="Daily Active Users (DAU)"
              type="line"
              color="var(--sky)"
              tint="var(--sky-tint)"
            />

            {/* Community Growth */}
            <NeobrutalistChart
              data={data?.community_growth}
              title="Community Sign-ups (Cumulative)"
              type="line"
              color="var(--quad)"
              tint="var(--quad-tint)"
            />

            {/* Post creations */}
            <NeobrutalistChart
              data={data?.posts_created}
              title="Social Feed Posts Created (Daily)"
              type="bar"
              color="var(--marigold)"
              tint="var(--marigold-tint)"
            />

            {/* Event registrations */}
            <NeobrutalistChart
              data={data?.event_registrations}
              title="Campus Event Registrations (Daily)"
              type="bar"
              color="var(--coral)"
              tint="var(--coral-tint)"
            />

            {/* Collabs */}
            <NeobrutalistChart
              data={data?.collaboration_applications}
              title="Collaboration Applications Submitted"
              type="line"
              color="#A78BFA"
              tint="#F5F3FF"
            />

          </div>
        )}

      </div>
    </AdminLayout>
  );
}
