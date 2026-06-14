import React from "react";
import { Link } from "react-router-dom";
import {
  User,
  Users,
  MessageSquare,
  Compass,
  Bookmark,
  Calendar,
  Settings,
  HelpCircle,
  Award,
  Shield,
  Layers,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const SidebarLeft: React.FC = () => {
  const { userProfile } = useAuth();

  return (
    <aside className="w-64 hidden xl:block shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-2 py-4 space-y-2 border-r border-neutral-100 dark:border-neutral-900 bg-neutral-50 dark:bg-[#18191A]">
      {/* Profile quick access */}
      {userProfile && (
        <Link
          to={`/profile/${userProfile.uid}`}
          className="flex items-center space-x-3 p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-[#3A3B3C] transition"
        >
          {userProfile.profilePicture ? (
            <img
              src={userProfile.profilePicture}
              alt={userProfile.fullName}
              className="w-9 h-9 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#1877F2]/10 dark:bg-[#1877F2]/20 flex items-center justify-center font-bold text-[#1877F2]">
              {userProfile.fullName[0].toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-neutral-900 dark:text-[#E4E6EB] text-sm truncate">
            {userProfile.fullName}
          </span>
        </Link>
      )}

      {/* Main categories */}
      <div className="space-y-1">
        <Link
          to="/"
          className="flex items-center space-x-3 p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-[#3A3B3C] transition"
        >
          <Compass className="w-5 h-5 text-[#1877F2]" />
          <span className="text-sm text-neutral-900 dark:text-[#E4E6EB] font-semibold">
            Explore Feed
          </span>
        </Link>

        <Link
          to="/friends"
          className="flex items-center space-x-3 p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-[#3A3B3C] transition"
        >
          <Users className="w-5 h-5 text-emerald-500" />
          <span className="text-sm text-neutral-900 dark:text-[#E4E6EB] font-semibold">
            Friends Network
          </span>
        </Link>

        <Link
          to="/chats"
          className="flex items-center space-x-3 p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-[#3A3B3C] transition"
        >
          <MessageSquare className="w-5 h-5 text-sky-500" />
          <span className="text-sm text-neutral-900 dark:text-[#E4E6EB] font-semibold">
            Messenger
          </span>
        </Link>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800 my-4 pt-4 whitespace-nowrap overflow-hidden">
        <h4 className="px-2 text-xs font-bold text-neutral-400 dark:text-[#B0B3B8] uppercase tracking-wider mb-2">
          Your Shortcuts
        </h4>
        
        <div className="space-y-1">
          <Link
            to="/bookmarks"
            className="flex items-center space-x-3 p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-[#3A3B3C] transition"
          >
            <Bookmark className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-300">
              Saved Posts
            </span>
          </Link>

          <Link
            to="/groups"
            className="flex items-center space-x-3 p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-[#3A3B3C] transition"
          >
            <Users className="w-5 h-5 text-cyan-500" />
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-300">
              Groups Hub
            </span>
          </Link>

          <Link
            to="/pages"
            className="flex items-center space-x-3 p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-[#3A3B3C] transition"
          >
            <Award className="w-5 h-5 text-indigo-500" />
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-300">
              Business Pages
            </span>
          </Link>

          {/* Admin link showing conditionally or always for fast dev review access */}
          <Link
            to="/admin"
            className="flex items-center space-x-3 p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-[#3A3B3C] transition"
          >
            <Shield className="w-5 h-5 text-red-500" />
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-300">
              Admin Dashboard
            </span>
          </Link>
        </div>
      </div>

      {/* Footer metadata */}
      <div className="px-2 pt-6 text-[11px] text-neutral-400 dark:text-neutral-500 space-y-1">
        <p>Privacy · Terms · Facebook Clone © 2026</p>
      </div>
    </aside>
  );
};
