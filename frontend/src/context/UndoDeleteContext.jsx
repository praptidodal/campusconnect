import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { deletePost, undoDeletePost } from '../services/postService';
import { deleteCommunityPost, undoDeleteCommunityPost } from '../services/communityService';
import { deleteResource, undoDeleteResource } from '../services/resourceService';
import { deletePicture, undoDeletePicture } from '../services/profileService';

const UndoDeleteContext = createContext(null);

export const useUndoDelete = () => {
  const context = useContext(UndoDeleteContext);
  if (!context) {
    throw new Error('useUndoDelete must be used within an UndoDeleteProvider');
  }
  return context;
};

export const UndoDeleteProvider = ({ children }) => {
  const [pendingDeletes, setPendingDeletes] = useState([]);
  const callbacksRef = useRef({});

  // Helper to execute backend deletion for non-message types
  const triggerBackendDelete = async (type, payload) => {
    try {
      if (type === 'post') {
        await deletePost(payload);
      } else if (type === 'community_post') {
        await deleteCommunityPost(payload);
      } else if (type === 'resource') {
        await deleteResource(payload);
      } else if (type === 'avatar') {
        await deletePicture();
      }
    } catch (err) {
      console.error(`Failed to delete pending item of type ${type}:`, err);
    }
  };

  // Helper to execute backend undo for non-message types
  const triggerBackendUndo = async (type, payload) => {
    try {
      if (type === 'post') {
        await undoDeletePost(payload);
      } else if (type === 'community_post') {
        await undoDeleteCommunityPost(payload);
      } else if (type === 'resource') {
        await undoDeleteResource(payload);
      } else if (type === 'avatar') {
        await undoDeletePicture();
      }
    } catch (err) {
      console.error(`Failed to undo pending item of type ${type}:`, err);
    }
  };

  // Countdown timer — updates every second
  useEffect(() => {
    if (pendingDeletes.length === 0) return;

    const interval = setInterval(() => {
      setPendingDeletes(prev => {
        const updated = [];
        prev.forEach(item => {
          const elapsed = Date.now() - item.deletedAt;
          const timeLeft = Math.max(0, Math.ceil((60000 - elapsed) / 1000));

          if (timeLeft <= 0) {
            if (callbacksRef.current[item.id]?.executeDelete) {
              callbacksRef.current[item.id].executeDelete();
            }
            delete callbacksRef.current[item.id];
          } else {
            updated.push({ ...item, timeLeft });
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingDeletes]);

  // Enqueue a soft deletion and show undo toast
  const addPendingDelete = (id, label, type, payload, executeDelete, restoreItem) => {
    callbacksRef.current[id] = { executeDelete, restoreItem };
    triggerBackendDelete(type, payload);

    setPendingDeletes(prev => {
      const filtered = prev.filter(item => item.id !== id);
      return [
        ...filtered,
        { id, label, type, payload, deletedAt: Date.now(), timeLeft: 60 }
      ];
    });
  };

  // Undo action
  const undoDelete = async (id) => {
    const item = pendingDeletes.find(d => d.id === id);
    if (item) {
      await triggerBackendUndo(item.type, item.payload);

      if (callbacksRef.current[id]?.restoreItem) {
        callbacksRef.current[id].restoreItem();
      } else {
        window.location.reload();
      }

      setPendingDeletes(prev => prev.filter(d => d.id !== id));
      delete callbacksRef.current[id];
    }
  };

  // Skip timer and dismiss immediately
  const confirmDeleteImmediately = (id) => {
    const item = pendingDeletes.find(d => d.id === id);
    if (item) {
      if (callbacksRef.current[id]?.executeDelete) {
        callbacksRef.current[id].executeDelete();
      }
      setPendingDeletes(prev => prev.filter(d => d.id !== id));
      delete callbacksRef.current[id];
    }
  };

  return (
    <UndoDeleteContext.Provider value={{ pendingDeletes, addPendingDelete, undoDelete, confirmDeleteImmediately }}>
      {children}

      {pendingDeletes.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxWidth: '90%',
          width: 380,
        }}>
          {pendingDeletes.map(item => {
            const progressPercent = (item.timeLeft / 60) * 100;
            return (
              <div
                key={item.id}
                className="card fade-in"
                style={{
                  background: 'var(--paper)',
                  border: '2px solid var(--ink)',
                  boxShadow: 'var(--shadow)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  position: 'relative',
                  overflow: 'hidden',
                  margin: 0
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="eyebrow" style={{ color: 'var(--ink-faint)', fontSize: '0.68rem', marginBottom: 2 }}>
                      DELETING {item.type.toUpperCase().replace('_', ' ')}
                    </span>
                    <span style={{
                      fontFamily: 'Fraunces, serif',
                      fontSize: '0.925rem',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 200
                    }}>
                      {item.label}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: 'var(--coral)',
                    background: 'var(--coral-tint)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--coral)'
                  }}>
                    {item.timeLeft}s
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
                  <button
                    onClick={() => confirmDeleteImmediately(item.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', height: 'auto', minHeight: 0, padding: '4px 8px', color: 'var(--ink-faint)' }}
                  >
                    Delete Now
                  </button>
                  <button
                    onClick={() => undoDelete(item.id)}
                    className="btn btn-outline btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      height: 'auto',
                      minHeight: 0,
                      padding: '4px 12px',
                      background: 'var(--marigold)',
                      borderColor: 'var(--ink)',
                      color: 'var(--ink)'
                    }}
                  >
                    Undo
                  </button>
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: 3,
                  width: `${progressPercent}%`,
                  background: 'var(--marigold)',
                  transition: 'width 1s linear'
                }} />
              </div>
            );
          })}
        </div>
      )}
    </UndoDeleteContext.Provider>
  );
};
