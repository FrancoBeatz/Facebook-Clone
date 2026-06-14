import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Camera, MapPin, Globe, Edit3, UserPlus, UserMinus, UserCheck, MessageSquare, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserService } from "../services/user";
import { FriendService } from "../services/friend";
import { NotificationService } from "../services/notification";
import { PostService } from "../services/post";
import { UserProfile, Relationship, Post } from "../types";
import { PostCard } from "../components/PostCard";
import { PostSkeleton } from "../components/Skeleton";

export const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { userProfile: currentUser, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<"profile" | "cover" | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");

  const targetUid = userId || currentUser?.uid;

  // Load profile and user posts
  useEffect(() => {
    if (!targetUid) return;
    
    setLoading(true);
    let unsubPosts = () => {};
    let unsubRels = () => {};

    const loadData = async () => {
      try {
        const u = await UserService.getUserProfile(targetUid);
        setProfile(u);

        if (u) {
          // Initialize edit fields
          setFullName(u.fullName);
          setBio(u.bio || "");
          setLocation(u.location || "");
          setWebsite(u.website || "");
        }

        // Fetch users for mutual friends computation
        const users = await UserService.getAllUsers();
        setAllUsers(users);

        // Listen to posts
        unsubPosts = PostService.listenToUserPosts(targetUid, (userPosts) => {
          setPosts(userPosts);
        });

        // Listen to relations to see friendship states
        if (currentUser) {
          unsubRels = FriendService.listenToRelationships(currentUser.uid, (rels) => {
            setRelationships(rels);
            setLoading(false);
          });
        }
      } catch (err) {
        console.error("Error drawing profile components:", err);
        setLoading(false);
      }
    };

    loadData();
    return () => {
      unsubPosts();
      unsubRels();
    };
  }, [targetUid, currentUser]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !currentUser) return;

    try {
      await UserService.updateUserProfile(currentUser.uid, {
        fullName,
        bio,
        location,
        website,
      });
      await refreshProfile();
      setIsEditing(false);
      setProfile((prev) => prev ? { ...prev, fullName, bio, location, website } : null);
    } catch (err) {
      console.error("Failed standard profile updates:", err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "profile" | "cover") => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploadingType(type);
    try {
      const downloadUrl = await UserService.uploadPhoto(currentUser.uid, file, type);
      await refreshProfile();
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              profilePicture: type === "profile" ? downloadUrl : prev.profilePicture,
              coverPhoto: type === "cover" ? downloadUrl : prev.coverPhoto,
            }
          : null
      );
    } catch (err) {
      console.error("Trouble committing asset uploads:", err);
    } finally {
      setUploadingType(null);
    }
  };

  // Compute friend connection states
  const getRelationshipState = () => {
    if (!currentUser || !profile || currentUser.uid === profile.uid) return "self";

    const sortedId = FriendService.getRelationshipId(currentUser.uid, profile.uid);
    const rel = relationships.find((r) => r.id === sortedId);

    if (!rel) return "none";
    if (rel.status === "friends") return "friends";
    if (rel.status === "requested" && rel.fromId === currentUser.uid) return "sent";
    return "received";
  };

  const relationshipState = getRelationshipState();

  const handleSendRequest = async () => {
    if (!currentUser || !profile) return;
    try {
      await FriendService.sendFriendRequest(currentUser.uid, profile.uid);
      await NotificationService.createNotification(
        "friend_request",
        profile.uid,
        currentUser.uid,
        currentUser.fullName,
        currentUser.profilePicture || ""
      );
    } catch (err) {
      console.error("Error setting friend request:", err);
    }
  };

  const handleAcceptRequest = async () => {
    if (!currentUser || !profile) return;
    const sortedId = FriendService.getRelationshipId(currentUser.uid, profile.uid);
    try {
      await FriendService.acceptFriendRequest(sortedId, currentUser.uid);
      await NotificationService.createNotification(
        "friend_accept",
        profile.uid,
        currentUser.uid,
        currentUser.fullName,
        currentUser.profilePicture || ""
      );
    } catch (err) {
      console.error("Error accepting request:", err);
    }
  };

  const handleRemoveFriendOrCancel = async () => {
    if (!currentUser || !profile) return;
    if (window.confirm("Confirm removal or cancellation of this relationship connection?")) {
      try {
        await FriendService.removeFriend(currentUser.uid, profile.uid);
      } catch (err) {
        console.error("Unfriend/Cancel trigger failure:", err);
      }
    }
  };

  const handleMessage = () => {
    if (profile) {
      navigate(`/chats?user=${profile.uid}`);
    }
  };

  // Compute mutual friends lists
  const mutualFriends = currentUser && profile
    ? FriendService.getMutualFriends(currentUser.uid, profile.uid, allUsers, relationships)
    : [];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
        <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
        <PostSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-4 bg-white dark:bg-[#242526] rounded-xl my-6 shadow-sm border border-neutral-100 dark:border-neutral-800">
        <h2 className="text-xl font-bold text-neutral-800 dark:text-white">Profile Not Found</h2>
        <p className="text-sm text-neutral-500 dark:text-[#B0B3B8] mt-1">
          This user profile might have been deleted or the pointer contains invalid parameters.
        </p>
      </div>
    );
  }

  const isMyProfile = relationshipState === "self";

  return (
    <div className="w-full pb-12">
      {/* Profiler Showcase Header Banner */}
      <div className="relative bg-white dark:bg-[#242526] border-b border-neutral-200 dark:border-neutral-800 max-w-5xl mx-auto shadow-sm rounded-b-xl overflow-hidden">
        
        {/* Cover Photo area */}
        <div className="relative h-48 sm:h-64 md:h-80 bg-neutral-100 dark:bg-[#18191A]">
          {profile.coverPhoto ? (
            <img src={profile.coverPhoto} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#1877F2]/10 to-[#1877F2]/30 flex items-center justify-center p-4" />
          )}

          {isMyProfile && (
            <label className="absolute bottom-4 right-4 bg-white/80 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-900 text-neutral-800 dark:text-white rounded-lg px-4 py-2 text-xs font-bold leading-none cursor-pointer border border-neutral-400 dark:border-neutral-700 shadow-xl transition flex items-center space-x-1.5 select-none animate-fade-in">
              <Camera className="w-4 h-4" />
              <span>{uploadingType === "cover" ? "Uploading banner..." : "Edit Cover Banner"}</span>
              <input type="file" onChange={(e) => handlePhotoUpload(e, "cover")} accept="image/*" className="hidden" />
            </label>
          )}
        </div>

        {/* Profile Avatar / Overlap */}
        <div className="px-4 pb-6 flex flex-col md:flex-row items-center md:items-end md:space-x-6 relative -mt-16 md:-mt-20 md:px-8">
          
          {/* Avatar Picture */}
          <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white dark:border-[#242526] bg-[#3A3B3C] shadow-lg overflow-hidden shrink-0">
            {profile.profilePicture ? (
              <img src={profile.profilePicture} alt={profile.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-extrabold text-white bg-gradient-to-br from-[#1877F2] to-sky-600">
                {profile.fullName[0].toUpperCase()}
              </div>
            )}

            {isMyProfile && (
              <label className="absolute bottom-1 right-1 bg-[#242526] text-[#E4E6EB] p-2 hover:brightness-110 rounded-full border border-neutral-700 cursor-pointer shadow transition">
                <Camera className="w-4 h-4" />
                <input type="file" onChange={(e) => handlePhotoUpload(e, "profile")} accept="image/*" className="hidden" />
              </label>
            )}
          </div>

          {/* Profile Quick Description */}
          <div className="flex-1 text-center md:text-left mt-4 md:mt-0 space-y-1.5 min-w-0 pr-4">
            <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-[#E4E6EB] truncate">
              {profile.fullName}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-[#B0B3B8] font-sans">
              @{profile.username}
            </p>
            {profile.bio && (
              <p className="text-sm text-neutral-700 dark:text-neutral-300 italic font-sans max-w-lg truncate">
                {profile.bio}
              </p>
            )}
            
            {/* Meta Tags Details */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-1 text-xs text-neutral-500 dark:text-[#B0B3B8]">
              {profile.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-red-500" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center space-x-1 text-[#1877F2] hover:underline">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[150px]">{profile.website}</span>
                </a>
              )}
            </div>
          </div>

          {/* Profile Actions Sidebar Buttons */}
          <div className="mt-6 md:mt-0 flex gap-2 w-full md:w-auto shrink-0 select-none">
            {relationshipState === "self" ? (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="w-full md:w-auto px-6 h-10 bg-neutral-100 dark:bg-[#3A3B3C] hover:bg-neutral-200 dark:hover:bg-[#4E4F50] text-[#1877F2] dark:text-white font-extrabold text-sm rounded-lg transition flex items-center justify-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile Details</span>
              </button>
            ) : (
              <div className="flex gap-2 w-full md:w-auto">
                {relationshipState === "none" && (
                  <button
                    onClick={handleSendRequest}
                    className="flex-1 md:flex-initial px-6 h-10 bg-[#1877F2] hover:bg-[#1565C0] text-white font-extrabold text-sm rounded-lg shadow transition flex items-center justify-center space-x-2"
                  >
                    <UserPlus className="w-4.5 h-4.5" />
                    <span>Add Friend</span>
                  </button>
                )}

                {relationshipState === "sent" && (
                  <button
                    onClick={handleRemoveFriendOrCancel}
                    className="flex-1 md:flex-initial px-6 h-10 bg-neutral-100 dark:bg-[#3A3B3C] hover:bg-red-50 dark:hover:bg-[#1A1010] hover:text-red-600 text-neutral-600 dark:text-[#B0B3B8] font-bold text-sm rounded-lg transition flex items-center justify-center space-x-2"
                  >
                    <UserMinus className="w-4.5 h-4.5" />
                    <span>Cancel Request</span>
                  </button>
                )}

                {relationshipState === "received" && (
                  <button
                    onClick={handleAcceptRequest}
                    className="flex-1 md:flex-initial px-6 h-10 bg-[#1877F2] hover:bg-[#1565C0] text-white font-extrabold text-sm rounded-lg shadow transition flex items-center justify-center space-x-2"
                  >
                    <UserCheck className="w-4.5 h-4.5" />
                    <span>Accept Request</span>
                  </button>
                )}

                {relationshipState === "friends" && (
                  <button
                    onClick={handleRemoveFriendOrCancel}
                    className="flex-1 md:flex-initial px-6 h-10 bg-[#3A3B3C] hover:bg-red-900/40 text-red-400 font-bold text-sm rounded-lg transition flex items-center justify-center space-x-2 border border-red-900/30"
                  >
                    <UserMinus className="w-4.5 h-4.5" />
                    <span>Unfriend</span>
                  </button>
                )}

                <button
                  onClick={handleMessage}
                  className="px-4 h-10 border border-neutral-300 dark:border-[#3A3B3C] bg-white dark:bg-[#3A3B3C] text-neutral-700 dark:text-[#E4E6EB] rounded-lg hover:bg-neutral-50 dark:hover:bg-[#4E4F50] transition flex items-center justify-center"
                >
                  <MessageSquare className="w-4.5 h-4.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Edit Bio fields Overlay modal */}
        {isEditing && (
          <div className="mx-4 md:mx-8 mb-6 bg-neutral-50 dark:bg-[#1C1D1E] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 animate-slide-down">
            <h3 className="font-sans font-bold text-lg text-neutral-900 dark:text-[#E4E6EB] mb-4">
              Edit Metadata Information
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1877F2] uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-10 px-3 bg-white dark:bg-[#3A3B3C] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1877F2] uppercase">Live Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="E.g., London, UK"
                    className="w-full h-10 px-3 bg-white dark:bg-[#3A3B3C] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1877F2] uppercase">Personal Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full h-10 px-3 bg-white dark:bg-[#3A3B3C] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-[#1877F2] uppercase">Bio Statement</label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Introduce yourself..."
                    className="w-full h-10 px-3 bg-white dark:bg-[#3A3B3C] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 h-9 border border-neutral-300 dark:border-neutral-700 text-neutral-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 h-9 bg-[#1877F2] hover:bg-[#1565C0] text-white rounded-lg text-sm font-bold shadow"
                >
                  Save Information
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4 mt-6">
        
        {/* Left column info */}
        <div className="space-y-6">
          {/* Metadata Showcase card */}
          <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h4 className="font-sans font-extrabold text-base text-neutral-900 dark:text-[#E4E6EB]">Intro</h4>
            {profile.bio ? (
              <p className="text-sm text-neutral-700 dark:text-[#B0B3B8] text-center italic">{profile.bio}</p>
            ) : (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 italic text-center">No bio added yet</p>
            )}

            <div className="space-y-3 pt-2 text-sm text-neutral-600 dark:text-neutral-300">
              <div className="flex items-center space-x-2.5">
                <MapPin className="w-4 h-4 text-[#B0B3B8] shrink-0" />
                <span>Lives in <strong className="text-neutral-800 dark:text-neutral-200">{profile.location || "Earth"}</strong></span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Globe className="w-4 h-4 text-[#B0B3B8] shrink-0" />
                <span>Website: <strong className="text-[#1877F2] hover:underline font-mono text-xs">{profile.website || "None"}</strong></span>
              </div>
            </div>
          </div>

          {/* Mutual Friends Showcase */}
          {currentUser && currentUser.uid !== profile.uid && (
            <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-sans font-extrabold text-sm sm:text-base text-neutral-900 dark:text-[#E4E6EB]">
                  Mutual Connections
                </h4>
                <span className="text-xs text-neutral-400 dark:text-[#B0B3B8]">{mutualFriends.length} friends</span>
              </div>

              {mutualFriends.length === 0 ? (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 italic text-center py-2">
                  No mutual friends found
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mutualFriends.map((f) => (
                    <Link
                      key={f.uid}
                      to={`/profile/${f.uid}`}
                      className="flex flex-col items-center text-center space-y-1.5 focus:outline-none"
                    >
                      {f.profilePicture ? (
                        <img
                          src={f.profilePicture}
                          alt={f.fullName}
                          className="w-12 h-12 rounded-full object-cover shadow"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-300 dark:bg-neutral-800 flex items-center justify-center font-bold text-sm text-white">
                          {f.fullName[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 truncate max-w-full">
                        {f.fullName.split(" ")[0]}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center/Timeline Posts list */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-[#E1E4E6]/20 dark:border-neutral-800 text-xs font-bold text-neutral-400 dark:text-[#B0B3B8] uppercase tracking-wider select-none mb-4">
            Posts Timeline
          </div>

          {posts.length === 0 ? (
            <div className="bg-white dark:bg-[#242526] p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center font-sans">
              <h3 className="text-base font-bold text-neutral-800 dark:text-[#E4E6EB]">Silent Timeline</h3>
              <p className="text-sm text-neutral-500 dark:text-[#B0B3B8] mt-1 shrink-none">
                No articles yet published on this timeline.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.postId} post={post} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
