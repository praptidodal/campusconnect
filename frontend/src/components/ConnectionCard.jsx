import React from 'react';
import { useNavigate } from 'react-router-dom';
import ConnectionButton from './ConnectionButton';
import NameWithVerification from './NameWithVerification';

function initials(name) {
  const cleanName = typeof name === 'string' ? name : '';
  return cleanName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function roleMeta(role) {
  const map = {
    student: 'role-student',
    faculty: 'role-faculty',
    club:    'role-club',
    admin:   'role-admin',
  };
  return map[role] || 'role-student';
}

export default function ConnectionCard({ connection, onStatusChange }) {
  const navigate = useNavigate();

  return (
    <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div
          onClick={() => navigate(`/profile/${connection.user_id}`)}
          className="avatar avatar-md clickable"
          style={{ flexShrink: 0 }}
        >
          {connection.profile_picture ? (
            <img
              src={connection.profile_picture}
              alt={connection.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            initials(connection.name)
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4
            onClick={() => navigate(`/profile/${connection.user_id}`)}
            style={{
              fontFamily: 'Fraunces, serif',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--ink)',
              margin: '0 0 3px 0',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <NameWithVerification user={connection} nameStyle={{ color: 'var(--ink)' }} />
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', marginBottom: 4 }}>
            <span className={`role-badge ${roleMeta(connection.role)}`}>{connection.role}</span>
            {connection.department && (
              <span className="eyebrow" style={{ color: 'var(--ink-faint)', fontSize: '0.7rem' }}>
                {connection.department}
              </span>
            )}
          </div>
          {connection.headline && (
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--ink-soft)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {connection.headline}
            </p>
          )}
          {connection.mutual_count > 0 && (
            <p style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', margin: '4px 0 0 0' }}>
              {connection.mutual_count} mutual {connection.mutual_count === 1 ? 'connection' : 'connections'}
            </p>
          )}
        </div>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8, width: '100%' }}>
        <ConnectionButton
          targetUserId={connection.user_id}
          targetUserName={connection.name}
          initialStatusInfo={{
            status: 'connected',
            requestId: null,
            connectionId: connection.connection_id
          }}
          onStatusChange={onStatusChange}
          size="sm"
        />
      </div>
    </div>
  );
}
