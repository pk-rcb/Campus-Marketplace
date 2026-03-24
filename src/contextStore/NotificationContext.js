import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from 'backend/config';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext(null);

function NotificationProvider({ children }) {
  const { user } = React.useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id && !user?.uid) return;
    const userId = user.id || user.uid;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return;
    }

    const list = data.map((d) => {
      // Normalize the `data` JSON field from snake_case to camelCase
      let normalizedData = d.data || {};
      if (typeof normalizedData === 'string') {
        try { normalizedData = JSON.parse(normalizedData); } catch { normalizedData = {}; }
      }
      if (normalizedData.offer_id && !normalizedData.offerId) normalizedData.offerId = normalizedData.offer_id;
      if (normalizedData.product_id && !normalizedData.productId) normalizedData.productId = normalizedData.product_id;
      return {
        ...d,
        data: normalizedData,
        createdAt: d.created_at ? new Date(d.created_at).getTime() : 0,
        imageUrl: d.image_url,
        actionUrl: d.action_url,
      };
    });

    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.read).length);
  }, [user?.id, user?.uid]);

  useEffect(() => {
    if (!user?.id && !user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const userId = user.id || user.uid;
    fetchNotifications();

    // Subscribe to realtime changes (channel name scoped per user)
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.uid, fetchNotifications]);

  const markAsRead = useCallback(
    async (notificationId) => {
      const userId = user?.id || user?.uid;
      if (!notificationId || !userId) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    },
    [user?.id, user?.uid]
  );

  const markAllRead = useCallback(async () => {
    const userId = user?.id || user?.uid;
    if (!userId) return;

    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds)
      .eq('user_id', userId);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }, [user?.id, user?.uid, notifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAllRead,
    }),
    [notifications, unreadCount, markAsRead, markAllRead]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;
