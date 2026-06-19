import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, MessageSquare, Check, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserService } from "../services/user";
import { FriendService } from "../services/friend";
import { NotificationService } from "../services/notification";
import { UserProfile, Relationship } from "../types";
import { FriendSkeleton } from "./Skeleton";

export const SidebarRight: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);

  // Listen to relationships and users
  useEffect(() => {
    if (!userProfile) return;

    let active = true;
    let unsubRels = () => {};

    const loadData = async () => {
      try {
        const users = await UserService.getAllUsers();
        if (!active) return;
        setAllUsers(users.filter((u) => u.uid !== userProfile.uid));

        unsubRels = FriendService.listenToRelationships(userProfile.uid, (rels) => {
          if (!active) return;
          setRelationships(rels);
          setLoading(false);
        });
      } catch (err) {
        if (!active) return;
        console.error("Error loading sidebar right content:", err);
        setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
      unsubRels();
    };
  }, [userProfile]);

  // Compute suggestions and friends lists
  useEffect(() => {
    if (!userProfile || allUsers.length === 0) return;

    // Build map of relationship states
    const relMap = new Map<string, Relationship>();
    relationships.forEach((rel) => {
      // Find the counterparty UID
      const counterId = rel.fromId === userProfile.uid ? rel.toId : rel.fromId;
      relMap.set(counterId, rel);
    });

    // Suggestion List: user profiles who have NO relationship document
    const suggs = allUsers.filter((u) => !relMap.has(u.uid)).slice(0, 5);
    setSuggestions(suggs);

    // Connected Friends List: relationship has status === 'friends'
    const connectedFriends = allUsers.filter((u) => {
      const rel = relMap.get(u.uid);
      return rel && rel.status === "friends";
    });
    setFriends(connectedFriends);
  }, [allUsers, relationships, userProfile]);

  const handleSendRequest = async (toUser: UserProfile) => {
    if (!userProfile) return;
    try {
      await FriendService.sendFriendRequest(userProfile.uid, toUser.uid);
      await NotificationService.createNotification(
        "friend_request",
        toUser.uid,
        userProfile.uid,
        userProfile.fullName,
        userProfile.profilePicture || ""
      );
    } catch (err) {
      console.error("Failed standard request submission:", err);
    }
  };

  const handleChat = (friendId: string) => {
    navigate(`/chats?user=${friendId}`);
  };

  return (
    <aside className="w-80 hidden lg:block shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-4 py-4 space-y-6 border-l border-neutral-100 dark:border-neutral-900 bg-neutral-50 dark:bg-[#18191A]">
      {/* Sponsored or Static Branding Card */}
      <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden">
        <h4 className="text-sm font-bold text-[#1877F2] mb-1">Developer Spotlight</h4>
        <p className="text-xs text-neutral-600 dark:text-[#B0B3B8] leading-relaxed">
          Experience Facebook Clone Dark Mode. Built with React 19, Tailwind, and Firebase Enterprise.
        </p>
      </div>

      {/* Friend Suggestions section */}
      <div>
        <h4 className="text-xs font-bold text-neutral-400 dark:text-[#B0B3B8] uppercase tracking-wider mb-3">
          People You May Know
        </h4>

        {loading ? (
          <div className="space-y-4">
            <FriendSkeleton />
            <FriendSkeleton />
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-xs text-neutral-500 dark:text-[#B0B3B8] italic">
            No suggestions available
          </p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((user) => (
              <div
                key={user.uid}
                className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#242526] hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] border border-neutral-200 dark:border-neutral-800 transition"
              >
                <Link to={`/profile/${user.uid}`} className="flex items-center space-x-3 flex-1 min-w-0">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.fullName}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-600 dark:text-[#E4E6EB] shrink-0">
                      {user.fullName[0].toUpperCase()}
                    </div>
                  )}
                  <div className="truncate">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#E4E6EB] leading-snug truncate">
                      {user.fullName}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-[#B0B3B8] truncate">
                      @{user.username}
                    </div>
                  </div>
                </Link>

                <button
                  onClick={() => handleSendRequest(user)}
                  className="p-1.5 bg-[#1877F2] hover:bg-[#1565C0] text-white rounded-full transition ml-2 shadow shrink-0"
                  title="Add Friend"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Contacts / Real Friends List section */}
      <div>
        <h4 className="text-xs font-bold text-neutral-400 dark:text-[#B0B3B8] uppercase tracking-wider mb-3">
          Contacts
        </h4>

        {loading ? (
          <div className="space-y-2">
            <FriendSkeleton />
            <FriendSkeleton />
          </div>
        ) : friends.length === 0 ? (
          <p className="text-xs text-neutral-500 dark:text-[#B0B3B8] italic">
            No contacts online yet. Connect with suggestions above!
          </p>
        ) : (
          <div className="space-y-1">
            {friends.map((contact) => (
              <button
                key={contact.uid}
                onClick={() => handleChat(contact.uid)}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-[#3A3B3C] transition text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {contact.profilePicture ? (
                      <img
                        src={contact.profilePicture}
                        alt={contact.fullName}
                        className="w-9 h-9 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-neutral-300 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-600 dark:text-[#E4E6EB]">
                        {contact.fullName[0].toUpperCase()}
                      </div>
                    )}
                    {/* Active/Green Badge */}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-[#18191A] rounded-full" />
                  </div>
                  <span className="text-sm font-semibold text-neutral-800 dark:text-[#E4E6EB] truncate">
                    {contact.fullName}
                  </span>
                </div>

                <MessageSquare className="w-4 h-4 text-[#B0B3B8] hover:text-[#1877F2]" />
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
