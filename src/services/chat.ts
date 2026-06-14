import {
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  addDoc,
  where,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, handleFirestoreError, OperationType } from "../firebase/config";
import { ChatRoom, Message } from "../types";

export const ChatService = {
  getRoomId(user1: string, user2: string): string {
    return [user1, user2].sort().join("_");
  },

  async getOrCreateChatRoom(user1Id: string, user2Id: string): Promise<string> {
    const roomId = this.getRoomId(user1Id, user2Id);
    const path = `chats/${roomId}`;
    try {
      const docRef = doc(db, "chats", roomId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const newRoom: ChatRoom = {
          roomId,
          participants: [user1Id, user2Id],
          lastMessage: "",
          lastMessageAt: new Date().toISOString(),
          typing: {
            [user1Id]: false,
            [user2Id]: false,
          },
        };
        await setDoc(docRef, newRoom);
      }
      return roomId;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  listenToChatRooms(userId: string, callback: (rooms: ChatRoom[]) => void) {
    const path = "chats";
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const rooms: ChatRoom[] = [];
        snapshot.forEach((docSnap) => {
          rooms.push(docSnap.data() as ChatRoom);
        });
        // Sort rooms by last message time
        rooms.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
        callback(rooms);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  listenToMessages(roomId: string, callback: (messages: Message[]) => void) {
    const path = `chats/${roomId}/messages`;
    const q = query(collection(db, "chats", roomId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const messages: Message[] = [];
        snapshot.forEach((docSnap) => {
          messages.push(docSnap.data() as Message);
        });
        callback(messages);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async sendMessage(
    roomId: string,
    senderId: string,
    text: string,
    imageFile?: File
  ): Promise<void> {
    const messageDocRef = doc(collection(db, "chats", roomId, "messages"));
    const path = `chats/${roomId}/messages/${messageDocRef.id}`;
    try {
      let imageUrl = "";
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const randId = Math.random().toString(36).substring(3);
        const storagePath = `chats/${roomId}/${randId}_${Date.now()}.${fileExt}`;
        const imageRef = ref(storage, storagePath);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      const timestamp = new Date().toISOString();
      const newMessage: Message = {
        messageId: messageDocRef.id,
        senderId,
        text: imageUrl ? "[Photo]" : text,
        image: imageUrl || undefined,
        reactions: {},
        seenBy: [senderId],
        createdAt: timestamp,
      };

      const batch = writeBatch(db);
      // Write message
      batch.set(messageDocRef, newMessage);
      // Update room lastMessage metadata
      batch.update(doc(db, "chats", roomId), {
        lastMessage: text || "[Photo]",
        lastMessageAt: timestamp,
        [`typing.${senderId}`]: false, // reset typing
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  async setTypingStatus(roomId: string, userId: string, isTyping: boolean): Promise<void> {
    const path = `chats/${roomId}`;
    try {
      const docRef = doc(db, "chats", roomId);
      await updateDoc(docRef, {
        [`typing.${userId}`]: isTyping,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async markMessagesSeen(roomId: string, userId: string): Promise<void> {
    const path = `chats/${roomId}/messages`;
    try {
      // Get all unseen messages and batch-update.
      const messagesRef = collection(db, "chats", roomId, "messages");
      const snap = await getDocs(messagesRef);
      const batch = writeBatch(db);
      let updated = false;

      snap.forEach((docSnap) => {
        const message = docSnap.data() as Message;
        if (message.senderId !== userId && (!message.seenBy || !message.seenBy.includes(userId))) {
          const currentSeen = message.seenBy || [];
          batch.update(docSnap.ref, {
            seenBy: [...currentSeen, userId],
          });
          updated = true;
        }
      });

      if (updated) {
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }
};
