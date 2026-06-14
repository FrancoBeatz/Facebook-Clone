import { doc, getDoc, updateDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, handleFirestoreError, OperationType } from "../firebase/config";
import { UserProfile } from "../types";

export const UserService = {
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, "users", uid);
      await updateDoc(docRef, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async awardXP(
    uid: string,
    amount: number,
    actionType: string
  ): Promise<{ xpAdded: number; leveledUp: boolean; newLevel?: string; unlockedAchievements?: string[] }> {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return { xpAdded: 0, leveledUp: false };

      const u = docSnap.data() as UserProfile;
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

      await updateDoc(docRef, {
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
    const path = "users";
    try {
      const q = query(collection(db, "users"), limit(50));
      const querySnapshot = await getDocs(q);
      const results: UserProfile[] = [];
      const searchLower = searchText.toLowerCase().trim();

      querySnapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        if (
          u.fullName.toLowerCase().includes(searchLower) ||
          u.username.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
        ) {
          results.push(u);
        }
      });
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const path = "users";
    try {
      const q = query(collection(db, "users"), limit(100));
      const querySnapshot = await getDocs(q);
      const results: UserProfile[] = [];
      querySnapshot.forEach((docSnap) => {
        results.push(docSnap.data() as UserProfile);
      });
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async uploadPhoto(uid: string, file: File, type: "profile" | "cover"): Promise<string> {
    const fileExtension = file.name.split(".").pop();
    const storagePath = `users/${uid}/${type}_${Date.now()}.${fileExtension}`;
    try {
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      if (type === "profile") {
        await this.updateUserProfile(uid, { profilePicture: downloadUrl });
      } else {
        await this.updateUserProfile(uid, { coverPhoto: downloadUrl });
      }
      return downloadUrl;
    } catch (err) {
      console.error(`Error uploading photo ${type}:`, err);
      throw err;
    }
  },
};
