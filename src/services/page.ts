import { supabase, isSupabaseConfigured, localDb, pubsub } from "../supabase/client";
import { BusinessPage } from "../types";

export const PageService = {
  async createPage(name: string, description: string, category: string, ownerId: string): Promise<string> {
    const pageId = "page_" + Math.random().toString(36).substring(3) + "_" + Date.now();
    const newPage: BusinessPage = {
      id: pageId,
      name,
      description,
      category,
      ownerId,
      followers: [ownerId],
      createdAt: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("pages").insert(newPage);
      } else {
        const list = localDb.get<BusinessPage[]>("pages", []);
        list.push(newPage);
        localDb.set("pages", list);
      }
      return pageId;
    } catch (err) {
      console.error("Error creating business page:", err);
      return pageId;
    }
  },

  async followPage(pageId: string, userId: string): Promise<void> {
    try {
      const page = await this.getPage(pageId);
      if (!page) return;

      const currentFollowers = page.followers || [];
      if (currentFollowers.includes(userId)) return;

      const nextFollowers = [...currentFollowers, userId];

      if (isSupabaseConfigured && supabase) {
        await supabase.from("pages").update({ followers: nextFollowers }).eq("id", pageId);
      } else {
        const list = localDb.get<BusinessPage[]>("pages", []);
        const updated = list.map((item) => (item.id === pageId ? { ...item, followers: nextFollowers } : item));
        localDb.set("pages", updated);
      }
    } catch (err) {
      console.error("Error following page:", err);
    }
  },

  async unfollowPage(pageId: string, userId: string): Promise<void> {
    try {
      const page = await this.getPage(pageId);
      if (!page) return;

      const currentFollowers = page.followers || [];
      const nextFollowers = currentFollowers.filter((id) => id !== userId);

      if (isSupabaseConfigured && supabase) {
        await supabase.from("pages").update({ followers: nextFollowers }).eq("id", pageId);
      } else {
        const list = localDb.get<BusinessPage[]>("pages", []);
        const updated = list.map((item) => (item.id === pageId ? { ...item, followers: nextFollowers } : item));
        localDb.set("pages", updated);
      }
    } catch (err) {
      console.error("Error unfollowing page:", err);
    }
  },

  async getPage(pageId: string): Promise<BusinessPage | null> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("pages")
          .select("*")
          .eq("id", pageId)
          .single();
        if (error) return null;
        return data as BusinessPage;
      } else {
        const list = localDb.get<BusinessPage[]>("pages", []);
        return list.find((p) => p.id === pageId) || null;
      }
    } catch (err) {
      console.error("Error getting business page details:", err);
      return null;
    }
  },

  async getAllPages(): Promise<BusinessPage[]> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from("pages").select("*");
        if (error) throw error;
        return (data || []) as BusinessPage[];
      } else {
        return localDb.get<BusinessPage[]>("pages", []);
      }
    } catch (err) {
      console.error("Error retrieving all business pages:", err);
      return [];
    }
  },

  listenToPages(callback: (pages: BusinessPage[]) => void) {
    const fetchPagesList = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from("pages").select("*");
        if (error) throw error;
        return (data || []) as BusinessPage[];
      } else {
        return localDb.get<BusinessPage[]>("pages", []);
      }
    };

    fetchPagesList().then(callback).catch((err) => console.warn(err));

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel("pages-all-updates")
        .on("postgres_changes", { event: "*", schema: "public", table: "pages" }, async () => {
          const list = await fetchPagesList();
          callback(list);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      return pubsub.subscribe("pages", async () => {
        const list = await fetchPagesList();
        callback(list);
      });
    }
  },
};
