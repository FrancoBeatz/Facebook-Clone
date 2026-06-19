import { supabase, isSupabaseConfigured, localDb, pubsub } from "../supabase/client";
import { Notification } from "../types";

export const NotificationService = {
  async createNotification(
    type: "like" | "comment" | "friend_request" | "friend_accept" | "message",
    receiverId: string,
    senderId: string,
    senderName: string,
    senderAvatar: string,
    postId?: string
  ): Promise<void> {
    if (receiverId === senderId) return;

    const id = "notif_" + Math.random().toString(36).substring(3) + "_" + Date.now();
    const newNotification: Notification = {
      id,
      type,
      receiverId,
      senderId,
      senderName,
      senderAvatar,
      postId: postId || "",
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("notifications").insert(newNotification);
      } else {
        const list = localDb.get<Notification[]>("notifications", []);
        list.push(newNotification);
        localDb.set("notifications", list);
      }
    } catch (err) {
      console.error("Error creating notification:", err);
    }
  },

  listenToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const fetchNotifications = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("receiverId", userId)
          .order("createdAt", { ascending: false });
        if (error) throw error;
        return (data || []) as Notification[];
      } else {
        const list = localDb.get<Notification[]>("notifications", []);
        return list
          .filter((n) => n.receiverId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    };

    fetchNotifications().then(callback).catch((err) => console.warn(err));

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`notifications-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, async () => {
          const list = await fetchNotifications();
          callback(list);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      return pubsub.subscribe("notifications", async () => {
        const list = await fetchNotifications();
        callback(list);
      });
    }
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from("notifications")
          .update({ isRead: true })
          .eq("id", notificationId);
      } else {
        const list = localDb.get<Notification[]>("notifications", []);
        const updated = list.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n));
        localDb.set("notifications", updated);
      }
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  },

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("notifications").delete().eq("id", notificationId);
      } else {
        const list = localDb.get<Notification[]>("notifications", []);
        const filtered = list.filter((n) => n.id !== notificationId);
        localDb.set("notifications", filtered);
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  },
};
