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

export default function RequestCard({ request, type, onAction }) {
  const navigate = useNavigate();
  const isIncoming = type === 'incoming';

  const userId = isIncoming ? request.sender_id : request.receiver_id;
  const userName = isIncoming ? request.sender_name : request.receiver_name;
  const userRole = isIncoming ? request.sender_role : request.receiver_role;
  const userPicture = isIncoming ? request.sender_picture : request.receiver_picture;
  const userDepartment = isIncoming ? request.sender_department : request.receiver_department;
  const mutualCount = isIncoming ? request.mutual_count : 0;

  return (
    <div className="card fade-in" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div
        onClick={() => navigate(`/profile/${userId}`)}
        className="avatar avatar-md clickable"
        style={{ flexShrink: 0 }}
      >
        {userPicture ? (
          <img
            src={userPicture}
            alt={userName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          initials(userName)
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h4
          onClick={() => navigate(`/profile/${userId}`)}
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
          <NameWithVerification user={{ name: userName, role: userRole, is_verified: isIncoming ? request.sender_verified : request.receiver_verified }} nameStyle={{ color: 'var(--ink)' }} />
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', marginBottom: 8 }}>
          <span className={`role-badge ${roleMeta(userRole)}`}>{userRole}</span>
          {userDepartment && (
            <span className="eyebrow" style={{ color: 'var(--ink-faint)', fontSize: '0.7rem' }}>
              {userDepartment}
            </span>
          )}
        </div>
        {isIncoming && mutualCount > 0 && (
          <p style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', marginBottom: 8 }}>
            {mutualCount} mutual {mutualCount === 1 ? 'connection' : 'connections'}
          </p>
        )}
        <ConnectionButton
          targetUserId={userId}
          targetUserName={userName}
          initialStatusInfo={{
            status: isIncoming ? 'pending_received' : 'pending_sent',
            requestId: request.request_id,
            connectionId: null
          }}
          onStatusChange={onAction}
          size="sm"
        />
      </div>
    </div>
  );
}
