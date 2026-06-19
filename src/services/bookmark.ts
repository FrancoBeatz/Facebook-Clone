import { supabase, isSupabaseConfigured, localDb, pubsub } from "../supabase/client";
import { Bookmark } from "../types";

export const BookmarkService = {
  async savePost(userId: string, postId: string): Promise<void> {
    const bookmarkId = `${userId}_${postId}`;
    const newBookmark: Bookmark = {
      id: bookmarkId,
      userId,
      postId,
      createdAt: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("bookmarks").upsert(newBookmark);
      } else {
        const list = localDb.get<Bookmark[]>("bookmarks", []);
        const nextList = list.filter((b) => b.id !== bookmarkId);
        nextList.push(newBookmark);
        localDb.set("bookmarks", nextList);
      }
    } catch (err) {
      console.error("Error saving bookmark:", err);
    }
  },

  async unsavePost(userId: string, postId: string): Promise<void> {
    const bookmarkId = `${userId}_${postId}`;

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("bookmarks").delete().eq("id", bookmarkId);
      } else {
        const list = localDb.get<Bookmark[]>("bookmarks", []);
        const nextList = list.filter((b) => b.id !== bookmarkId);
        localDb.set("bookmarks", nextList);
      }
    } catch (err) {
      console.error("Error unsaving bookmark:", err);
    }
  },

  listenToUserBookmarks(userId: string, callback: (bookmarks: Bookmark[]) => void) {
    const fetchBookmarks = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("bookmarks")
          .select("*")
          .eq("userId", userId);
        if (error) throw error;
        return (data || []) as Bookmark[];
      } else {
        const list = localDb.get<Bookmark[]>("bookmarks", []);
        return list.filter((b) => b.userId === userId);
      }
    };

    fetchBookmarks().then(callback).catch((err) => console.warn(err));

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`bookmarks-user-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "bookmarks" }, async () => {
          const list = await fetchBookmarks();
          callback(list);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      return pubsub.subscribe("bookmarks", async () => {
        const list = await fetchBookmarks();
        callback(list);
      });
    }
  },
};
