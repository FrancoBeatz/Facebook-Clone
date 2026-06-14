import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserCheck, UserX, UserMinus, Plus, Trash2, Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserService } from "../services/user";
import { FriendService } from "../services/friend";
import { NotificationService } from "../services/notification";
import { UserProfile, Relationship } from "../types";
import { FriendSkeleton } from "../components/Skeleton";

export const Friends: React.FC = () => {
  const { userProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);

  // Category Lists
  const [receivedRequests, setReceivedRequests] = useState<UserProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<UserProfile[]>([]);
  const [friendList, setFriendList] = useState<UserProfile[]>([]);
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!userProfile) return;

    let unsubRels = () => {};

    const loadData = async () => {
      try {
        const users = await UserService.getAllUsers();
        setAllUsers(users.filter((u) => u.uid !== userProfile.uid));

        unsubRels = FriendService.listenToRelationships(userProfile.uid, (rels) => {
          setRelationships(rels);
          setLoading(false);
        });
      } catch (err) {
        console.error("Friends management subscription error:", err);
        setLoading(false);
      }
    };

    loadData();
    return () => unsubRels();
  }, [userProfile]);

  // Compute friend sublists
  useEffect(() => {
    if (!userProfile || allUsers.length === 0) return;

    const received: UserProfile[] = [];
    const sent: UserProfile[] = [];
    const currentFriends: UserProfile[] = [];
    const suggs: UserProfile[] = [];

    // Build relationship maps
    const relMap = new Map<string, Relationship>();
    relationships.forEach((rel) => {
      const counterId = rel.fromId === userProfile.uid ? rel.toId : rel.fromId;
      relMap.set(counterId, rel);

      if (rel.status === "friends") {
        const friendProfile = allUsers.find((u) => u.uid === counterId);
        if (friendProfile && !currentFriends.some(f => f.uid === friendProfile.uid)) {
          currentFriends.push(friendProfile);
        }
      } else if (rel.status === "requested") {
        if (rel.fromId === userProfile.uid) {
          const uProfile = allUsers.find((u) => u.uid === rel.toId);
          if (uProfile && !sent.some(s => s.uid === uProfile.uid)) {
            sent.push(uProfile);
          }
        } else {
          const uProfile = allUsers.find((u) => u.uid === rel.fromId);
          if (uProfile && !received.some(r => r.uid === uProfile.uid)) {
            received.push(uProfile);
          }
        }
      }
    });

    // Populate suggestions (people with NO relationship mapped)
    allUsers.forEach((user) => {
      if (!relMap.has(user.uid)) {
        suggs.push(user);
      }
    });

    setReceivedRequests(received);
    setSentRequests(sent);
    setFriendList(currentFriends);
    setSuggestions(suggs);
  }, [allUsers, relationships, userProfile]);

  const handleAcceptRequest = async (relId: string, sender: UserProfile) => {
    if (!userProfile) return;
    try {
      await FriendService.acceptFriendRequest(relId, userProfile.uid);
      await NotificationService.createNotification(
        "friend_accept",
        sender.uid,
        userProfile.uid,
        userProfile.fullName,
        userProfile.profilePicture || ""
      );
    } catch (err) {
      console.error("Friend accept error:", err);
    }
  };

  const handleRejectOrCancel = async (relId: string) => {
    try {
      await FriendService.rejectFriendRequest(relId);
    } catch (err) {
      console.error("Friend drop error:", err);
    }
  };

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
      console.error("Add friend request error:", err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!userProfile) return;
    if (window.confirm("Confirm deletion of this friend connection?")) {
      try {
        await FriendService.removeFriend(userProfile.uid, friendId);
      } catch (err) {
        console.error("Remove friend request error:", err);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 pb-12">
      <div className="bg-white dark:bg-[#242526] p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm select-none">
        <h2 className="text-2xl font-extrabold text-[#1877F2]">Friends & Connections</h2>
        <p className="text-sm text-neutral-500 dark:text-[#B0B3B8] mt-1">
          Review onboarding queues, friend requests, connections, and explore new people.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FriendSkeleton />
          <FriendSkeleton />
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* 1. Pending Friend Requests (Received) */}
          {receivedRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-neutral-900 dark:text-neutral-100 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                <span>Friend Requests Received ({receivedRequests.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {receivedRequests.map((sender) => {
                  const sortedId = FriendService.getRelationshipId(userProfile!.uid, sender.uid);
                  return (
                    <div key={sender.uid} className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
                      <Link to={`/profile/${sender.uid}`} className="flex items-center space-x-3 mb-4">
                        {sender.profilePicture ? (
                          <img src={sender.profilePicture} alt={sender.fullName} className="w-12 h-12 rounded-full object-cover shrink-0 shadow-sm" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#1877F2]/10 flex items-center justify-center font-bold text-lg text-[#1877F2]">
                            {sender.fullName[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{sender.fullName}</div>
                          <span className="text-xs text-neutral-400">@{sender.username}</span>
                        </div>
                      </Link>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(sortedId, sender)}
                          className="flex-1 h-9 bg-[#1877F2] hover:bg-[#1565C0] text-white text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleRejectOrCancel(sortedId)}
                          className="flex-1 h-9 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 text-xs font-semibold rounded-lg transition"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. My Friends network */}
          <div>
            <h3 className="font-extrabold text-base text-neutral-900 dark:text-neutral-100 mb-4 uppercase tracking-wider">
              Your Friendship Network ({friendList.length})
            </h3>

            {friendList.length === 0 ? (
              <div className="bg-white dark:bg-[#242526] p-8 text-center rounded-xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-sm text-neutral-400">Your network list is empty. Add suggestions below to make connections!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {friendList.map((friend) => (
                  <div key={friend.uid} className="bg-[#fafeff] dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
                    <Link to={`/profile/${friend.uid}`} className="flex items-center space-x-3 truncate">
                      {friend.profilePicture ? (
                        <img src={friend.profilePicture} alt={friend.fullName} className="w-11 h-11 rounded-full object-cover shrink-0 shadow-sm" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#1877F2]/10 flex items-center justify-center font-bold text-sm text-[#1877F2]">
                          {friend.fullName[0].toUpperCase()}
                        </div>
                      )}
                      <div className="truncate">
                        <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{friend.fullName}</div>
                        <span className="text-[10px] text-neutral-400">@{friend.username}</span>
                      </div>
                    </Link>

                    <button
                      onClick={() => handleRemoveFriend(friend.uid)}
                      className="p-2 border border-neutral-200 dark:border-neutral-700 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 text-neutral-400 hover:text-red-500 transition"
                      title="Remove Friend"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Friend Suggestions */}
          <div>
            <h3 className="font-extrabold text-base text-neutral-900 dark:text-neutral-100 mb-4 uppercase tracking-wider">
              People You May Know ({suggestions.length})
            </h3>

            {suggestions.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">No suggestions left. Everyone is connected!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                {suggestions.map((user) => (
                  <div key={user.uid} className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
                    <Link to={`/profile/${user.uid}`} className="flex items-center space-x-3 truncate">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.fullName} className="w-10 h-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-600">
                          {user.fullName[0].toUpperCase()}
                        </div>
                      )}
                      <div className="truncate">
                        <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{user.fullName}</div>
                        <span className="text-[10px] text-neutral-400">@{user.username}</span>
                      </div>
                    </Link>

                    <button
                      onClick={() => handleSendRequest(user)}
                      className="p-2 bg-[#1877F2] hover:bg-[#1565C0] text-white rounded-full transition shadow"
                      title="Add Friend"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
