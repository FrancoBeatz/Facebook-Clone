import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Camera, MapPin, Globe, Edit3, UserPlus, UserMinus, UserCheck, MessageSquare, Plus, ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { UserService } from "../services/user";
import { FriendService } from "../services/friend";
import { NotificationService } from "../services/notification";
import { PostService } from "../services/post";
import { HighlightService } from "../services/highlight";
import { UserProfile, Relationship, Post, Highlight } from "../types";
import { PostCard } from "../components/PostCard";
import { PostSkeleton, ProfileSkeleton } from "../components/Skeleton";
import { EngagementDashboard } from "../components/EngagementDashboard";

function dataURLtoFile(dataurl: string, filename: string): File {
  try {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "";
    const bstr = atob(arr[arr.length - 1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (e) {
    console.error("Error decoding base64 file", e);
    return new File([], filename);
  }
}

export const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { userProfile: currentUser, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<"profile" | "cover" | null>(null);

  // Camera settings modal capture states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      setCapturedImage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: "user" },
        audio: false
      });
      setLocalStream(stream);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Camera access failed", err);
      alert("Could not access camera. Please make sure camera hardware is active and connected.");
    }
  };

  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.translate(400, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setCapturedImage(dataUrl);
      }
      stopCamera();
    }
  };

  const saveLivePhoto = async () => {
    if (!capturedImage || !currentUser) return;
    setUploadingType("profile");
    try {
      const file = dataURLtoFile(capturedImage, `captured_profile_${Date.now()}.jpg`);
      const downloadUrl = await UserService.uploadPhoto(currentUser.uid, file, "profile");
      await refreshProfile();
      setProfile((prev) =>
        prev ? { ...prev, profilePicture: downloadUrl } : null
      );
      setShowPhotoModal(false);
      setCapturedImage(null);
    } catch (err) {
      console.error("Error saving live camera profile snapshot:", err);
    } finally {
      setUploadingType(null);
    }
  };

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [skills, setSkills] = useState("");
  const [portfolio, setPortfolio] = useState("");

  const targetUid = userId || currentUser?.uid;

  // Highlights state
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showCreateHighlightModal, setShowCreateHighlightModal] = useState(false);
  const [newHighlightTitle, setNewHighlightTitle] = useState("");
  const [newHighlightCover, setNewHighlightCover] = useState("bg-gradient-to-tr from-pink-500 to-rose-500");
  const [selectedPostIdsForHighlight, setSelectedPostIdsForHighlight] = useState<string[]>([]);

  // Story Viewer state
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Load profile and user posts
  useEffect(() => {
    if (!targetUid) return;
    
    setLoading(true);
    let unsubPosts = () => {};
    let unsubRels = () => {};
    let unsubHighlights = () => {};

    const loadData = async () => {
      try {
        const u = await UserService.getUserProfile(targetUid);
        setProfile(u);

        if (u) {
          setFullName(u.fullName);
          setBio(u.bio || "");
          setLocation(u.location || "");
          setWebsite(u.website || "");
          setSkills(u.skills || "");
          setPortfolio(u.portfolio || "");
        }

        const users = await UserService.getAllUsers();
        setAllUsers(users);

        unsubPosts = PostService.listenToUserPosts(targetUid, (userPosts) => {
          setPosts(userPosts);
        });

        if (currentUser) {
          unsubRels = FriendService.listenToRelationships(currentUser.uid, (rels) => {
            setRelationships(rels);
          });
        }

        unsubHighlights = HighlightService.listenToUserHighlights(targetUid, (hlList) => {
          setHighlights(hlList);
          setLoading(false);
        });
      } catch (err) {
        console.error("Error drawing profile components:", err);
        setLoading(false);
      }
    };

    loadData();
    return () => {
      unsubPosts();
      unsubRels();
      unsubHighlights();
    };
  }, [targetUid, currentUser]);

  const activePostIds = activeHighlight?.postIds || [];
  const activePosts = posts.filter(p => activePostIds.includes(p.postId));

  useEffect(() => {
    if (!activeHighlight || activePosts.length === 0) return;

    const timer = setTimeout(() => {
      if (currentSlideIndex < activePosts.length - 1) {
        setCurrentSlideIndex((prev) => prev + 1);
      } else {
        setActiveHighlight(null);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeHighlight, currentSlideIndex, activePosts.length]);

  const handleCreateHighlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newHighlightTitle.trim() || selectedPostIdsForHighlight.length === 0) return;

    try {
      await HighlightService.createHighlight(
        currentUser.uid,
        newHighlightTitle.trim(),
        newHighlightCover,
        selectedPostIdsForHighlight
      );
      setNewHighlightTitle("");
      setNewHighlightCover("bg-gradient-to-tr from-pink-500 to-rose-500");
      setSelectedPostIdsForHighlight([]);
      setShowCreateHighlightModal(false);
    } catch (err) {
      console.error("Failed creating highlight:", err);
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (window.confirm("Are you sure you want to delete this highlight album?")) {
      try {
        await HighlightService.deleteHighlight(highlightId);
      } catch (err) {
        console.error("Failed deleting highlight album:", err);
      }
    }
  };

  const togglePostSelectionForHighlight = (postId: string) => {
    setSelectedPostIdsForHighlight((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    );
  };

  const handleViewHighlight = (hl: Highlight) => {
    setCurrentSlideIndex(0);
    setActiveHighlight(hl);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !currentUser) return;

    try {
      await UserService.updateUserProfile(currentUser.uid, {
        fullName,
        bio,
        location,
        website,
        skills,
        portfolio,
      });
      await refreshProfile();
      setIsEditing(false);
      setProfile((prev) =>
        prev
          ? { ...prev, fullName, bio, location, website, skills, portfolio }
          : null
      );
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

      // Award XP to sender on network expansion action
      try {
        await UserService.awardXP(currentUser.uid, 15, "friend_request_sent");
      } catch {}
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

      // Award XP for making new authentic social connections
      try {
        await UserService.awardXP(currentUser.uid, 50, "first_friend");
        await UserService.awardXP(profile.uid, 50, "first_friend");
      } catch {}
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

  const mutualFriends = currentUser && profile
    ? FriendService.getMutualFriends(currentUser.uid, profile.uid, allUsers, relationships)
    : [];

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-4 bg-white dark:bg-[#242526] rounded-xl my-6 shadow-sm border border-neutral-100 dark:border-neutral-800">
        <h2 className="text-xl font-bold text-neutral-800 dark:text-white">Profile Not Found</h2>
        <p className="text-sm text-neutral-500 dark:text-[#B0B3B8] mt-1">
          This user profile might have been deleted or contains invalid parameters.
        </p>
      </div>
    );
  }

  const isMyProfile = relationshipState === "self";

  return (
    <div className="w-full pb-12">
      {/* Cover Banner */}
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

        {/* Profile Avatar & Details Overlap */}
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
              <button
                type="button"
                onClick={() => setShowPhotoModal(true)}
                className="absolute bottom-1 right-1 bg-[#242526] text-[#E4E6EB] p-2 hover:brightness-110 rounded-full border border-neutral-700 cursor-pointer shadow transition"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Description */}
          <div className="flex-1 text-center md:text-left mt-4 md:mt-0 space-y-1.5 min-w-0 pr-4">
            <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-[#E4E6EB] truncate">
              {profile.fullName}
            </h2>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
              <p className="text-sm font-semibold text-neutral-500 dark:text-[#B0B3B8]">
                @{profile.username}
              </p>
              <span className="text-[10px] bg-sky-500/10 text-sky-500 border border-sky-500/20 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Level {profile.level || "Beginner"}
              </span>
            </div>
            
            {profile.bio && (
              <p className="text-sm text-neutral-700 dark:text-neutral-300 italic font-sans max-w-lg truncate mx-auto md:mx-0">
                {profile.bio}
              </p>
            )}
            
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

          {/* Action buttons */}
          <div className="mt-6 md:mt-0 flex gap-2 w-full md:w-auto shrink-0 select-none">
            {relationshipState === "self" ? (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="w-full md:w-auto px-6 h-10 bg-[#1877F2] hover:bg-[#1565C0] text-white font-extrabold text-sm rounded-lg transition shadow-md flex items-center justify-center space-x-2"
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
                  <MessageSquare className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Edit Bio overlays */}
        {isEditing && (
          <div className="mx-4 md:mx-8 mb-6 bg-neutral-50 dark:bg-[#1C1D1E] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 animate-slide-down">
            <h3 className="font-sans font-bold text-lg text-neutral-900 dark:text-[#E4E6EB] mb-4">
              Edit General Metadata & Portfolio Info
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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1877F2] uppercase">Core Skills (Comma separated)</label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="React, Firebase, Tailwind CSS"
                    className="w-full h-10 px-3 bg-white dark:bg-[#3A3B3C] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1877F2] uppercase">Portfolio Project URL</label>
                  <input
                    type="text"
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                    placeholder="https://github.com/profile/repo"
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

      {/* Story Highlights Album Header */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        <div className="bg-white dark:bg-[#242526] rounded-xl p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold text-neutral-900 dark:text-[#E4E6EB]">Story Highlights</span>
              <span className="text-[10px] bg-[#1877F2]/10 text-[#1877F2] dark:bg-[#1db954]/20 dark:text-[#39ff14] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Albums
              </span>
            </div>

            {isMyProfile && (
              <button
                onClick={() => {
                  setNewHighlightTitle("");
                  setShowCreateHighlightModal(true);
                }}
                className="bg-[#1877F2] hover:bg-[#1565C0] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow flex items-center space-x-1.5 transition duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Highlight</span>
              </button>
            )}
          </div>

          {highlights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-[#3A3B3C] flex items-center justify-center text-lg mb-2">
                🎬
              </div>
              <h5 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">No Highlights Curated</h5>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 max-w-xs leading-normal">
                {isMyProfile 
                  ? "Group and feature your best past posts into gorgeous categorized albums!" 
                  : "This profile has not showcased any story highlights yet."}
              </p>
            </div>
          ) : (
            <div className="flex items-center space-x-5 overflow-x-auto pb-2 scrollbar-none">
              {highlights.map((hl) => (
                <div 
                  key={hl.id} 
                  className="flex flex-col items-center space-y-1.5 shrink-0 text-center relative group"
                >
                  {isMyProfile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHighlight(hl.id);
                      }}
                      className="absolute top-0 right-0 w-5 h-5 bg-black/85 hover:bg-red-600 rounded-full text-white text-[10px] items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition duration-200 z-10 flex"
                      title="Delete Highlight"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    onClick={() => handleViewHighlight(hl)}
                    className="w-16 h-16 rounded-full p-0.5 border-2 border-[#1877F2] hover:scale-105 active:scale-95 transition duration-300 flex items-center justify-center bg-white dark:bg-[#242526] shadow-sm cursor-pointer"
                  >
                    <div className={`w-full h-full rounded-full ${hl.coverColor || 'bg-gradient-to-tr from-pink-500 to-rose-500'} flex items-center justify-center text-white text-base font-extrabold shadow-inner`}>
                      {hl.title[0].toUpperCase()}
                    </div>
                  </button>
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-xs font-bold text-neutral-800 dark:text-[#E4E6EB] max-w-[76px] truncate">
                      {hl.title}
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">
                      {hl.postIds.length} {hl.postIds.length === 1 ? "story" : "stories"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STORY SLIDESHOW */}
      <AnimatePresence>
        {activeHighlight && activePosts.length > 0 && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl border border-neutral-800 flex flex-col h-[600px]">
              
              {/* Progressive segments */}
              <div className="flex space-x-1 absolute top-4 left-4 right-4 z-40">
                {activePosts.map((_, idx) => (
                  <div key={idx} className="h-1 bg-white/20 rounded-full flex-1 overflow-hidden">
                    {idx < currentSlideIndex && (
                      <div className="h-full bg-white w-full" />
                    )}
                    {idx === currentSlideIndex && (
                      <motion.div
                        key={currentSlideIndex}
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 5, ease: "linear" }}
                        className="h-full bg-white"
                      />
                    )}
                    {idx > currentSlideIndex && (
                      <div className="h-full bg-white w-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Story Header */}
              <div className="absolute top-8 left-4 right-4 z-40 flex items-center justify-between pointer-events-auto">
                <div className="flex items-center space-x-3 text-white">
                  {profile.profilePicture ? (
                    <img
                      src={profile.profilePicture}
                      alt={profile.fullName}
                      className="w-9 h-9 rounded-full object-cover border border-white/50"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-sm">
                      {profile.fullName[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h5 className="font-extrabold text-xs leading-none drop-shadow-md">{profile.fullName}</h5>
                    <p className="text-[10px] text-neutral-300 mt-1 drop-shadow-md">
                      {new Date(activePosts[currentSlideIndex].createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-white bg-white/10 px-2 py-0.5 rounded-full font-bold">
                    {activeHighlight.title}
                  </span>
                  <button
                    onClick={() => setActiveHighlight(null)}
                    className="p-1 px-1.5 hover:bg-white/20 rounded-full text-white transition duration-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Story View Area */}
              <div className="flex-1 flex flex-col justify-center items-center p-6 relative">
                <button
                  onClick={() => {
                    if (currentSlideIndex > 0) {
                      setCurrentSlideIndex(currentSlideIndex - 1);
                    }
                  }}
                  disabled={currentSlideIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/80 rounded-full text-white/70 disabled:opacity-0 transition duration-200 z-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    if (currentSlideIndex < activePosts.length - 1) {
                      setCurrentSlideIndex(currentSlideIndex + 1);
                    } else {
                      setActiveHighlight(null);
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/80 rounded-full text-white/70 transition duration-200 z-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="w-full h-full flex flex-col items-center justify-center text-center mt-12 bg-neutral-900 rounded-2xl overflow-y-auto pt-6 text-white leading-relaxed">
                  <p className="text-white text-sm md:text-base font-medium whitespace-pre-wrap px-4 pb-6 overflow-y-auto max-h-[160px]">
                    {activePosts[currentSlideIndex].content}
                  </p>

                  {activePosts[currentSlideIndex].images && activePosts[currentSlideIndex].images!.length > 0 && (
                    <div className="w-full flex-1 max-h-[280px] rounded-xl overflow-hidden mt-2 bg-neutral-950 p-1 flex items-center justify-center">
                      <img
                        src={activePosts[currentSlideIndex].images![0]}
                        alt="Story asset"
                        className="max-h-full max-w-full object-contain rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-neutral-950/60 border-t border-neutral-800 text-center text-[11px] text-neutral-400 font-sans">
                Post {currentSlideIndex + 1} of {activePosts.length}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* STORY ALbum selector builder */}
      <AnimatePresence>
        {showCreateHighlightModal && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1C1D1E] w-full max-w-lg rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
              
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <h3 className="font-sans font-bold text-lg text-neutral-900 dark:text-[#E4E6EB]">
                  Curate Story Highlight Album
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateHighlightModal(false)}
                  className="p-1 px-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-slate-500 dark:text-neutral-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateHighlight} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#1877F2] uppercase tracking-wider">
                      Album Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="E.g., Vacation, Workouts, Code highlights"
                      value={newHighlightTitle}
                      onChange={(e) => setNewHighlightTitle(e.target.value)}
                      maxLength={18}
                      className="w-full h-10 px-3 bg-neutral-50 dark:bg-[#3A3B3C] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1877F2] uppercase tracking-wider">
                      Cover Theme Gradient
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { name: "Pink Sunset", class: "bg-gradient-to-tr from-pink-500 to-rose-500" },
                        { name: "Purple Sky", class: "bg-gradient-to-tr from-indigo-500 to-purple-600" },
                        { name: "Neon Ocean", class: "bg-gradient-to-tr from-cyan-400 to-blue-600" },
                        { name: "Emerald Forest", class: "bg-gradient-to-tr from-emerald-400 to-teal-600" },
                        { name: "Golden Glow", class: "bg-gradient-to-tr from-amber-400 to-orange-500" },
                      ].map((themeOpt) => (
                        <button
                          key={themeOpt.name}
                          type="button"
                          onClick={() => setNewHighlightCover(themeOpt.class)}
                          className={`h-10 rounded-xl ${themeOpt.class} border-2 relative transition duration-200 cursor-pointer ${
                            newHighlightCover === themeOpt.class
                              ? "border-[#1877F2] scale-105 shadow-md"
                              : "border-transparent hover:scale-102"
                          }`}
                        >
                          {newHighlightCover === themeOpt.class && (
                            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                              ✓
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#1877F2] uppercase tracking-wider block">
                      Select Stories/Posts to Curate ({selectedPostIdsForHighlight.length} selected)
                    </label>
                    {posts.length === 0 ? (
                      <p className="text-xs text-neutral-400 italic py-2">No posts available to curate.</p>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1 border border-neutral-100 dark:border-neutral-800 p-2 rounded-xl">
                        {posts.map((p) => {
                          const isSel = selectedPostIdsForHighlight.includes(p.postId);
                          return (
                            <button
                              key={p.postId}
                              type="button"
                              onClick={() => togglePostSelectionForHighlight(p.postId)}
                              className={`w-full flex items-start space-x-3 p-2 rounded-lg border text-left text-xs transition duration-150 ${
                                isSel
                                  ? "bg-[#1877F2]/10 border-[#1877F2]/30 dark:bg-sky-500/10"
                                  : "bg-white dark:bg-[#3A3B3C] border-neutral-200 dark:border-neutral-700"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${isSel ? "bg-[#1877F2] border-[#1877F2] text-white" : "border-neutral-300 dark:border-neutral-600"}`}>
                                {isSel && "✓"}
                              </div>
                              <div className="truncate flex-1">
                                <p className="font-bold text-neutral-800 dark:text-neutral-150 truncate">{p.content}</p>
                                <span className="text-[10px] text-neutral-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-neutral-50 dark:bg-[#1C1D1E] border-t border-neutral-150 dark:border-neutral-800 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateHighlightModal(false)}
                    className="px-4 h-9 border border-neutral-300 dark:border-neutral-750 text-neutral-500 rounded-lg text-sm font-semibold hover:bg-neutral-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={selectedPostIdsForHighlight.length === 0 || !newHighlightTitle.trim()}
                    className="px-5 h-9 bg-[#1877F2] hover:bg-[#1565C0] disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow transition"
                  >
                    Save Highlight Album
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Grid Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4 mt-6">
        
        {/* Left column info */}
        <div className="space-y-6">
          {/* Metadata Showcase Intro card */}
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

          {/* Gamification Tracker Panel */}
          <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-sans font-extrabold text-sm sm:text-base text-neutral-900 dark:text-[#E4E6EB]">Rank & Progress</h4>
              <span className="text-xs font-bold text-[#1877F2] bg-[#1877F2]/10 dark:text-white dark:bg-[#1db954]/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {profile.level || "Beginner"}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-neutral-500 dark:text-neutral-400">XP Points</span>
                <span className="text-neutral-800 dark:text-neutral-250 font-mono">{profile.xp || 0} XP</span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#1877F2] to-sky-400 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((profile.xp || 0) % 500) / 5)}%` }}
                />
              </div>
              <span className="text-[10px] text-neutral-400 block text-right">
                Next Milestone Reward: {(Math.floor((profile.xp || 0) / 500) + 1) * 500} XP
              </span>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-300 block">Achievements & Milestones</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "First Post", emoji: "📝", desc: "First published post on the platform", unlocked: (profile.achievements || []).includes("First Post") },
                  { name: "First Friend", emoji: "🤝", desc: "Connected with your first peer", unlocked: (profile.achievements || []).includes("First Friend") },
                  { name: "Top Creator", emoji: "👑", desc: "Reaches Level Creator at 600 XP", unlocked: (profile.achievements || []).includes("Top Creator") || (profile.xp || 0) >= 600 },
                  { name: "Social Butterfly", emoji: "🦋", desc: "Reaches Level Influencer at 1500 XP", unlocked: (profile.achievements || []).includes("Social Butterfly") || (profile.xp || 0) >= 1500 },
                  { name: "Viral Post", emoji: "⚡", desc: "Reaches Level Legend at 3500 XP", unlocked: (profile.achievements || []).includes("Viral Post") || (profile.xp || 0) >= 3500 },
                  { 
                    name: "Top Contributor", 
                    emoji: "🔥", 
                    desc: "Top contributor status based on active engagement over 1500 XP", 
                    unlocked: (profile.xp || 0) >= 1500 || (profile.achievements || []).includes("Top Contributor") 
                  },
                  { 
                    name: "Weekly Active", 
                    emoji: "📅", 
                    desc: "Weekly active engagement streak of 600 XP or higher", 
                    unlocked: (profile.xp || 0) >= 600 || (profile.achievements || []).includes("Weekly Active") 
                  },
                ].map((ach) => (
                  <motion.div 
                    key={ach.name}
                    whileHover={{ scale: 1.05 }}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs border transition duration-200 cursor-pointer relative group ${
                      ach.unlocked 
                        ? "bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-emerald-500/30 text-teal-800 dark:text-emerald-300 dark:border-emerald-500/25"
                        : "bg-neutral-50 dark:bg-neutral-900 border-neutral-150 dark:border-neutral-850 text-neutral-400 grayscale opacity-40 select-none"
                    }`}
                  >
                    <span className="text-sm select-none">{ach.emoji}</span>
                    <span className="font-sans font-bold text-[9px] uppercase tracking-wider">{ach.name}</span>
                    
                    {/* Tooltip detail hover overlay */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-neutral-950 text-white rounded-xl text-[10px] leading-relaxed opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 shadow-2xl border border-neutral-800 text-center">
                      <p className="font-extrabold text-xs text-amber-400 leading-none mb-1">{ach.name}</p>
                      <p className="font-sans text-neutral-300 leading-normal">{ach.desc}</p>
                      <p className={`mt-1.5 font-bold ${ach.unlocked ? 'text-emerald-400' : 'text-neutral-400'}`}>
                        {ach.unlocked ? "✓ Milestone Achieved" : "🔒 Milestone Locked"}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Theme Color Picker Widget */}
          {isMyProfile && (
            <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
              <h4 className="font-sans font-extrabold text-sm sm:text-base text-neutral-900 dark:text-[#E4E6EB]">App Theme Controller</h4>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">Pick any high-contrast layout. Choice is persisted across your sessions.</p>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "facebook-dark", label: "FB Dark", color: "bg-[#18191A]" },
                  { id: "facebook-light", label: "FB Light", color: "bg-[#F0F2F5] border-neutral-300" },
                  { id: "spotify", label: "Spotify", color: "bg-[#121212] text-[#1DB954]" },
                  { id: "discord", label: "Discord", color: "bg-[#202225] text-[#5865F2]" },
                  { id: "cyberpunk", label: "Cyberpunk", color: "bg-[#0C0614] text-[#FCEE0A]" },
                  { id: "neon-green", label: "Neon Green", color: "bg-black text-[#39FF14]" },
                  { id: "midnight", label: "Midnight", color: "bg-[#030712] text-[#38BDF8]" },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setTheme(th.id as any)}
                    className={`flex items-center space-x-1.5 p-2 rounded-xl border text-[11px] font-bold transition duration-150 cursor-pointer ${
                      theme === th.id
                        ? "border-[#1877F2] bg-[#1877F2]/10 text-[#1877F2] dark:border-[#39FF14] dark:bg-[#101E10] dark:text-[#39FF14]"
                        : "border-neutral-250 dark:border-neutral-750 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-[#E4E6EB]"
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full ${th.color} border shrink-0`} />
                    <span className="truncate">{th.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Core Skills & Portfolio list cards */}
          {(profile.skills || profile.portfolio) && (
            <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4 animate-fade-in">
              <h4 className="font-sans font-extrabold text-sm sm:text-base text-neutral-900 dark:text-[#E4E6EB]">Skills & Portfolio</h4>
              
              {profile.skills && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-neutral-400 block uppercase tracking-wider">Professional Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.split(",").map((s) => (
                      <span 
                        key={s} 
                        className="bg-neutral-100 dark:bg-[#3A3B3C] text-neutral-800 dark:text-[#E4E6EB] text-[10px] font-bold px-2.5 py-0.5 rounded-md"
                      >
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.portfolio && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-extrabold text-neutral-400 block uppercase tracking-wider">Portfolio Project Showcase</span>
                  <a 
                    href={profile.portfolio} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[#1877F2] hover:underline dark:text-sky-400 font-bold text-xs flex items-center space-x-1.5"
                  >
                    <span>🔗 {profile.portfolio.replace(/^https?:\/\/(www\.)?/, "")}</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Mutual Connections */}
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

        {/* Center Canvas / Timeline */}
        <div className="md:col-span-2 space-y-5">
          {/* 30-Day D3 Engagement Dashboard */}
          <EngagementDashboard posts={posts} profileName={profile.fullName} />

          <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-150 dark:border-neutral-800 text-xs font-bold text-neutral-400 dark:text-[#B0B3B8] uppercase tracking-wider select-none mb-4">
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

      {/* Profiling Camera Modal Overlay */}
      <AnimatePresence>
        {showPhotoModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#242526] w-full max-w-md rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl relative">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setShowPhotoModal(false);
                }}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-100 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-neutral-900 dark:text-[#E4E6EB] mb-4">
                Update Profile Picture
              </h3>

              <div className="space-y-4">
                {/* Visual Camera Canvas or Preview */}
                <div className="bg-neutral-100 dark:bg-black w-full aspect-square max-w-[280px] mx-auto rounded-xl overflow-hidden border border-neutral-300 dark:border-neutral-800 relative flex items-center justify-center">
                  {cameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : capturedImage ? (
                    <img
                      src={capturedImage}
                      alt="Captured face draft"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4 text-neutral-500 text-xs">
                      <p className="text-2xl mb-2">📸</p>
                      <p>Webcam stream inactive</p>
                    </div>
                  )}
                </div>

                {/* Camera Actions */}
                <div className="flex justify-center gap-2">
                  {!cameraActive && !capturedImage ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="bg-[#1877F2] hover:bg-[#1565C0] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md"
                    >
                      Use Live Device Camera
                    </button>
                  ) : cameraActive ? (
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-red-500 hover:bg-red-650 text-white px-4 py-2 rounded-xl text-xs font-bold animate-pulse shadow-md"
                    >
                      Capture Snapshot
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 px-3 py-2 rounded-xl text-xs font-bold"
                      >
                        Retake
                      </button>
                      <button
                        type="button"
                        onClick={saveLivePhoto}
                        className="bg-[#39ff14] hover:bg-[#20c00a] text-black dark:bg-[#39ff14] dark:hover:bg-[#32dd10] px-4 py-2 rounded-xl text-xs font-bold shadow-md"
                      >
                        Save Photo
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                  <span className="flex-shrink mx-4 text-[10px] text-neutral-400 font-extrabold uppercase">or upload file</span>
                  <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                </div>

                {/* Option 2: Upload */}
                <div className="text-center">
                  <label className="inline-block bg-white dark:bg-[#3A3B3C] hover:bg-neutral-50 dark:hover:bg-[#4E4F50] border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition select-none">
                    Select File from Device
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && currentUser) {
                          handlePhotoUpload(e, "profile").then(() => {
                            setShowPhotoModal(false);
                          });
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
