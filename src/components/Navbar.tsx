import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  MessageSquare,
  Home,
  Moon,
  Sun,
  LogOut,
  User,
  X,
  CheckCircle,
  Menu,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { UserService } from "../services/user";
import { NotificationService } from "../services/notification";
import { UserProfile, Notification } from "../types";

interface NavbarProps {
  onSearchOpen?: () => void;
  onMobileMenuToggle?: () => void;
  onDirectMessageUser?: (userId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearchOpen, onMobileMenuToggle, onDirectMessageUser }) => {
  const { userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load notifications
  useEffect(() => {
    if (!userProfile) return;
    const unsubscribe = NotificationService.listenToNotifications(userProfile.uid, (list) => {
      setNotifications(list);
    });
    return unsubscribe;
  }, [userProfile]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle live search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      const results = await UserService.searchUsers(searchQuery);
      setSearchResults(results.filter((u) => u.uid !== userProfile?.uid));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, userProfile]);

  const handleSearchResultClick = (userId: string) => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    navigate(`/profile/${userId}`);
  };

  const handleNotifClick = async (notif: Notification) => {
    await NotificationService.markNotificationRead(notif.id);
    setShowNotifications(false);
    if (notif.postId) {
      navigate(`/posts/${notif.postId}`);
    } else {
      navigate(`/profile/${notif.senderId}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <nav className="sticky top-0 z-40 w-full h-14 bg-white dark:bg-[#242526] border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 shadow-sm">
      {/* Left side: Logo & Search */}
      <div className="flex items-center space-x-3 flex-1 md:flex-initial">
        {/* Mobile menu toggle */}
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] text-neutral-600 dark:text-[#B0B3B8]"
        >
          <Menu className="w-6 h-6" />
        </button>

        <Link to="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#1877F2] to-[#044FB3] rounded-full flex items-center justify-center text-white font-extrabold text-2xl select-none shadow">
            f
          </div>
          <span className="hidden sm:inline-block font-sans font-bold text-xl tracking-tight text-[#1877F2]">
            facebook
          </span>
        </Link>

        {/* Live Search Bar */}
        <div ref={searchRef} className="relative hidden md:block w-64 lg:w-72">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400 dark:text-[#B0B3B8]" />
            <input
              type="text"
              placeholder="Search Facebook"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearching(true);
              }}
              onFocus={() => setIsSearching(true)}
              className="w-full h-9 pl-9 pr-4 bg-neutral-100 dark:bg-[#3A3B3C] rounded-full text-sm text-neutral-900 dark:text-[#E4E6EB] placeholder-neutral-500 dark:placeholder-[#B0B3B8] focus:outline-none focus:ring-2 focus:ring-[#1877F2] border-none"
            />
          </div>

          {/* Search Dropdown */}
          {isSearching && (searchQuery.trim() || searchResults.length > 0) && (
            <div className="absolute top-11 left-0 w-full bg-white dark:bg-[#242526] rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 py-2 max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 text-xs font-semibold text-neutral-500 dark:text-[#B0B3B8] border-b border-neutral-100 dark:border-neutral-800">
                People Suggestions
              </div>
              {searchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-neutral-500 dark:text-[#B0B3B8] text-center">
                  No matching profiles found
                </div>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => handleSearchResultClick(user.uid)}
                    className="w-full px-4 py-2 flex items-center space-x-3 hover:bg-neutral-50 dark:hover:bg-[#3A3B3C] text-left"
                  >
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.fullName}
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-[#3A3B3C] flex items-center justify-center text-xs font-bold text-neutral-600 dark:text-[#E4E6EB]">
                        {user.fullName[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-neutral-900 dark:text-[#E4E6EB]">
                        {user.fullName}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-[#B0B3B8]">
                        @{user.username}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Middle side: Main Navigation tabs */}
      <div className="flex items-center space-x-2 md:space-x-4">
        <Link
          to="/"
          className="p-2 md:px-6 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] text-[#1877F2] border-b-2 border-[#1877F2]"
          title="Home News Feed"
        >
          <Home className="w-6 h-6" />
        </Link>
      </div>

      {/* Right side: Utilities */}
      <div className="flex items-center space-x-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 bg-neutral-100 dark:bg-[#3A3B3C] hover:bg-neutral-200 dark:hover:bg-[#4E4F50] rounded-full text-neutral-700 dark:text-[#E4E6EB] transition"
          title="Toggle Dark/Light Mode"
        >
          {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-neutral-600" />}
        </button>

        {/* Messenger Action */}
        <button
          onClick={onSearchOpen}
          className="p-2 bg-neutral-100 dark:bg-[#3A3B3C] hover:bg-neutral-200 dark:hover:bg-[#4E4F50] rounded-full text-neutral-700 dark:text-[#E4E6EB] transition relative md:hidden"
          title="Live Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Messenger Chats dropdown/trigger */}
        <button
          onClick={() => navigate("/chats")}
          className="p-2 bg-neutral-100 dark:bg-[#3A3B3C] hover:bg-neutral-200 dark:hover:bg-[#4E4F50] rounded-full text-neutral-700 dark:text-[#E4E6EB] transition relative"
          title="Facebook Messenger"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Notifications center */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 bg-neutral-100 dark:bg-[#3A3B3C] hover:bg-neutral-200 dark:hover:bg-[#4E4F50] rounded-full text-neutral-700 dark:text-[#E4E6EB] transition relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center font-bold font-sans">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-11 w-80 max-w-sm bg-white dark:bg-[#242526] rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 py-2 max-h-[450px] overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-100 dark:border-neutral-800">
                <span className="font-bold text-neutral-900 dark:text-[#E4E6EB]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs text-[#1877F2] font-semibold">{unreadCount} unread</span>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-[#B0B3B8]">
                  No notifications yet
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`w-full px-4 py-3 flex items-start space-x-3 text-left transition ${
                        notif.isRead ? "hover:bg-neutral-50 dark:hover:bg-[#3A3B3C]" : "bg-blue-50/50 dark:bg-[#1877F2]/10 hover:bg-blue-50 dark:hover:bg-[#1877F2]/15"
                      }`}
                    >
                      {notif.senderAvatar ? (
                        <img
                          src={notif.senderAvatar}
                          alt={notif.senderName}
                          className="w-10 h-10 rounded-full object-cover mt-0.5"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-neutral-300 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-600 dark:text-[#E4E6EB] mt-0.5">
                          {notif.senderName[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-neutral-900 dark:text-[#E4E6EB]">
                          {notif.senderName}
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-[#B0B3B8]">
                          {notif.type === "like" && "liked your post"}
                          {notif.type === "comment" && "commented on your post"}
                          {notif.type === "friend_request" && "sent you a friend request"}
                          {notif.type === "friend_accept" && "accepted your friend request"}
                          {notif.type === "message" && "sent you a message"}
                        </p>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block mt-1">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      {!notif.isRead && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#1877F2] mt-2 select-none" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile and Settings dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-9 h-9 rounded-full bg-[#3A3B3C] border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden"
          >
            {userProfile?.profilePicture ? (
              <img
                src={userProfile.profilePicture}
                alt={userProfile.fullName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="font-sans font-bold text-neutral-100 dark:text-neutral-100">
                {userProfile ? userProfile.fullName[0].toUpperCase() : "U"}
              </div>
            )}
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-11 w-64 bg-white dark:bg-[#242526] rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 py-2">
              <div className="px-4 py-3 flex items-center space-x-3 border-b border-neutral-100 dark:border-neutral-800">
                {userProfile?.profilePicture ? (
                  <img
                    src={userProfile.profilePicture}
                    alt={userProfile.fullName}
                    className="w-10 h-10 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#3A3B3C] flex items-center justify-center text-sm font-bold text-white">
                    {userProfile?.fullName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-[#E4E6EB]">
                    {userProfile?.fullName}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-[#B0B3B8]">
                    @{userProfile?.username}
                  </div>
                </div>
              </div>

              <Link
                to={`/profile/${userProfile?.uid}`}
                onClick={() => setShowProfileMenu(false)}
                className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-neutral-50 dark:hover:bg-[#3A3B3C] transition text-neutral-700 dark:text-[#E4E6EB]"
              >
                <User className="w-5 h-5 text-neutral-500 dark:text-[#B0B3B8]" />
                <span className="text-sm font-medium">My Profile</span>
              </Link>

              <button
                onClick={logout}
                className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-red-50 dark:hover:bg-[#1A1010] text-red-600 dark:text-red-400 transition text-left"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
