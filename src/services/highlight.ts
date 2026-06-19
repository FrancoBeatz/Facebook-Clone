import { supabase, isSupabaseConfigured, localDb, pubsub } from "../supabase/client";
import { Highlight } from "../types";

export const HighlightService = {
  async createHighlight(
    userId: string,
    title: string,
    coverColor: string,
    postIds: string[]
  ): Promise<void> {
    const highlightId = `hi_${userId}_${Date.now()}`;
    const newHighlight: Highlight = {
      id: highlightId,
      userId,
      title,
      coverColor,
      postIds,
      createdAt: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("highlights").insert(newHighlight);
      } else {
        const list = localDb.get<Highlight[]>("highlights", []);
        list.push(newHighlight);
        localDb.set("highlights", list);
      }
    } catch (err) {
      console.error("Error creating story highlight:", err);
    }
  },

  async deleteHighlight(highlightId: string): Promise<void> {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("highlights").delete().eq("id", highlightId);
      } else {
        const list = localDb.get<Highlight[]>("highlights", []);
        const filtered = list.filter((h) => h.id !== highlightId);
        localDb.set("highlights", filtered);
      }
    } catch (err) {
      console.error("Error deleting highlight:", err);
    }
  },

  listenToUserHighlights(userId: string, callback: (highlights: Highlight[]) => void) {
    const fetchHighlights = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("highlights")
          .select("*")
          .eq("userId", userId);
        if (error) throw error;
        return ((data || []) as Highlight[]).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else {
        const list = localDb.get<Highlight[]>("highlights", []);
        return list
          .filter((h) => h.userId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    };

    fetchHighlights().then(callback).catch((err) => console.warn(err));

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`highlights-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "highlights" }, async () => {
          const list = await fetchHighlights();
          callback(list);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      return pubsub.subscribe("highlights", async () => {
        const list = await fetchHighlights();
        callback(list);
      });
    }
  },
};
