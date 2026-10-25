import React from 'react';

export default function NetworkTabs({ activeTab, setActiveTab, badgeCounts = {} }) {
  const tabs = [
    { key: 'discover', label: 'Discover People' },
    { key: 'connections', label: 'Connections', countKey: 'connections' },
    { key: 'pending', label: 'Pending Requests', countKey: 'pending' },
    { key: 'sent', label: 'Sent Requests', countKey: 'sent' },
    { key: 'suggestions', label: 'Suggested Connections', countKey: 'suggestions' }
  ];

  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid var(--line)',
      marginBottom: 'var(--space-4)',
      gap: 16,
      overflowX: 'auto'
    }}>
      {tabs.map(tab => {
        const count = tab.countKey ? (badgeCounts[tab.countKey] ?? 0) : null;
        return (
          <button
            key={tab.key}
            className="btn btn-ghost btn-sm"
            onClick={() => setActiveTab(tab.key)}
            style={{
              borderRadius: 0,
              borderBottom: activeTab === tab.key ? '2.5px solid var(--quad)' : 'none',
              fontWeight: activeTab === tab.key ? 700 : 400,
              color: activeTab === tab.key ? 'var(--ink)' : 'var(--ink-soft)',
              padding: '8px 12px',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {tab.label}
            {count !== null && (
              <span style={{
                color: 'var(--ink-faint)',
                fontSize: '0.85rem',
                fontWeight: 500,
                marginLeft: 4
              }}>
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
