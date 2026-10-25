import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NameWithVerification from '../components/NameWithVerification';
import { getCommunityDetails, getCommunityMembers, promoteMember } from '../services/communityService';
import { useAuth } from '../context/AuthContext';
import SetMemberPositionModal from '../components/SetMemberPositionModal';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function roleBadgeClass(role) {
  const map = {
    owner: 'role-club',
    admin: 'role-admin',
    member: 'role-student',
  };
  return map[role] || 'role-student';
}

export default function CommunityMembersPage() {
  const { communityId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const [selectedMemberForPosition, setSelectedMemberForPosition] = useState(null);


  const loadData = async () => {
    try {
      const [commRes, memRes] = await Promise.all([
        getCommunityDetails(communityId),
        getCommunityMembers(communityId),
      ]);
      setCommunity(commRes.data);
      setMembers(memRes.data);
    } catch {
      setError('Failed to load community members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [communityId]);

  const handleRoleAction = async (userId, targetRole) => {
    let confirmMsg = `Are you sure you want to change this user's role to ${targetRole}?`;
    if (targetRole === 'owner') {
      confirmMsg = `WARNING: Transferring ownership will demote you to an Admin and make this user the Owner. Are you sure you want to proceed?`;
    }
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      await promoteMember(communityId, { user_id: userId, role: targetRole });
      
      // Reload members list and details to refresh roles
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Failed to update member role.');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar active="communities" subtitle="Members" />
        <main className="app-main">
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
            <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
            <p className="eyebrow">Loading members list</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="app-shell">
        <Sidebar active="communities" subtitle="Error" />
        <main className="app-main">
          <div style={{ padding: 'var(--space-4)' }}>
            <div className="alert alert-error">{error || 'Community not found'}</div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/communities')} style={{ marginTop: 'var(--space-2)' }}>
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  const isCurrentUserOwner = community.role === 'owner';

  return (
    <div className="app-shell">
      <Sidebar active="communities" subtitle={`${community.community_name} Members`} />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/communities/${communityId}`)}>
            Back
          </button>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1, paddingLeft: 'var(--space-2)' }}>
            {community.community_name} Members
          </span>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 720 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-3)' }}>
            Members Directory
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {members.map(member => {
              const isSelf = currentUser && member.user_id === currentUser.user_id;
              
              return (
                <div key={member.user_id} className="card fade-in" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {/* Initials Avatar */}
                  <div className="avatar" style={{ width: 40, height: 40, fontSize: '0.85rem' }}>
                    {initials(member.name)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)' }}>
                        <NameWithVerification user={{ name: member.name, role: member.system_role, is_verified: member.is_verified }} /> {isSelf && '(You)'}
                      </span>
                      <span className={`role-badge ${roleBadgeClass(member.role)}`} style={{ textTransform: 'capitalize' }}>
                        {member.role}
                      </span>
                      {member.position && (
                        <span className="tag tag-quad" style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px' }}>
                          ★ {member.position}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                      {member.department && (
                        <span className="eyebrow" style={{ color: 'var(--ink-soft)' }}>
                          {member.department}
                        </span>
                      )}
                      <span className="eyebrow" style={{ color: 'var(--ink-faint)' }}>
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Leader Controls: Position + Role management */}
                  {(isCurrentUserOwner || community.role === 'admin' || currentUser?.role === 'admin') && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setSelectedMemberForPosition(member)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.78rem', borderColor: 'var(--quad)', color: 'var(--quad)' }}
                      >
                        {member.position ? 'Edit Position' : '+ Assign Position'}
                      </button>

                      {isCurrentUserOwner && !isSelf && (
                        <>
                          {member.role === 'member' && (
                            <button
                              disabled={actionLoading[member.user_id]}
                              onClick={() => handleRoleAction(member.user_id, 'admin')}
                              className="btn btn-outline btn-sm"
                            >
                              Make Admin
                            </button>
                          )}
                          {member.role === 'admin' && (
                            <button
                              disabled={actionLoading[member.user_id]}
                              onClick={() => handleRoleAction(member.user_id, 'member')}
                              className="btn btn-outline btn-sm"
                            >
                              Demote
                            </button>
                          )}
                          <button
                            disabled={actionLoading[member.user_id]}
                            onClick={() => handleRoleAction(member.user_id, 'owner')}
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--marigold-deep)', borderColor: 'var(--marigold)' }}
                          >
                            Transfer Owner
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <SetMemberPositionModal
        isOpen={Boolean(selectedMemberForPosition)}
        onClose={() => setSelectedMemberForPosition(null)}
        communityId={communityId}
        member={selectedMemberForPosition}
        onPositionUpdated={(userId, newPosition) => {
          setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, position: newPosition } : m));
        }}
      />
    </div>
  );
}
