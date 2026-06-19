import { supabase, isSupabaseConfigured, localDb, pubsub } from "../supabase/client";
import { Report } from "../types";
import { PostService } from "./post";

export const AdminService = {
  async reportContent(
    reporterId: string,
    reporterName: string,
    postId: string,
    postContent: string,
    reason: string
  ): Promise<void> {
    const reportId = "report_" + Math.random().toString(36).substring(3) + "_" + Date.now();
    const newReport: Report = {
      id: reportId,
      reporterId,
      reporterName,
      postId,
      postContent,
      reason,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("reports").insert(newReport);
      } else {
        const list = localDb.get<Report[]>("reports", []);
        list.push(newReport);
        localDb.set("reports", list);
      }
    } catch (err) {
      console.error("Error submitting content report:", err);
    }
  },

  listenToReports(callback: (reports: Report[]) => void) {
    const fetchReportsList = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from("reports").select("*");
        if (error) throw error;
        return ((data || []) as Report[]).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else {
        const list = localDb.get<Report[]>("reports", []);
        return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    };

    fetchReportsList().then(callback).catch((err) => console.warn(err));

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel("reports-feed")
        .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, async () => {
          const list = await fetchReportsList();
          callback(list);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      return pubsub.subscribe("reports", async () => {
        const list = await fetchReportsList();
        callback(list);
      });
    }
  },

  async resolveReport(reportId: string): Promise<void> {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
      } else {
        const list = localDb.get<Report[]>("reports", []);
        const updated = list.map((r) => (r.id === reportId ? { ...r, status: "resolved" as const } : r));
        localDb.set("reports", updated);
      }
    } catch (err) {
      console.error("Error resolving content report:", err);
    }
  },

  async suspendUser(userId: string): Promise<void> {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("users").update({ suspended: true }).eq("uid", userId);
      } else {
        const list = localDb.get<any[]>("users", []);
        const updated = list.map((u) => (u.uid === userId ? { ...u, suspended: true } : u));
        localDb.set("users", updated);
      }
    } catch (err) {
      console.error("Error suspending user profile:", err);
    }
  },

  async unsuspendUser(userId: string): Promise<void> {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("users").update({ suspended: false }).eq("uid", userId);
      } else {
        const list = localDb.get<any[]>("users", []);
        const updated = list.map((u) => (u.uid === userId ? { ...u, suspended: false } : u));
        localDb.set("users", updated);
      }
    } catch (err) {
      console.error("Error unsuspending user profile:", err);
    }
  },

  async deletePost(postId: string): Promise<void> {
    return PostService.deletePost(postId);
  },
};
