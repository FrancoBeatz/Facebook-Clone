/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AppLayout } from "./layouts/AppLayout";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";
import { Messenger } from "./pages/Messenger";
import { Friends } from "./pages/Friends";
import { PostView } from "./pages/PostView";
import { Sparkles } from "lucide-react";

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-neutral-100 dark:bg-[#18191A] select-none h-full w-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-[#1877F2] rounded-full flex items-center justify-center text-white text-3xl font-black shadow-xl animate-bounce">
            f
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-neutral-400 font-bold tracking-widest uppercase animate-pulse">
            <Sparkles className="w-4 h-4 text-[#1877F2]" />
            <span>Connecting services...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

// Login Route Guard (redirects already logged users to feed)
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-neutral-100 dark:bg-[#18191A]">
        <div className="w-12 h-12 rounded-full border-4 border-[#1877F2] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Authenticated routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chats"
              element={
                <ProtectedRoute>
                  <Messenger />
                </ProtectedRoute>
              }
            />
            <Route
              path="/friends"
              element={
                <ProtectedRoute>
                  <Friends />
                </ProtectedRoute>
              }
            />
            <Route
              path="/posts/:postId"
              element={
                <ProtectedRoute>
                  <PostView />
                </ProtectedRoute>
              }
            />

            {/* Unauthenticated routes */}
            <Route
              path="/login"
              element={
                <AuthRoute>
                  <Login />
                </AuthRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
