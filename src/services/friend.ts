import { supabase, isSupabaseConfigured, localDb, pubsub } from "../supabase/client";
import { Relationship, UserProfile } from "../types";

export const FriendService = {
  getRelationshipId(user1: string, user2: string): string {
    return [user1, user2].sort().join("_");
  },

  async rejectFriendRequest(relId: string): Promise<void> {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("relationships").delete().eq("id", relId);
      } else {
        const list = localDb.get<Relationship[]>("relationships", []);
        const filtered = list.filter((r) => r.id !== relId);
        localDb.set("relationships", filtered);
      }
    } catch (err) {
      console.error("Error rejecting friend request:", err);
    }
  },

  async removeFriend(uid: string, friendId: string): Promise<void> {
    const relId = this.getRelationshipId(uid, friendId);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("relationships").delete().eq("id", relId);
      } else {
        const list = localDb.get<Relationship[]>("relationships", []);
        const filtered = list.filter((r) => r.id !== relId);
        localDb.set("relationships", filtered);
      }
    } catch (err) {
      console.error("Error unfriending:", err);
    }
  },

  async sendFriendRequest(fromId: string, toId: string): Promise<void> {
    const relId = [fromId, toId].sort().join("_");
    const newRequest: Relationship = {
      id: relId,
      fromId,
      toId,
      status: "requested",
      createdAt: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("relationships").upsert(newRequest);
      } else {
        const list = localDb.get<Relationship[]>("relationships", []);
        const nextList = list.filter((r) => r.id !== relId);
        nextList.push(newRequest);
        localDb.set("relationships", nextList);
      }
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  },

  async acceptFriendRequest(fromId: string, toId: string): Promise<void> {
    const relId = [fromId, toId].sort().join("_");

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from("relationships")
          .update({ status: "friends", createdAt: new Date().toISOString() })
          .eq("id", relId);
      } else {
        const list = localDb.get<Relationship[]>("relationships", []);
        const updated = list.map((r) =>
          r.id === relId ? { ...r, status: "friends" as const, createdAt: new Date().toISOString() } : r
        );
        localDb.set("relationships", updated);
      }
    } catch (err) {
      console.error("Error accepting friend request:", err);
    }
  },

  async cancelFriendRequest(fromId: string, toId: string): Promise<void> {
    const relId = [fromId, toId].sort().join("_");

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("relationships").delete().eq("id", relId);
      } else {
        const list = localDb.get<Relationship[]>("relationships", []);
        const filtered = list.filter((r) => r.id !== relId);
        localDb.set("relationships", filtered);
      }
    } catch (err) {
      console.error("Error cancelling friend request:", err);
    }
  },

  async unfriendUser(fromId: string, toId: string): Promise<void> {
    const relId = [fromId, toId].sort().join("_");

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("relationships").delete().eq("id", relId);
      } else {
        const list = localDb.get<Relationship[]>("relationships", []);
        const filtered = list.filter((r) => r.id !== relId);
        localDb.set("relationships", filtered);
      }
    } catch (err) {
      console.error("Error unfriending user:", err);
    }
  },

  listenToRelationships(userId: string, callback: (relationships: Relationship[]) => void) {
    const fetchRelations = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("relationships")
          .select("*")
          .or(`fromId.eq.${userId},toId.eq.${userId}`);
        if (error) throw error;
        return (data || []) as Relationship[];
      } else {
        const list = localDb.get<Relationship[]>("relationships", []);
        return list.filter((r) => r.fromId === userId || r.toId === userId);
      }
    };

    fetchRelations().then(callback).catch((err) => console.warn(err));

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`relationships-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "relationships" }, async () => {
          const list = await fetchRelations();
          callback(list);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      return pubsub.subscribe("relationships", async () => {
        const list = await fetchRelations();
        callback(list);
      });
    }
  },

  getMutualFriends(
    user1Id: string,
    user2Id: string,
    allUsers: UserProfile[],
    relationships: Relationship[]
  ): UserProfile[] {
    const user1Friends = relationships
      .filter((r) => r.status === "friends" && (r.fromId === user1Id || r.toId === user1Id))
      .map((r) => (r.fromId === user1Id ? r.toId : r.fromId));

    const user2Friends = relationships
      .filter((r) => r.status === "friends" && (r.fromId === user2Id || r.toId === user2Id))
      .map((r) => (r.fromId === user2Id ? r.toId : r.fromId));

    const mutualIds = user1Friends.filter((id) => user2Friends.includes(id));
    return allUsers.filter((u) => mutualIds.includes(u.uid));
  },
};
