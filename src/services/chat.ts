import { supabase, isSupabaseConfigured, localDb, pubsub } from "../supabase/client";
import { ChatRoom, Message } from "../types";
import { UserService } from "./user";

export const ChatService = {
  getRoomId(user1: string, user2: string): string {
    return [user1, user2].sort().join("_");
  },

  async getOrCreateChatRoom(user1Id: string, user2Id: string): Promise<string> {
    const roomId = this.getRoomId(user1Id, user2Id);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("chats")
          .select("*")
          .eq("roomId", roomId)
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;

        if (!data) {
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
          await supabase.from("chats").insert(newRoom);
        }
      } else {
        const list = localDb.get<ChatRoom[]>("chats", []);
        const matched = list.find((r) => r.roomId === roomId);
        if (!matched) {
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
          list.push(newRoom);
          localDb.set("chats", list);
        }
      }
      return roomId;
    } catch (err) {
      console.error("Error getOrCreateChatRoom:", err);
      return roomId;
    }
  },

  listenToChatRooms(userId: string, callback: (rooms: ChatRoom[]) => void) {
    const fetchRooms = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("chats")
          .select("*")
          .contains("participants", [userId]);
        if (error) throw error;
        return ((data || []) as ChatRoom[]).sort(
          (a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
        );
      } else {
        const rooms = localDb.get<ChatRoom[]>("chats", []);
        const list = rooms.filter((r) => r.participants?.includes(userId));
        return [...list].sort(
          (a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
        );
      }
    };

    fetchRooms().then(callback).catch((err) => console.warn(err));

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`chats-list-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, async () => {
          const list = await fetchRooms();
          callback(list);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      return pubsub.subscribe("chats", async () => {
        const list = await fetchRooms();
        callback(list);
      });
    }
  },

  listenToMessages(roomId: string, callback: (messages: Message[]) => void) {
    const fetchMsgs = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("roomId", roomId)
          .order("createdAt", { ascending: true });
        if (error) throw error;
        return (data || []) as Message[];
      } else {
        const key = `messages_${roomId}`;
        return localDb.get<Message[]>(key, []);
      }
    };

    fetchMsgs().then(callback).catch((err) => console.warn(err));

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`messages-${roomId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, async () => {
          const list = await fetchMsgs();
          callback(list);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      return pubsub.subscribe(`messages_${roomId}`, async () => {
        const list = await fetchMsgs();
        callback(list);
      });
    }
  },

  async sendMessage(
    roomId: string,
    senderId: string,
    text: string,
    imageFile?: File
  ): Promise<void> {
    try {
      let imageUrl = "";
      const messageId = "msg_" + Math.random().toString(36).substring(3) + "_" + Date.now();

      if (imageFile) {
        try {
          if (isSupabaseConfigured && supabase) {
            const randId = Math.random().toString(36).substring(3);
            const path = `chats/${roomId}/${randId}_${imageFile.name}`;
            const { error: uploadErr } = await supabase.storage.from("chats").upload(path, imageFile);
            if (!uploadErr) {
              const { data } = supabase.storage.from("chats").getPublicUrl(path);
              imageUrl = data.publicUrl;
            }
          }
          if (!imageUrl) {
            imageUrl = await UserService.convertFileToBase64(imageFile);
          }
        } catch (err) {
          console.warn("Could not encode chat image file:", err);
        }
      }

      const timestamp = new Date().toISOString();
      const newMessage: Message = {
        messageId,
        senderId,
        text: imageUrl ? "[Photo]" : text,
        image: imageUrl || undefined,
        reactions: {},
        seenBy: [senderId],
        createdAt: timestamp,
      };

      if (isSupabaseConfigured && supabase) {
        // Find existing room to obtain typing details
        const { data: chatData } = await supabase
          .from("chats")
          .select("typing")
          .eq("roomId", roomId)
          .single();
        const oldTyping = chatData?.typing || {};
        const updatedTyping = { ...oldTyping, [senderId]: false };

        await supabase.from("messages").insert({ ...newMessage, roomId });
        await supabase
          .from("chats")
          .update({
            lastMessage: text || "[Photo]",
            lastMessageAt: timestamp,
            typing: updatedTyping,
          })
          .eq("roomId", roomId);
      } else {
        const key = `messages_${roomId}`;
        const messages = localDb.get<Message[]>(key, []);
        messages.push(newMessage);
        localDb.set(key, messages);

        // Update chats meta
        const rooms = localDb.get<ChatRoom[]>("chats", []);
        const updatedRooms = rooms.map((r) => {
          if (r.roomId === roomId) {
            const oldTyping = r.typing || {};
            return {
              ...r,
              lastMessage: text || "[Photo]",
              lastMessageAt: timestamp,
              typing: { ...oldTyping, [senderId]: false },
            };
          }
          return r;
        });
        localDb.set("chats", updatedRooms);
      }
    } catch (err) {
      console.error("Error sending chat message:", err);
    }
  },

  async setTypingStatus(roomId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: chatData } = await supabase
          .from("chats")
          .select("typing")
          .eq("roomId", roomId)
          .single();
        const oldTyping = chatData?.typing || {};
        const updatedTyping = { ...oldTyping, [userId]: isTyping };

        await supabase.from("chats").update({ typing: updatedTyping }).eq("roomId", roomId);
      } else {
        const rooms = localDb.get<ChatRoom[]>("chats", []);
        const updatedRooms = rooms.map((r) => {
          if (r.roomId === roomId) {
            const oldTyping = r.typing || {};
            return {
              ...r,
              typing: { ...oldTyping, [userId]: isTyping },
            };
          }
          return r;
        });
        localDb.set("chats", updatedRooms);
      }
    } catch (err) {
      console.error("Error setting typing status:", err);
    }
  },

  async markMessagesSeen(roomId: string, userId: string): Promise<void> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: messages } = await supabase
          .from("messages")
          .select("*")
          .eq("roomId", roomId);
        
        for (const msg of messages || []) {
          if (msg.senderId !== userId && (!msg.seenBy || !msg.seenBy.includes(userId))) {
            const nextSeen = [...(msg.seenBy || []), userId];
            await supabase.from("messages").update({ seenBy: nextSeen }).eq("messageId", msg.messageId);
          }
        }
      } else {
        const key = `messages_${roomId}`;
        const messages = localDb.get<Message[]>(key, []);
        let updated = false;
        const nextMsgs = messages.map((m) => {
          if (m.senderId !== userId && (!m.seenBy || !m.seenBy.includes(userId))) {
            updated = true;
            return {
              ...m,
              seenBy: [...(m.seenBy || []), userId],
            };
          }
          return m;
        });

        if (updated) {
          localDb.set(key, nextMsgs);
        }
      }
    } catch (err) {
      console.error("Error marking messages seen:", err);
    }
  },
};
