import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getPreferences, updatePreferences } from '../services/notificationService';

export default function NotificationSettingsPage() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    follow_notifications: true,
    like_notifications: true,
    comment_notifications: true,
    community_notifications: true,
    event_notifications: true,
    collaboration_notifications: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const res = await getPreferences();
        setPreferences(res.data);
      } catch (err) {
        setError('Failed to load notification settings.');
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const handleToggle = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSuccess('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updatePreferences(preferences);
      setSuccess('Settings updated successfully!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to save notification settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar active="notifications" />
      <main className="app-main">
        {/* Topbar */}
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/notifications')}>
            Back
          </button>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1, paddingLeft: 'var(--space-2)' }}>
            Notification Settings
          </span>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 640 }}>
          <div className="pin-card pin-marigold fade-in">
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-1)' }}>
              Configure Notifications
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', marginBottom: 'var(--space-4)' }}>
              Choose which channels and activities trigger instant pushes and database notifications.
            </p>

            {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>{error}</div>}
            {success && <div className="alert alert-success" style={{ marginBottom: 'var(--space-3)' }}>{success}</div>}

            {loading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--ink-faint)' }}>
                <div className="spinner spinner-ink" style={{ width: 24, height: 24, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
                <p className="eyebrow">Retrieving preferences...</p>
              </div>
            ) : (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                
                {/* Preferences Toggles List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* Follow */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Follow Notifications</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>Get notified when classmates follow your profile.</p>
                    </div>
                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                      <input
                        type="checkbox"
                        checked={preferences.follow_notifications}
                        onChange={() => handleToggle('follow_notifications')}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className="slider" style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: preferences.follow_notifications ? 'var(--quad)' : 'var(--line-strong)',
                        transition: 'background-color 200ms ease', borderRadius: 24
                      }}>
                        <span style={{
                          position: 'absolute', height: 18, width: 18, left: preferences.follow_notifications ? 22 : 4, bottom: 3,
                          backgroundColor: '#white', transition: 'left 200ms ease', borderRadius: '50%', background: '#fff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Likes */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Like Notifications</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>Receive alert when someone likes your social posts.</p>
                    </div>
                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                      <input
                        type="checkbox"
                        checked={preferences.like_notifications}
                        onChange={() => handleToggle('like_notifications')}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className="slider" style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: preferences.like_notifications ? 'var(--quad)' : 'var(--line-strong)',
                        transition: 'background-color 200ms ease', borderRadius: 24
                      }}>
                        <span style={{
                          position: 'absolute', height: 18, width: 18, left: preferences.like_notifications ? 22 : 4, bottom: 3,
                          backgroundColor: '#white', transition: 'left 200ms ease', borderRadius: '50%', background: '#fff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Comments */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Comment Notifications</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>Receive alert when comments are made on your posts.</p>
                    </div>
                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                      <input
                        type="checkbox"
                        checked={preferences.comment_notifications}
                        onChange={() => handleToggle('comment_notifications')}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className="slider" style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: preferences.comment_notifications ? 'var(--quad)' : 'var(--line-strong)',
                        transition: 'background-color 200ms ease', borderRadius: 24
                      }}>
                        <span style={{
                          position: 'absolute', height: 18, width: 18, left: preferences.comment_notifications ? 22 : 4, bottom: 3,
                          backgroundColor: '#white', transition: 'left 200ms ease', borderRadius: '50%', background: '#fff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Communities */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Community Notifications</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>Get alerts when users join your club, or when new posts are shared in communities.</p>
                    </div>
                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                      <input
                        type="checkbox"
                        checked={preferences.community_notifications}
                        onChange={() => handleToggle('community_notifications')}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className="slider" style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: preferences.community_notifications ? 'var(--quad)' : 'var(--line-strong)',
                        transition: 'background-color 200ms ease', borderRadius: 24
                      }}>
                        <span style={{
                          position: 'absolute', height: 18, width: 18, left: preferences.community_notifications ? 22 : 4, bottom: 3,
                          backgroundColor: '#white', transition: 'left 200ms ease', borderRadius: '50%', background: '#fff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Events */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Event Notifications</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>Receive alert when someone registers for your event, or when community hosts events.</p>
                    </div>
                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                      <input
                        type="checkbox"
                        checked={preferences.event_notifications}
                        onChange={() => handleToggle('event_notifications')}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className="slider" style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: preferences.event_notifications ? 'var(--quad)' : 'var(--line-strong)',
                        transition: 'background-color 200ms ease', borderRadius: 24
                      }}>
                        <span style={{
                          position: 'absolute', height: 18, width: 18, left: preferences.event_notifications ? 22 : 4, bottom: 3,
                          backgroundColor: '#white', transition: 'left 200ms ease', borderRadius: '50%', background: '#fff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Collaborations */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Collaboration Toggles</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>Get alert when users apply to your posting, or when your application status updates.</p>
                    </div>
                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                      <input
                        type="checkbox"
                        checked={preferences.collaboration_notifications}
                        onChange={() => handleToggle('collaboration_notifications')}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className="slider" style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: preferences.collaboration_notifications ? 'var(--quad)' : 'var(--line-strong)',
                        transition: 'background-color 200ms ease', borderRadius: 24
                      }}>
                        <span style={{
                          position: 'absolute', height: 18, width: 18, left: preferences.collaboration_notifications ? 22 : 4, bottom: 3,
                          backgroundColor: '#white', transition: 'left 200ms ease', borderRadius: '50%', background: '#fff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                        }} />
                      </span>
                    </label>
                  </div>

                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
