import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
} from "firebase/auth";
import { doc, getDoc, setDoc, getDocFromServer } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../firebase/config";
import { UserProfile } from "../types";

interface AuthContextType {
  currentUser: User | null;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Connection testing inside bootstrap
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("the client is offline")) {
          console.error("Please check your Firebase configuration or network status.", error);
        }
      }
    }
    testConnection();
  }, []);

  const refreshProfile = async () => {
    if (!auth.currentUser) {
      setUserProfile(null);
      return;
    }
    const uid = auth.currentUser.uid;
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        // User profile doesn't exist yet, we will create one
        const newProfile: UserProfile = {
          uid,
          fullName: auth.currentUser.displayName || "Anonymous User",
          username: auth.currentUser.email?.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "user",
          email: auth.currentUser.email || "",
          createdAt: new Date().toISOString(),
          bio: "",
          location: "",
          website: "",
          profilePicture: auth.currentUser.photoURL || "",
          coverPhoto: "",
        };
        await setDoc(docRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch/Sync profile
        try {
          await refreshProfile();
        } catch (error) {
          console.warn("Could not retrieve or synchronize active user profile during initialize:", error);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, fullName: string, username: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    // Send verification email
    try {
      await sendEmailVerification(user);
    } catch (err) {
      console.warn("Failed to send verification email:", err);
    }

    // Explicitly create user profile
    const path = `users/${user.uid}`;
    try {
      const docRef = doc(db, "users", user.uid);
      const newProfile: UserProfile = {
        uid: user.uid,
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
      await setDoc(docRef, newProfile);
      setUserProfile(newProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Fetch or create profile
    const path = `users/${user.uid}`;
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const newProfile: UserProfile = {
          uid: user.uid,
          fullName: user.displayName || "Google User",
          username: user.email?.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || `user_${Date.now().toString().slice(-4)}`,
          email: user.email || "",
          createdAt: new Date().toISOString(),
          bio: "",
          location: "",
          website: "",
          profilePicture: user.photoURL || "",
          coverPhoto: "",
        };
        await setDoc(docRef, newProfile);
        setUserProfile(newProfile);
      } else {
        setUserProfile(docSnap.data() as UserProfile);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await signOut(auth);
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
