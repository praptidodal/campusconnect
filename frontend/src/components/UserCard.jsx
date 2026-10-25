import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

/**
 * Reusable user card for Discovery, Followers, and Following pages.
 *
 * Props:
 *   user           — { user_id, name, role, department, skills[], profile_picture, is_following }
 *   showFollowBtn  — show follow/unfollow button (default true)
 *   compact        — smaller layout for follower/following lists (default false)
 */
export default function UserCard({ user, showFollowBtn = true, compact = false }) {
  const navigate  = useNavigate();
  const { user: currentUser } = useAuth();
  const isSelf = currentUser && currentUser.user_id === user.user_id;
  const renderFollow = showFollowBtn && !isSelf;

  const goToProfile = () => navigate(`/profile/${user.user_id}`);

  return (
    <div
      className="card"
      style={{ cursor: 'default', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
        {/* Avatar — clickable to view profile */}
        <div
          className="avatar avatar-lg clickable"
          onClick={goToProfile}
          title="View profile"
          style={{ flexShrink: 0 }}
        >
          {user.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={user.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            initials(user.name)
          )}
        </div>

        {/* Identity — name clickable to view profile */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'Fraunces, serif', fontWeight: 600,
              fontSize: compact ? '0.95rem' : '1rem',
              color: 'var(--ink)', marginBottom: 3,
              cursor: 'pointer', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            onClick={goToProfile}
          >
            <NameWithVerification user={user} badgeSize={14} />
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
            {user.role && (
              <span className={`role-badge ${roleMeta(user.role)}`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            )}
            {user.department && (
              <span className="eyebrow" style={{ color: 'var(--ink-faint)' }}>
                {user.department}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Skills */}
      {!compact && user.skills && user.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {user.skills.map(s => (
            <span key={s} className="tag tag-quad">{s}</span>
          ))}
        </div>
      )}

      {/* Suggestion reasons */}
      {!compact && user.reasons && user.reasons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {user.reasons.map((reason, i) => (
            <span
              key={i}
              className="tag tag-quad"
              style={{
                fontSize: '0.65rem',
                padding: '1px 5px',
                textTransform: 'none',
                backgroundColor: 'var(--quad-tint)'
              }}
            >
              {reason}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons — only rendered when follow button is visible */}
      {renderFollow && (
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
          <ConnectionButton
            targetUserId={user.user_id}
            targetUserName={user.name}
            initialStatusInfo={{
              status: user.connection_status,
              requestId: user.request_id,
              connectionId: user.connection_id
            }}
          />
        </div>
      )}
    </div>
  );
}
