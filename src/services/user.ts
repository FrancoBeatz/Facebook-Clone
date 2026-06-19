import { supabase, isSupabaseConfigured, localDb } from "../supabase/client";
import { UserProfile } from "../types";

export const UserService = {
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("uid", uid)
          .single();
        if (error) {
          console.warn("Could not retrieve profile from Supabase:", error);
          return null;
        }
        return data as UserProfile;
      } else {
        const list = localDb.get<UserProfile[]>("users", []);
        return list.find((u) => u.uid === uid) || null;
      }
    } catch (err) {
      console.error("Error in getUserProfile:", err);
      return null;
    }
  },

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("users").update(data).eq("uid", uid);
        if (error) throw error;
      } else {
        const list = localDb.get<UserProfile[]>("users", []);
        const updated = list.map((u) => (u.uid === uid ? { ...u, ...data } : u));
        localDb.set("users", updated);
      }
    } catch (err) {
      console.error("Error in updateUserProfile:", err);
    }
  },

  async awardXP(
    uid: string,
    amount: number,
    actionType: string
  ): Promise<{ xpAdded: number; leveledUp: boolean; newLevel?: string; unlockedAchievements?: string[] }> {
    try {
      const u = await this.getUserProfile(uid);
      if (!u) return { xpAdded: 0, leveledUp: false };

      const currentXp = u.xp || 0;
      const newXp = currentXp + amount;

      // Leveling scale
      let newLevel = "Beginner";
      if (newXp >= 3500) newLevel = "Legend";
      else if (newXp >= 1500) newLevel = "Influencer";
      else if (newXp >= 600) newLevel = "Creator";
      else if (newXp >= 200) newLevel = "Explorer";

      const leveledUp = newLevel !== (u.level || "Beginner");

      // Auto unlock achievements
      const achievements = u.achievements || [];
      const unlockedAchievements: string[] = [];

      if (actionType === "first_post" && !achievements.includes("First Post")) {
        unlockedAchievements.push("First Post");
      }
      if (actionType === "first_friend" && !achievements.includes("First Friend")) {
        unlockedAchievements.push("First Friend");
      }
      if (newLevel === "Creator" && !achievements.includes("Top Creator")) {
        unlockedAchievements.push("Top Creator");
      }
      if (newLevel === "Influencer" && !achievements.includes("Social Butterfly")) {
        unlockedAchievements.push("Social Butterfly");
      }
      if (newLevel === "Legend" && !achievements.includes("Viral Post")) {
        unlockedAchievements.push("Viral Post");
      }

      const finalAchievements = [...achievements, ...unlockedAchievements];

      await this.updateUserProfile(uid, {
        xp: newXp,
        level: newLevel,
        achievements: finalAchievements,
      });

      return {
        xpAdded: amount,
        leveledUp,
        newLevel,
        unlockedAchievements,
      };
    } catch (err) {
      console.warn("Error awarding XP:", err);
      return { xpAdded: 0, leveledUp: false };
    }
  },

  async searchUsers(searchText: string): Promise<UserProfile[]> {
    try {
      const searchLower = searchText.toLowerCase().trim();
      if (isSupabaseConfigured && supabase) {
        // Simple search logic using Supabase ilike
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .limit(50);
        if (error) throw error;
        const results = (data || []).filter(
          (u: any) =>
            u.fullName.toLowerCase().includes(searchLower) ||
            u.username.toLowerCase().includes(searchLower) ||
            u.email.toLowerCase().includes(searchLower)
        );
        return results as UserProfile[];
      } else {
        const list = localDb.get<UserProfile[]>("users", []);
        return list.filter(
          (u) =>
            u.fullName.toLowerCase().includes(searchLower) ||
            u.username.toLowerCase().includes(searchLower) ||
            u.email.toLowerCase().includes(searchLower)
        );
      }
    } catch (err) {
      console.error("Error searching users:", err);
      return [];
    }
  },

  async getAllUsers(): Promise<UserProfile[]> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from("users").select("*").limit(100);
        if (error) throw error;
        return (data || []) as UserProfile[];
      } else {
        return localDb.get<UserProfile[]>("users", []);
      }
    } catch (err) {
      console.error("Error getting all users:", err);
      return [];
    }
  },

  async uploadPhoto(uid: string, file: File, type: "profile" | "cover"): Promise<string> {
    try {
      let downloadUrl = "";
      if (isSupabaseConfigured && supabase) {
        const fileExtension = file.name.split(".").pop();
        const storagePath = `${uid}/${type}_${Date.now()}.${fileExtension}`;
        const { error: uploadError } = await supabase.storage
          .from("users")
          .upload(storagePath, file);

        if (uploadError) {
          console.warn("Storage upload failed, fallback to base64 encoding", uploadError);
          downloadUrl = await this.convertFileToBase64(file);
        } else {
          const { data } = supabase.storage.from("users").getPublicUrl(storagePath);
          downloadUrl = data.publicUrl;
        }
      } else {
        downloadUrl = await this.convertFileToBase64(file);
      }

      if (type === "profile") {
        await this.updateUserProfile(uid, { profilePicture: downloadUrl });
      } else {
        await this.updateUserProfile(uid, { coverPhoto: downloadUrl });
      }
      return downloadUrl;
    } catch (err) {
      console.error(`Error uploading photo ${type}:`, err);
      // fallback to inline demo placeholder if base64 conversion fails
      const demoPlaceholder = type === "profile" 
        ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80" 
        : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80";
      return demoPlaceholder;
    }
  },

  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  },
};
