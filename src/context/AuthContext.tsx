import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured, localDb } from "../supabase/client";
import { UserProfile } from "../types";

// Bridge interface mimicking User type for compatibility
export interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, fullName: string, username: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const activeUid = currentUser?.uid;
    if (!activeUid) {
      setUserProfile(null);
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("uid", activeUid)
          .single();

        if (data && !error) {
          setUserProfile(data as UserProfile);
        } else {
          // If no profile found, auto-create one
          const newProfile: UserProfile = {
            uid: activeUid,
            fullName: currentUser.displayName || "Anonymous User",
            username: currentUser.email?.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "user",
            email: currentUser.email || "",
            createdAt: new Date().toISOString(),
            bio: "",
            location: "",
            website: "",
            profilePicture: currentUser.photoURL || "",
            coverPhoto: "",
          };
          await supabase.from("users").insert(newProfile);
          setUserProfile(newProfile);
        }
      } else {
        const users = localDb.get<UserProfile[]>("users", []);
        const matching = users.find((u) => u.uid === activeUid);
        if (matching) {
          setUserProfile(matching);
        } else {
          const newProfile: UserProfile = {
            uid: activeUid,
            fullName: currentUser.displayName || "Anonymous User",
            username: currentUser.email?.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "user",
            email: currentUser.email || "",
            createdAt: new Date().toISOString(),
            bio: "",
            location: "",
            website: "",
            profilePicture: currentUser.photoURL || "",
            coverPhoto: "",
          };
          users.push(newProfile);
          localDb.set("users", users);
          setUserProfile(newProfile);
        }
      }
    } catch (err) {
      console.error("Error refreshing active profile:", err);
    }
  };

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // Get current Supabase auth session
      supabase.auth.getSession().then(({ data: { session } }) => {
        const user = session?.user || null;
        if (user) {
          const authUser: AuthUser = {
            uid: user.id,
            email: user.email,
            displayName: user.user_metadata?.full_name,
            photoURL: user.user_metadata?.avatar_url,
          };
          setCurrentUser(authUser);
          // fetch associated profile
          supabase
            .from("users")
            .select("*")
            .eq("uid", user.id)
            .single()
            .then(({ data }) => {
              if (data) setUserProfile(data as UserProfile);
              setLoading(false);
            });
        } else {
          setCurrentUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      });

      // Listen to Supabase auth events
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const user = session?.user || null;
        if (user) {
          const authUser: AuthUser = {
            uid: user.id,
            email: user.email,
            displayName: user.user_metadata?.full_name,
            photoURL: user.user_metadata?.avatar_url,
          };
          setCurrentUser(authUser);
          const { data } = await supabase.from("users").select("*").eq("uid", user.id).single();
          if (data) {
            setUserProfile(data as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: user.id,
              fullName: user.user_metadata?.full_name || "Google User",
              username: user.email?.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "user",
              email: user.email || "",
              createdAt: new Date().toISOString(),
              bio: "",
              location: "",
              website: "",
              profilePicture: user.user_metadata?.avatar_url || "",
              coverPhoto: "",
            };
            await supabase.from("users").insert(newProfile);
            setUserProfile(newProfile);
          }
        } else {
          setCurrentUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Local Auth State Initializer
      const activeUser = localDb.get<AuthUser | null>("current_user", null);
      if (activeUser) {
        setCurrentUser(activeUser);
        const usersList = localDb.get<UserProfile[]>("users", []);
        const matched = usersList.find((u) => u.uid === activeUser.uid);
        if (matched) {
          setUserProfile(matched);
        } else {
          const defaultProfile: UserProfile = {
            uid: activeUser.uid,
            fullName: activeUser.displayName || "Admin Demo",
            username: activeUser.email?.split("@")[0] || "demo",
            email: activeUser.email || "demo@example.com",
            createdAt: new Date().toISOString(),
            bio: "Super Admin",
            location: "San Francisco, CA",
            website: "https://google.com",
            role: "admin",
          };
          usersList.push(defaultProfile);
          localDb.set("users", usersList);
          setUserProfile(defaultProfile);
        }
      } else {
        // First boot with zero users? Bootstrap a nice default demo user so preview is functional
        const usersList = localDb.get<UserProfile[]>("users", []);
        if (usersList.length === 0) {
          // Add a default demo profile to simulate active session
          const demoUid = "demo_user_123";
          const demoUser: AuthUser = {
            uid: demoUid,
            email: "user@example.com",
            displayName: "Demo Account",
          };
          const demoProfile: UserProfile = {
            uid: demoUid,
            fullName: "Demo Account",
            username: "demo_profile",
            email: "user@example.com",
            createdAt: new Date().toISOString(),
            bio: "Welcome! To link your real Supabase backend, run the schema in the file supabase_schema.sql and input the variables in the settings panel.",
            location: "New York, NY",
            website: "https://supabase.com",
            profilePicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
            coverPhoto: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
            role: "user",
          };
          usersList.push(demoProfile);
          localDb.set("users", usersList);
          localDb.set("current_user", demoUser);
          setCurrentUser(demoUser);
          setUserProfile(demoProfile);
        }
      }
      setLoading(false);
    }
  }, [currentUser?.uid]);

  const loginWithEmail = async (email: string, pass: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
    } else {
      const users = localDb.get<UserProfile[]>("users", []);
      const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!matched) {
        throw new Error("Invalid credentials. Please use demo credentials or register a local profile.");
      }
      const authUser = {
        uid: matched.uid,
        email: matched.email,
        displayName: matched.fullName,
        photoURL: matched.profilePicture,
      };
      localDb.set("current_user", authUser);
      setCurrentUser(authUser);
      setUserProfile(matched);
    }
  };

  const registerWithEmail = async (email: string, pass: string, fullName: string, username: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: fullName,
            username: username,
          },
        },
      });
      if (error) throw error;
      if (data.user) {
        const newProfile: UserProfile = {
          uid: data.user.id,
          fullName,
          username: username.toLowerCase().trim().replace(/\s+/g, ""),
          email,
          createdAt: new Date().toISOString(),
          bio: "",
          location: "",
          website: "",
          profilePicture: "",
          coverPhoto: "",
        };
        await supabase.from("users").insert(newProfile);
      }
    } else {
      const users = localDb.get<UserProfile[]>("users", []);
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("Local email already registered.");
      }
      const newUid = "usr_" + Math.random().toString(36).substring(3);
      const newProfile: UserProfile = {
        uid: newUid,
        fullName,
        username: username.toLowerCase().trim().replace(/\s+/g, ""),
        email,
        createdAt: new Date().toISOString(),
        bio: "",
        location: "",
        website: "",
        profilePicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
        coverPhoto: "",
        role: "user",
      };
      users.push(newProfile);
      localDb.set("users", users);
      const authUser = {
        uid: newUid,
        email,
        displayName: fullName,
      };
      localDb.set("current_user", authUser);
      setCurrentUser(authUser);
      setUserProfile(newProfile);
    }
  };

  const loginWithGoogle = async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
      if (error) throw error;
    } else {
      const users = localDb.get<UserProfile[]>("users", []);
      const newUid = "google_" + Math.random().toString(36).substring(3);
      const email = `guser_${Math.random().toString(36).substring(5)}@gmail.com`;
      const newProfile: UserProfile = {
        uid: newUid,
        fullName: "Google Demo User",
        username: `guser_${Math.random().toString(36).substring(5)}`,
        email,
        createdAt: new Date().toISOString(),
        bio: "Logged in via Google simulation",
        location: "",
        website: "",
        profilePicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
        coverPhoto: "",
        role: "user",
      };
      users.push(newProfile);
      localDb.set("users", users);
      const authUser = {
        uid: newUid,
        email,
        displayName: "Google Demo User",
      };
      localDb.set("current_user", authUser);
      setCurrentUser(authUser);
      setUserProfile(newProfile);
    }
  };

  const resetPassword = async (email: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } else {
      console.info("Simulated password reset email sent to:", email);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      localDb.set("current_user", null);
    }
    setCurrentUser(null);
    setUserProfile(null);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    resetPassword,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
