import { supabase, isSupabaseConfigured, localDb, pubsub } from "../supabase/client";
import { Group } from "../types";

export const GroupService = {
  async createGroup(name: string, description: string, ownerId: string): Promise<string> {
    const groupId = "g_" + Math.random().toString(36).substring(3) + "_" + Date.now();
    const newGroup: Group = {
      id: groupId,
      name,
      description,
      ownerId,
      members: [ownerId],
      createdAt: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("groups").insert(newGroup);
      } else {
        const list = localDb.get<Group[]>("groups", []);
        list.push(newGroup);
        localDb.set("groups", list);
      }
      return groupId;
    } catch (err) {
      console.error("Error creating group:", err);
      return groupId;
    }
  },

  async joinGroup(groupId: string, userId: string): Promise<void> {
    try {
      const g = await this.getGroup(groupId);
      if (!g) return;

      const currentMembers = g.members || [];
      if (currentMembers.includes(userId)) return;

      const nextMembers = [...currentMembers, userId];

      if (isSupabaseConfigured && supabase) {
        await supabase.from("groups").update({ members: nextMembers }).eq("id", groupId);
      } else {
        const list = localDb.get<Group[]>("groups", []);
        const updated = list.map((item) => (item.id === groupId ? { ...item, members: nextMembers } : item));
        localDb.set("groups", updated);
      }
    } catch (err) {
      console.error("Error joining group:", err);
    }
  },

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    try {
      const g = await this.getGroup(groupId);
      if (!g) return;

      const currentMembers = g.members || [];
      const nextMembers = currentMembers.filter((u) => u !== userId);

      if (isSupabaseConfigured && supabase) {
        await supabase.from("groups").update({ members: nextMembers }).eq("id", groupId);
      } else {
        const list = localDb.get<Group[]>("groups", []);
        const updated = list.map((item) => (item.id === groupId ? { ...item, members: nextMembers } : item));
        localDb.set("groups", updated);
      }
    } catch (err) {
      console.error("Error leaving group:", err);
    }
  },

  async getGroup(groupId: string): Promise<Group | null> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("groups")
          .select("*")
          .eq("id", groupId)
          .single();
        if (error) return null;
        return data as Group;
      } else {
        const list = localDb.get<Group[]>("groups", []);
        return list.find((g) => g.id === groupId) || null;
      }
    } catch (err) {
      console.error("Error drawing group detail:", err);
      return null;
    }
  },

  async getAllGroups(): Promise<Group[]> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from("groups").select("*");
        if (error) throw error;
        return (data || []) as Group[];
      } else {
        return localDb.get<Group[]>("groups", []);
      }
    } catch (err) {
      console.error("Error getting all groups:", err);
      return [];
    }
  },

  listenToGroups(callback: (groups: Group[]) => void) {
    const fetchGroupsList = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from("groups").select("*");
        if (error) throw error;
        return (data || []) as Group[];
      } else {
        return localDb.get<Group[]>("groups", []);
      }
    };

    fetchGroupsList().then(callback).catch((err) => console.warn(err));

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel("groups-all")
        .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, async () => {
          const list = await fetchGroupsList();
          callback(list);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      return pubsub.subscribe("groups", async () => {
        const list = await fetchGroupsList();
        callback(list);
      });
    }
  },
};
