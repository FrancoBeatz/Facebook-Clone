import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Home, Users, MessageSquare, Menu, Bell, Sun, Moon, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Navbar } from "../components/Navbar";
import { SidebarLeft } from "../components/SidebarLeft";
import { SidebarRight } from "../components/SidebarRight";
import { UserService } from "../services/user";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Active path highlights
  const isHome = location.pathname === "/";
  const isFriends = location.pathname.startsWith("/friends");
  const isChats = location.pathname.startsWith("/chats");

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100 dark:bg-[#18191A] text-neutral-900 dark:text-[#E4E6EB] transition duration-150">
      
      {/* Top Sticky Header */}
      <Navbar
        onSearchOpen={() => setMobileSearchOpen(true)}
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Main 3-column Layout */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full relative">
        {/* Left Side Shortcuts (Desktop) */}
        <SidebarLeft />

        {/* Center Canvas */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>

        {/* Right Side Shortcuts (Desktop) */}
        <SidebarRight />
      </div>

      {/* Mobile Drawer Slide Menus */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-fade-in select-none">
          {/* Backdrop */}
          <div onClick={() => setMobileMenuOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          
          {/* Sliding content */}
          <div className="relative w-72 bg-white dark:bg-[#242526] h-full flex flex-col p-4 space-y-4 animate-slide-right border-r border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <span className="font-extrabold text-xl text-[#1877F2]">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] rounded-full text-neutral-500">
                ✕
              </button>
            </div>

            {/* Profile */}
            {userProfile && (
              <Link
                to={`/profile/${userProfile.uid}`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 p-2 bg-neutral-100 dark:bg-[#3A3B3C] rounded-xl hover:bg-neutral-200 transition"
              >
                {userProfile.profilePicture ? (
                  <img
                    src={userProfile.profilePicture}
                    alt={userProfile.fullName}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold">
                    {userProfile.fullName[0].toUpperCase()}
                  </div>
                )}
                <div className="truncate">
                  <div className="font-bold text-sm text-neutral-900 dark:text-neutral-100 leading-snug truncate">{userProfile.fullName}</div>
                  <span className="text-xs text-neutral-400 block truncate">@{userProfile.username}</span>
                </div>
              </Link>
            )}

            {/* Links */}
            <div className="space-y-1 flex-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3.5 p-3 rounded-xl transition ${isHome ? "bg-[#1877F2]/10 text-[#1877F2]" : "text-neutral-700 dark:text-[#E4E6EB] hover:bg-neutral-100 dark:hover:bg-[#3A3B3C]"}`}
              >
                <Home className="w-5.5 h-5.5" />
                <span className="text-sm font-semibold">Feed</span>
              </Link>

              <Link
                to="/friends"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3.5 p-3 rounded-xl transition ${isFriends ? "bg-[#1877F2]/10 text-[#1877F2]" : "text-neutral-700 dark:text-[#E4E6EB] hover:bg-neutral-100 dark:hover:bg-[#3A3B3C]"}`}
              >
                <Users className="w-5.5 h-5.5" />
                <span className="text-sm font-semibold">Friends Directory</span>
              </Link>

              <Link
                to="/chats"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3.5 p-3 rounded-xl transition ${isChats ? "bg-[#1877F2]/10 text-[#1877F2]" : "text-neutral-700 dark:text-[#E4E6EB] hover:bg-neutral-100 dark:hover:bg-[#3A3B3C]"}`}
              >
                <MessageSquare className="w-5.5 h-5.5" />
                <span className="text-sm font-semibold">Messenger Chats</span>
              </Link>
            </div>

            {/* Logout footer */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
              <button
                onClick={() => {
                  toggleTheme();
                  setMobileMenuOpen(false);
                }}
                className="w-full h-11 border border-neutral-300 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] text-sm text-neutral-700 dark:text-[#E4E6EB] transition flex items-center justify-center space-x-2"
              >
                {theme === "dark" ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5" />}
                <span>{theme === "dark" ? "Light Theme" : "Dark Theme"}</span>
              </button>

              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full h-11 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-extrabold text-white transition flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Live Search Modal */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden items-start justify-center p-4">
          <div onClick={() => setMobileSearchOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white dark:bg-[#242526] p-4 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-slide-down">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-3">
              <span className="font-bold text-neutral-900 dark:text-white">Active Global Search</span>
              <button onClick={() => setMobileSearchOpen(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] rounded-full text-neutral-500">
                ✕
              </button>
            </div>

            {/* Dynamic Search Element */}
            <input
              type="text"
              autoFocus
              placeholder="Search users..."
              onChange={(e) => {
                const queryVal = e.target.value;
                if (!queryVal.trim()) return;
                UserService.searchUsers(queryVal).then((results) => {
                  // Simply redirecting on search
                  if (results.length > 0) {
                    navigate(`/profile/${results[0].uid}`);
                    setMobileSearchOpen(false);
                  }
                });
              }}
              className="w-full h-10 px-4 bg-neutral-100 dark:bg-[#3A3B3C] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
            />
            <p className="text-[10px] text-neutral-400 mt-2 text-center">Type in standard keywords to automatically jump matching profiles.</p>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Bottom Navigation) */}
      <footer className="md:hidden sticky bottom-0 z-40 w-full h-12 bg-white dark:bg-[#242526] border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around shrink-0 shadow-lg select-none">
        
        <Link
          to="/"
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition ${isHome ? "text-[#1877F2]" : "text-[#B0B3B8] hover:text-[#1877F2]"}`}
        >
          <Home className="w-5.5 h-5.5" />
        </Link>

        <Link
          to="/friends"
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition ${isFriends ? "text-[#1877F2]" : "text-[#B0B3B8] hover:text-[#1877F2]"}`}
        >
          <Users className="w-5.5 h-5.5" />
        </Link>

        <Link
          to="/chats"
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition ${isChats ? "text-[#1877F2]" : "text-[#B0B3B8] hover:text-[#1877F2]"}`}
        >
          <MessageSquare className="w-5.5 h-5.5" />
        </Link>

        {/* Sidebar/Drawer Toggle shortcut */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center p-1.5 rounded-lg text-[#B0B3B8] hover:text-[#1877F2] transition"
        >
          <Menu className="w-5.5 h-5.5" />
        </button>
      </footer>
    </div>
  );
};
