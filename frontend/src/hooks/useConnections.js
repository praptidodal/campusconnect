import { useState, useEffect, useCallback, useRef } from 'react';
import * as service from '../services/connectionService';

// Global cache of states: userId -> { status, requestId, connectionId }
const statusCache = {};
const countCache = {};

// Listener list
const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error in connection listener:', e);
    }
  });
};

export const updateGlobalConnectionStatus = (userId, status, requestId = null, connectionId = null) => {
  const parsedId = userId ? (typeof userId === 'string' ? parseInt(userId, 10) : userId) : null;
  if (!parsedId) return;
  statusCache[parsedId] = { status, requestId, connectionId };
  notifyListeners();
};

export const setGlobalConnectionCount = (userId, count) => {
  const parsedId = userId ? (typeof userId === 'string' ? parseInt(userId, 10) : userId) : null;
  if (!parsedId) return;
  countCache[parsedId] = count;
  notifyListeners();
};

export function useConnections(userId, initialStatusInfo) {
  const parsedUserId = userId ? (typeof userId === 'string' ? parseInt(userId, 10) : userId) : null;

  // Initialize status from global cache, initialStatusInfo prop, or default
  const getInitialStatus = () => {
    if (parsedUserId) {
      if (statusCache[parsedUserId]) {
        return { ...statusCache[parsedUserId] };
      }
      if (initialStatusInfo && initialStatusInfo.status) {
        const seeded = {
          status: initialStatusInfo.status,
          requestId: initialStatusInfo.requestId || null,
          connectionId: initialStatusInfo.connectionId || null,
        };
        statusCache[parsedUserId] = seeded;
        return seeded;
      }
    }
    return { status: 'none', requestId: null, connectionId: null };
  };

  const [statusInfo, setStatusInfo] = useState(getInitialStatus);
  const [connectionCount, setConnectionCount] = useState(() => {
    if (parsedUserId && countCache[parsedUserId] !== undefined) {
      return countCache[parsedUserId];
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update state when parsedUserId changes
  useEffect(() => {
    if (!parsedUserId) {
      setStatusInfo({ status: 'none', requestId: null, connectionId: null });
      setConnectionCount(null);
      return;
    }

    // Immediately reflect cache or prop if available
    if (statusCache[parsedUserId]) {
      setStatusInfo({ ...statusCache[parsedUserId] });
    } else if (initialStatusInfo && initialStatusInfo.status) {
      const seeded = {
        status: initialStatusInfo.status,
        requestId: initialStatusInfo.requestId || null,
        connectionId: initialStatusInfo.connectionId || null,
      };
      statusCache[parsedUserId] = seeded;
      setStatusInfo(seeded);
    }

    if (countCache[parsedUserId] !== undefined) {
      setConnectionCount(countCache[parsedUserId]);
    }
  }, [parsedUserId]);

  // Sync with global cache and list of subscribers
  useEffect(() => {
    if (!parsedUserId) return;

    const handleChange = () => {
      if (!isMountedRef.current) return;
      if (statusCache[parsedUserId]) {
        setStatusInfo({ ...statusCache[parsedUserId] });
      }
      if (countCache[parsedUserId] !== undefined) {
        setConnectionCount(countCache[parsedUserId]);
      }
    };

    listeners.add(handleChange);

    // Perform live fetch from backend to ensure data is always fresh and accurate
    let isSubscribed = true;
    const fetchLatest = async () => {
      try {
        const [statusRes, countRes] = await Promise.all([
          service.getConnectionStatus(parsedUserId),
          service.getConnectionCount(parsedUserId),
        ]);
        if (!isSubscribed) return;

        const newStatus = {
          status: statusRes.data.status,
          requestId: statusRes.data.request_id || null,
          connectionId: statusRes.data.connection_id || null,
        };
        statusCache[parsedUserId] = newStatus;
        countCache[parsedUserId] = countRes.data.connection_count;

        if (isMountedRef.current) {
          setStatusInfo(newStatus);
          setConnectionCount(countRes.data.connection_count);
        }
      } catch (err) {
        // Silently keep existing cache if offline/error on passive background sync
        if (isMountedRef.current && !statusCache[parsedUserId]) {
          setError(err.response?.data?.message || 'Failed to load connections data.');
        }
      }
    };

    fetchLatest();

    return () => {
      isSubscribed = false;
      listeners.delete(handleChange);
    };
  }, [parsedUserId]);

  const sendRequest = useCallback(async () => {
    if (!parsedUserId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await service.sendConnectionRequest(parsedUserId);
      const reqId = res.data.request_id || res.data.requestId || null;
      const updated = {
        status: 'pending_sent',
        requestId: reqId,
        connectionId: null,
      };
      statusCache[parsedUserId] = updated;
      if (isMountedRef.current) {
        setStatusInfo(updated);
      }
      window.dispatchEvent(
        new CustomEvent('connections-changed', {
          detail: { userId: parsedUserId, status: 'pending_sent', requestId: reqId, action: 'send_request' },
        })
      );
      notifyListeners();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.message || err.message || 'Failed to send connection request.';
      if (isMountedRef.current) {
        setError(msg);
      }
      throw new Error(msg);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [parsedUserId]);

  const accept = useCallback(async (requestId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await service.acceptConnection(requestId);
      const connId = res.data.connection_id || res.data.connectionId || null;
      if (parsedUserId) {
        const updated = {
          status: 'connected',
          requestId: null,
          connectionId: connId,
        };
        statusCache[parsedUserId] = updated;
        if (countCache[parsedUserId] !== undefined) {
          countCache[parsedUserId] += 1;
        }
        if (isMountedRef.current) {
          setStatusInfo(updated);
          if (countCache[parsedUserId] !== undefined) {
            setConnectionCount(countCache[parsedUserId]);
          }
        }
      }
      window.dispatchEvent(
        new CustomEvent('connections-changed', {
          detail: { userId: parsedUserId, status: 'connected', connectionId: connId, action: 'accept' },
        })
      );
      notifyListeners();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.message || err.message || 'Failed to accept connection request.';
      if (isMountedRef.current) {
        setError(msg);
      }
      throw new Error(msg);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [parsedUserId]);

  const reject = useCallback(async (requestId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await service.rejectConnection(requestId);
      if (parsedUserId) {
        const updated = {
          status: 'none',
          requestId: null,
          connectionId: null,
        };
        statusCache[parsedUserId] = updated;
        if (isMountedRef.current) {
          setStatusInfo(updated);
        }
      }
      window.dispatchEvent(
        new CustomEvent('connections-changed', {
          detail: { userId: parsedUserId, status: 'none', action: 'reject' },
        })
      );
      notifyListeners();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.message || err.message || 'Failed to reject connection request.';
      if (isMountedRef.current) {
        setError(msg);
      }
      throw new Error(msg);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [parsedUserId]);

  const withdraw = useCallback(async (requestId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await service.withdrawConnection(requestId);
      if (parsedUserId) {
        const updated = {
          status: 'none',
          requestId: null,
          connectionId: null,
        };
        statusCache[parsedUserId] = updated;
        if (isMountedRef.current) {
          setStatusInfo(updated);
        }
      }
      window.dispatchEvent(
        new CustomEvent('connections-changed', {
          detail: { userId: parsedUserId, status: 'none', action: 'withdraw' },
        })
      );
      notifyListeners();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.message || err.message || 'Failed to withdraw connection request.';
      if (isMountedRef.current) {
        setError(msg);
      }
      throw new Error(msg);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [parsedUserId]);

  const remove = useCallback(async () => {
    if (!parsedUserId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await service.removeConnection(parsedUserId);
      const updated = {
        status: 'none',
        requestId: null,
        connectionId: null,
      };
      statusCache[parsedUserId] = updated;
      if (countCache[parsedUserId] !== undefined) {
        countCache[parsedUserId] = Math.max(0, countCache[parsedUserId] - 1);
      }
      if (isMountedRef.current) {
        setStatusInfo(updated);
        if (countCache[parsedUserId] !== undefined) {
          setConnectionCount(countCache[parsedUserId]);
        }
      }
      window.dispatchEvent(
        new CustomEvent('connections-changed', {
          detail: { userId: parsedUserId, status: 'none', action: 'remove' },
        })
      );
      notifyListeners();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.message || err.message || 'Failed to remove connection.';
      if (isMountedRef.current) {
        setError(msg);
      }
      throw new Error(msg);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [parsedUserId]);

  const refetch = useCallback(async () => {
    if (!parsedUserId) return;
    setLoading(true);
    setError(null);
    try {
      const [statusRes, countRes] = await Promise.all([
        service.getConnectionStatus(parsedUserId),
        service.getConnectionCount(parsedUserId),
      ]);
      const newStatus = {
        status: statusRes.data.status,
        requestId: statusRes.data.request_id || null,
        connectionId: statusRes.data.connection_id || null,
      };
      statusCache[parsedUserId] = newStatus;
      countCache[parsedUserId] = countRes.data.connection_count;
      if (isMountedRef.current) {
        setStatusInfo(newStatus);
        setConnectionCount(countRes.data.connection_count);
      }
      notifyListeners();
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.response?.data?.message || 'Failed to load connections.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [parsedUserId]);

  return {
    status: statusInfo.status,
    requestId: statusInfo.requestId,
    connectionId: statusInfo.connectionId,
    connectionCount,
    loading,
    error,
    sendRequest,
    accept,
    reject,
    withdraw,
    remove,
    refetch,
    updateStatusInCache: (status, reqId = null, connId = null) => {
      if (parsedUserId) {
        statusCache[parsedUserId] = { status, requestId: reqId, connectionId: connId };
        if (isMountedRef.current) {
          setStatusInfo({ status, requestId: reqId, connectionId: connId });
        }
        notifyListeners();
      }
    },
  };
}
