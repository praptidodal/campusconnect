import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import {
  getPendingCommunities,
  getPendingEvents,
  getRecentlyApproved,
  getRecentlyRejected,
  approveCommunity,
  rejectCommunity,
  requestCommunityChanges,
  approveEvent,
  rejectEvent,
  requestEventChanges,
} from '../services/adminService';

// ── Approval status badge ─────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:  { label: 'Pending', bg: '#fff8e1', color: '#f59e0b', border: '#f59e0b' },
    approved: { label: 'Approved', bg: '#f0fdf4', color: '#16a34a', border: '#16a34a' },
    rejected: { label: 'Rejected', bg: '#fff1f2', color: '#e11d48', border: '#e11d48' },
    changes_requested: { label: 'Changes Requested', bg: '#eff6ff', color: '#3b82f6', border: '#3b82f6' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      fontSize: '0.65rem', fontFamily: 'JetBrains Mono', fontWeight: '700',
      textTransform: 'uppercase', padding: '3px 8px', borderRadius: '4px',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  );
}

// ── Notes / Reason Modal ──────────────────────────────────────────────────────
function NotesModal({ isOpen, title, placeholder, onConfirm, onCancel, loading }) {
  const [notes, setNotes] = useState('');
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', border: '2.5px solid var(--ink)', borderRadius: 'var(--radius-lg)',
        boxShadow: '6px 6px 0 var(--ink)', padding: 'var(--space-3)', width: '420px', maxWidth: '95vw',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: 'var(--space-2)' }}>{title}</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{
            width: '100%', padding: '10px', border: '1.5px solid var(--line-strong)',
            borderRadius: 'var(--radius-md)', fontFamily: 'inherit', fontSize: '0.875rem',
            resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '10px', marginTop: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { setNotes(''); onCancel(); }}
            className="btn btn-sm btn-outline"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(notes); setNotes(''); }}
            className="btn btn-sm btn-primary"
            disabled={loading}
          >
            {loading ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Community Card ────────────────────────────────────────────────────────────
function CommunityCard({ community, onAction }) {
  const [modal, setModal] = useState(null); // 'reject' | 'changes'

  const handleApprove = () => onAction('approve_community', community.community_id, null);
  const handleReject  = (notes) => { setModal(null); onAction('reject_community',  community.community_id, notes); };
  const handleChanges = (notes) => { setModal(null); onAction('changes_community', community.community_id, notes); };

  return (
    <div style={{
      background: '#fff', border: '2px solid var(--ink)', borderRadius: 'var(--radius-lg)',
      boxShadow: '3px 3px 0 var(--ink)', padding: 'var(--space-3)', display: 'flex',
      flexDirection: 'column', gap: 'var(--space-2)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {community.logo_url ? (
            <img src={community.logo_url} alt="logo" style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--line-strong)', objectFit: 'cover',
            }} />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: 'var(--quad-tint)', border: '1.5px solid var(--quad)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '700', fontSize: '0.95rem', color: 'var(--quad-deep)',
            }}>
              {community.community_name?.[0] || 'C'}
            </div>
          )}
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{community.community_name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
              by <strong>{community.creator_name}</strong> · {community.creator_email}
            </div>
          </div>
        </div>
        <StatusBadge status={community.approval_status} />
      </div>

      {/* Info */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {community.category && (
          <span style={{
            fontSize: '0.7rem', padding: '2px 8px', background: 'var(--paper)',
            border: '1px solid var(--line-strong)', borderRadius: '20px', fontWeight: '500',
          }}>
            {community.category}
          </span>
        )}
        <span style={{ fontSize: '0.7rem', color: 'var(--ink-faint)' }}>
          Created {new Date(community.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {community.description && (
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
          {community.description.length > 160 ? community.description.slice(0, 160) + '…' : community.description}
        </p>
      )}

      {community.approval_notes && (
        <div style={{ fontSize: '0.8rem', background: '#fffbea', border: '1px solid #f59e0b', borderRadius: 'var(--radius-sm)', padding: '6px 10px', color: '#92400e' }}>
          <strong>Notes:</strong> {community.approval_notes}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button
          id={`approve-community-${community.community_id}`}
          onClick={handleApprove}
          className="btn btn-sm"
          style={{ background: '#16a34a', color: '#fff', border: '1.5px solid #15803d', flex: 1 }}
        >
          ✓ Approve
        </button>
        <button
          id={`changes-community-${community.community_id}`}
          onClick={() => setModal('changes')}
          className="btn btn-sm btn-outline"
          style={{ flex: 1 }}
        >
          ✏ Request Changes
        </button>
        <button
          id={`reject-community-${community.community_id}`}
          onClick={() => setModal('reject')}
          className="btn btn-sm"
          style={{ background: '#e11d48', color: '#fff', border: '1.5px solid #be123c', flex: 1 }}
        >
          ✕ Reject
        </button>
      </div>

      <NotesModal
        isOpen={modal === 'reject'}
        title={`Reject "${community.community_name}"`}
        placeholder="Provide a reason for rejection (optional but recommended)…"
        onConfirm={handleReject}
        onCancel={() => setModal(null)}
      />
      <NotesModal
        isOpen={modal === 'changes'}
        title={`Request Changes — "${community.community_name}"`}
        placeholder="Describe what changes are needed before approval…"
        onConfirm={handleChanges}
        onCancel={() => setModal(null)}
      />
    </div>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ event, onAction }) {
  const [modal, setModal] = useState(null);

  const handleApprove = () => onAction('approve_event', event.event_id, null);
  const handleReject  = (notes) => { setModal(null); onAction('reject_event',  event.event_id, notes); };
  const handleChanges = (notes) => { setModal(null); onAction('changes_event', event.event_id, notes); };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div style={{
      background: '#fff', border: '2px solid var(--ink)', borderRadius: 'var(--radius-lg)',
      boxShadow: '3px 3px 0 var(--ink)', padding: 'var(--space-3)', display: 'flex',
      flexDirection: 'column', gap: 'var(--space-2)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {event.poster_url ? (
            <img src={event.poster_url} alt="poster" style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--line-strong)', objectFit: 'cover',
            }} />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: 'var(--sky-tint)', border: '1.5px solid var(--sky)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '700', fontSize: '0.95rem', color: 'var(--sky-deep, #0369a1)',
            }}>
              {event.title?.[0] || 'E'}
            </div>
          )}
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{event.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
              by <strong>{event.organizer_name}</strong> · {event.organizer_email}
            </div>
          </div>
        </div>
        <StatusBadge status={event.approval_status} />
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {event.category && (
          <span style={{
            fontSize: '0.7rem', padding: '2px 8px', background: 'var(--paper)',
            border: '1px solid var(--line-strong)', borderRadius: '20px', fontWeight: '500',
          }}>
            {event.category}
          </span>
        )}
        <span style={{ fontSize: '0.7rem', color: 'var(--ink-soft)' }}>
          📅 {fmtDate(event.start_datetime)}
        </span>
        {event.venue && (
          <span style={{ fontSize: '0.7rem', color: 'var(--ink-soft)' }}>
            📍 {event.venue}
          </span>
        )}
        {event.community_name && (
          <span style={{ fontSize: '0.7rem', color: 'var(--ink-faint)' }}>
            🏛 {event.community_name}
          </span>
        )}
      </div>

      {event.description && (
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
          {event.description.length > 160 ? event.description.slice(0, 160) + '…' : event.description}
        </p>
      )}

      {event.approval_notes && (
        <div style={{ fontSize: '0.8rem', background: '#fffbea', border: '1px solid #f59e0b', borderRadius: 'var(--radius-sm)', padding: '6px 10px', color: '#92400e' }}>
          <strong>Notes:</strong> {event.approval_notes}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button
          id={`approve-event-${event.event_id}`}
          onClick={handleApprove}
          className="btn btn-sm"
          style={{ background: '#16a34a', color: '#fff', border: '1.5px solid #15803d', flex: 1 }}
        >
          ✓ Approve
        </button>
        <button
          id={`changes-event-${event.event_id}`}
          onClick={() => setModal('changes')}
          className="btn btn-sm btn-outline"
          style={{ flex: 1 }}
        >
          ✏ Request Changes
        </button>
        <button
          id={`reject-event-${event.event_id}`}
          onClick={() => setModal('reject')}
          className="btn btn-sm"
          style={{ background: '#e11d48', color: '#fff', border: '1.5px solid #be123c', flex: 1 }}
        >
          ✕ Reject
        </button>
      </div>

      <NotesModal
        isOpen={modal === 'reject'}
        title={`Reject "${event.title}"`}
        placeholder="Provide a reason for rejection (optional but recommended)…"
        onConfirm={handleReject}
        onCancel={() => setModal(null)}
      />
      <NotesModal
        isOpen={modal === 'changes'}
        title={`Request Changes — "${event.title}"`}
        placeholder="Describe what changes are needed before approval…"
        onConfirm={handleChanges}
        onCancel={() => setModal(null)}
      />
    </div>
  );
}

// ── Recently Approved / Rejected List ────────────────────────────────────────
function RecentList({ items = [], type = 'approved' }) {
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const borderColor = type === 'approved' ? '#16a34a' : '#e11d48';
  const bgColor     = type === 'approved' ? '#f0fdf4' : '#fff1f2';

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 'var(--space-3)', fontSize: '0.875rem' }}>
        No items yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item, idx) => {
        const name  = item.community_name || item.title || 'Item';
        const creator = item.creator_name || item.organizer_name || '—';
        const date  = item.approved_at ? fmtDate(item.approved_at) : '—';
        const isComm = !!item.community_name;
        return (
          <div key={idx} style={{
            padding: '10px 12px', borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${borderColor}`, background: bgColor,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
          }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                {isComm ? '🏛 Community' : '📅 Event'} · by {creator}
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{date}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminApprovals() {
  const [activeTab, setActiveTab] = useState('communities');
  const [pendingCommunities, setPendingCommunities] = useState([]);
  const [pendingEvents,      setPendingEvents]      = useState([]);
  const [recentlyApproved,   setRecentlyApproved]   = useState({ communities: [], events: [] });
  const [recentlyRejected,   setRecentlyRejected]   = useState({ communities: [], events: [] });
  const [loading,    setLoading]    = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [commRes, evtRes, approvedRes, rejectedRes] = await Promise.all([
        getPendingCommunities(),
        getPendingEvents(),
        getRecentlyApproved(10),
        getRecentlyRejected(10),
      ]);
      setPendingCommunities(commRes.data || []);
      setPendingEvents(evtRes.data || []);
      setRecentlyApproved(approvedRes.data || { communities: [], events: [] });
      setRecentlyRejected(rejectedRes.data || { communities: [], events: [] });
    } catch (err) {
      console.error(err);
      showToast('Failed to load approval data.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleAction = async (action, id, notes) => {
    setActionLoading(true);
    try {
      const fn = {
        approve_community: approveCommunity,
        reject_community:  rejectCommunity,
        changes_community: requestCommunityChanges,
        approve_event:     approveEvent,
        reject_event:      rejectEvent,
        changes_event:     requestEventChanges,
      }[action];
      await fn(id, notes);
      showToast('Action completed successfully!', 'success');
      await loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Action failed. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = [
    { key: 'communities', label: `Pending Communities`, count: pendingCommunities.length },
    { key: 'events',      label: `Pending Events`,      count: pendingEvents.length      },
    { key: 'approved',    label: 'Recently Approved',   count: null },
    { key: 'rejected',    label: 'Recently Rejected',   count: null },
  ];

  const recentApprovedAll = [
    ...(recentlyApproved.communities || []),
    ...(recentlyApproved.events      || []),
  ].sort((a, b) => new Date(b.approved_at) - new Date(a.approved_at));

  const recentRejectedAll = [
    ...(recentlyRejected.communities || []),
    ...(recentlyRejected.events      || []),
  ].sort((a, b) => new Date(b.approved_at) - new Date(a.approved_at));

  return (
    <AdminLayout activeTab="approvals">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 2000,
          padding: '12px 20px', borderRadius: 'var(--radius-md)', fontWeight: '600', fontSize: '0.875rem',
          background: toast.type === 'success' ? '#f0fdf4' : '#fff1f2',
          border: `1.5px solid ${toast.type === 'success' ? '#16a34a' : '#e11d48'}`,
          color: toast.type === 'success' ? '#15803d' : '#be123c',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          animation: 'fadeInDown 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

        {/* Header */}
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', fontFamily: 'Fraunces', margin: 0 }}>
            Content Approvals
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', margin: '4px 0 0' }}>
            Review and approve communities and events before they go live.
          </p>
        </div>

        {/* Summary badges */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            padding: '10px 18px', background: '#fff8e1', border: '1.5px solid #f59e0b',
            borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'Fraunces', color: '#92400e' }}>
              {pendingCommunities.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#78350f', fontFamily: 'JetBrains Mono' }}>PENDING COMMUNITIES</div>
          </div>
          <div style={{
            padding: '10px 18px', background: '#eff6ff', border: '1.5px solid #3b82f6',
            borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'Fraunces', color: '#1d4ed8' }}>
              {pendingEvents.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#1e40af', fontFamily: 'JetBrains Mono' }}>PENDING EVENTS</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--paper)', border: '1.5px solid var(--line-strong)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: 1, padding: '8px 12px', border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: activeTab === t.key ? '700' : '500',
                background: activeTab === t.key ? 'var(--marigold)' : 'transparent',
                color: activeTab === t.key ? 'var(--ink)' : 'var(--ink-soft)',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              {t.label}
              {t.count !== null && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: '700', padding: '1px 6px',
                  background: activeTab === t.key ? 'rgba(0,0,0,0.12)' : '#f59e0b',
                  color: activeTab === t.key ? 'var(--ink)' : '#fff',
                  borderRadius: '20px', minWidth: '18px', textAlign: 'center',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--ink-soft)', fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
            Loading approval queue…
          </div>
        ) : (
          <>
            {/* Pending Communities */}
            {activeTab === 'communities' && (
              <div>
                {pendingCommunities.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: 'var(--space-4)',
                    background: '#f0fdf4', border: '1.5px solid #86efac',
                    borderRadius: 'var(--radius-lg)', color: '#15803d',
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
                    <div style={{ fontWeight: '700', fontSize: '1rem' }}>All caught up!</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>No pending communities to review.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-2)' }}>
                    {pendingCommunities.map((c) => (
                      <CommunityCard key={c.community_id} community={c} onAction={handleAction} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pending Events */}
            {activeTab === 'events' && (
              <div>
                {pendingEvents.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: 'var(--space-4)',
                    background: '#f0fdf4', border: '1.5px solid #86efac',
                    borderRadius: 'var(--radius-lg)', color: '#15803d',
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
                    <div style={{ fontWeight: '700', fontSize: '1rem' }}>All caught up!</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>No pending events to review.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-2)' }}>
                    {pendingEvents.map((e) => (
                      <EventCard key={e.event_id} event={e} onAction={handleAction} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recently Approved */}
            {activeTab === 'approved' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-3)' }}>
                <div className="card" style={{ background: '#fff', border: '2px solid var(--ink)', padding: 'var(--space-3)' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: 'var(--space-2)' }}>
                    Recently Approved Communities
                  </h3>
                  <RecentList items={recentlyApproved.communities} type="approved" />
                </div>
                <div className="card" style={{ background: '#fff', border: '2px solid var(--ink)', padding: 'var(--space-3)' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: 'var(--space-2)' }}>
                    Recently Approved Events
                  </h3>
                  <RecentList items={recentlyApproved.events} type="approved" />
                </div>
              </div>
            )}

            {/* Recently Rejected */}
            {activeTab === 'rejected' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-3)' }}>
                <div className="card" style={{ background: '#fff', border: '2px solid var(--ink)', padding: 'var(--space-3)' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: 'var(--space-2)' }}>
                    Recently Rejected Communities
                  </h3>
                  <RecentList items={recentlyRejected.communities} type="rejected" />
                </div>
                <div className="card" style={{ background: '#fff', border: '2px solid var(--ink)', padding: 'var(--space-3)' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: 'var(--space-2)' }}>
                    Recently Rejected Events
                  </h3>
                  <RecentList items={recentlyRejected.events} type="rejected" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
