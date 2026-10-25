import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as service from '../services/notificationService';
import { acceptConnection, rejectConnection } from '../services/connectionService';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const loadUnreadCount = async () => {
    try {
      const res = await service.getUnreadCount();
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const loadLatestNotifications = async () => {
    setLoading(true);
    try {
      const res = await service.getNotifications({ skip: 0, limit: 20 });
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Connect WebSocket and fetch initial state when user log state changes
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    loadUnreadCount();
    loadLatestNotifications();

    let ws = null;
    let reconnectTimeout = null;
    let reconnectDelay = 1000;
    let active = true;

    const connect = () => {
      const token = localStorage.getItem('cc_token');
      if (!token || !active) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/notifications?token=${token}`;
      
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Websocket notifications connected');
        reconnectDelay = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setNotifications((prev) => {
            if (prev.some((n) => n.notification_id === payload.notification_id)) {
              return prev;
            }
            setUnreadCount((c) => c + 1);
            return [payload, ...prev.slice(0, 19)];
          });
        } catch (err) {
          console.error('Error parsing incoming WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('Websocket notifications closed:', event.reason);
        ws = null;
        if (active && localStorage.getItem('cc_token')) {
          console.log(`Scheduling websocket reconnect in ${reconnectDelay}ms`);
          reconnectTimeout = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 16000);
            connect();
          }, reconnectDelay);
        }
      };

      ws.onerror = (err) => {
        console.error('Websocket notifications error:', err);
        if (ws) {
          ws.close();
        }
      };
    };

    connect();

    return () => {
      console.log('Cleaning up NotificationContext WebSocket...');
      active = false;
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user]);

  // Sync notifications on connections-changed event (e.g. actions from Pending Requests tab)
  useEffect(() => {
    const handleConnectionsChanged = () => {
      if (user) {
        loadUnreadCount();
        loadLatestNotifications();
      }
    };
    window.addEventListener('connections-changed', handleConnectionsChanged);
    return () => {
      window.removeEventListener('connections-changed', handleConnectionsChanged);
    };
  }, [user]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await service.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await service.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    const target = notifications.find((n) => n.notification_id === notificationId);
    const wasUnread = target ? !target.is_read : false;
    try {
      await service.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleAcceptConnection = async (requestId, notificationId) => {
    try {
      await acceptConnection(requestId);
      window.dispatchEvent(new CustomEvent('connections-changed'));
      if (notificationId) {
        setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
        setUnreadCount((prev) => Math.max(0, prev - 1));
        try {
          await service.deleteNotification(notificationId);
        } catch {}
      }
    } catch (err) {
      console.error('Failed to accept connection request:', err);
      // Even if API returns 404 (indicating request already processed), clean up the obsolete notification
      if (notificationId) {
        setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
        setUnreadCount((prev) => Math.max(0, prev - 1));
        try {
          await service.deleteNotification(notificationId);
        } catch {}
      }
    }
  };

  const handleRejectConnection = async (requestId, notificationId) => {
    try {
      await rejectConnection(requestId);
      window.dispatchEvent(new CustomEvent('connections-changed'));
      if (notificationId) {
        setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
        setUnreadCount((prev) => Math.max(0, prev - 1));
        try {
          await service.deleteNotification(notificationId);
        } catch {}
      }
    } catch (err) {
      console.error('Failed to reject connection request:', err);
      // Even if API returns 404 (indicating request already processed), clean up the obsolete notification
      if (notificationId) {
        setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
        setUnreadCount((prev) => Math.max(0, prev - 1));
        try {
          await service.deleteNotification(notificationId);
        } catch {}
      }
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        deleteNotification: handleDeleteNotification,
        refreshNotifications: loadLatestNotifications,
        refreshUnreadCount: loadUnreadCount,
        acceptConnectionRequest: handleAcceptConnection,
        rejectConnectionRequest: handleRejectConnection,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
