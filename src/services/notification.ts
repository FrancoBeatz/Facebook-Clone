import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase/config";
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
    // If you send notification to yourself, ignore
    if (receiverId === senderId) return;

    const notifColRef = collection(db, "notifications");
    const docRef = doc(notifColRef);
    const path = `notifications/${docRef.id}`;

    try {
      const newNotification: Notification = {
        id: docRef.id,
        type,
        receiverId,
        senderId,
        senderName,
        senderAvatar,
        postId: postId || "",
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      await setDoc(docRef, newNotification);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  listenToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const path = "notifications";
    const q = query(
      collection(db, "notifications"),
      where("receiverId", "==", userId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Notification[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Notification);
        });
        // Sort chronologically client-side
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    const path = `notifications/${notificationId}`;
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        isRead: true,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async deleteNotification(notificationId: string): Promise<void> {
    const path = `notifications/${notificationId}`;
    try {
      await deleteDoc(doc(db, "notifications", notificationId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }
};
