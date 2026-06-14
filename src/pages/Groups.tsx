import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { GroupService } from "../services/group";
import { PostService } from "../services/post";
import { PostCard } from "../components/PostCard";
import { Group, Post } from "../types";
import { Users, Plus, Info, Image as ImageIcon, Send, ArrowLeft, MessageSquare, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Groups: React.FC = () => {
  const { userProfile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Group creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");

  // Grid / active view state
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedGroupPosts, setSelectedGroupPosts] = useState<Post[]>([]);
  const [groupPostText, setGroupPostText] = useState("");
  const [groupPostImages, setGroupPostImages] = useState<File[]>([]);
  const [submittingPost, setSubmittingPost] = useState(false);

  // Load Groups
  useEffect(() => {
    const unsub = GroupService.listenToGroups((list) => {
      setGroups(list);
      setLoading(false);
      
      // Update selectedGroup references if open
      if (selectedGroup) {
        const fresh = list.find(g => g.id === selectedGroup.id);
        if (fresh) setSelectedGroup(fresh);
      }
    });

    return unsub;
  }, [selectedGroup]);

  // Load active group posts
  useEffect(() => {
    if (!selectedGroup) return;

    const unsubPosts = PostService.listenToFeed((allPosts) => {
      // Filter posts belonging strictly to this group
      const filtered = allPosts.filter((p) => p.groupId === selectedGroup.id);
      setSelectedGroupPosts(filtered);
    });

    return unsubPosts;
  }, [selectedGroup]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !groupName.trim()) return;

    try {
      const gId = await GroupService.createGroup(groupName.trim(), groupDesc.trim(), userProfile.uid);
      setGroupName("");
      setGroupDesc("");
      setShowCreateForm(false);
      
      // Auto open group detail channel
      const res = await GroupService.getGroup(gId);
      if (res) setSelectedGroup(res);
    } catch (err) {
      console.error("Failed to construct group:", err);
    }
  };

  const handleJoinLeaveToggle = async (group: Group) => {
    if (!userProfile) return;
    const isMember = group.members.includes(userProfile.uid);

    try {
      if (isMember) {
        await GroupService.leaveGroup(group.id, userProfile.uid);
      } else {
        await GroupService.joinGroup(group.id, userProfile.uid);
      }
    } catch (err) {
      console.error("Failed standard membership modification:", err);
    }
  };

  const handleAddGroupPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !selectedGroup || !groupPostText.trim()) return;

    setSubmittingPost(true);
    try {
      await PostService.createPost(
        userProfile.uid,
        userProfile.fullName,
        userProfile.profilePicture || "",
        groupPostText,
        groupPostImages,
        {
          groupId: selectedGroup.id,
          groupName: selectedGroup.name,
        }
      );
      setGroupPostText("");
      setGroupPostImages([]);
    } catch (err) {
      console.error("Group post submission failure:", err);
    } finally {
      setSubmittingPost(false);
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-2 sm:px-4 py-6 space-y-6">
      <AnimatePresence mode="wait">
        {!selectedGroup ? (
          /* ALL GROUPS VIEW */
          <motion.div
            key="groups-dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header banner */}
            <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100 flex items-center space-x-2">
                  <Users className="w-6 h-6 text-[#1877F2]" />
                  <span>Groups Community Directory</span>
                </h1>
                <p className="text-xs text-neutral-500 dark:text-[#B0B3B8] mt-0.5">
                  Meet specialized communities, post inside feeds, and connect offline.
                </p>
              </div>

              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full sm:w-auto h-9 px-4 fill-none bg-[#1877F2] hover:bg-[#1565C0] text-sm text-white font-bold rounded-lg transition flex items-center justify-center space-x-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Create Group</span>
              </button>
            </div>

            {/* Create Group Dialog Modal overlay if toggled */}
            {showCreateForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div onClick={() => setShowCreateForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
                <div className="relative w-full max-w-md bg-white dark:bg-[#242526] p-6 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-slide-up">
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Create New Community Group</h3>
                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-neutral-500 block mb-1">Group Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Tech Founders & Innovators"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full h-10 px-3 bg-neutral-50 dark:bg-[#3A3B3C] border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-neutral-500 block mb-1">Group Description</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="What's this group about?"
                        value={groupDesc}
                        onChange={(e) => setGroupDesc(e.target.value)}
                        className="w-full p-3 bg-neutral-50 dark:bg-[#3A3B3C] border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="h-9 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="h-9 px-4 bg-[#1877F2] text-white hover:bg-[#1565C0] font-bold rounded-lg text-sm"
                      >
                        Launch Group
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* List group cards */}
            {loading ? (
              <div className="text-center py-10 text-neutral-400 font-bold animate-pulse">Loading groups directory...</div>
            ) : groups.length === 0 ? (
              <div className="bg-white dark:bg-[#242526] p-10 text-center rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <Users className="w-12 h-12 text-[#1877F2]/10 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1">No group channels found</h3>
                <p className="text-xs text-neutral-500 dark:text-[#B0B3B8] mb-4">Be the pioneer and build the first community group channel!</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-1.5 text-xs bg-[#1877F2] text-white rounded-lg font-bold"
                >
                  Construct First Group
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map((g) => {
                  const isMember = userProfile ? g.members.includes(userProfile.uid) : false;
                  return (
                    <div
                      key={g.id}
                      className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1877F2] to-cyan-500 flex items-center justify-center text-white">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <button
                              onClick={() => setSelectedGroup(g)}
                              className="font-bold text-sm text-neutral-900 dark:text-white hover:underline text-left"
                            >
                              {g.name}
                            </button>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">
                              {g.members.length} {g.members.length === 1 ? "member" : "members"}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-[#B0B3B8] line-clamp-2 leading-relaxed">
                          {g.description || "No description provided."}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 mt-4 pt-3">
                        <button
                          onClick={() => setSelectedGroup(g)}
                          className="text-xs text-[#1877F2] font-bold hover:underline"
                        >
                          View Community Feed →
                        </button>

                        <button
                          onClick={() => handleJoinLeaveToggle(g)}
                          className={`h-8 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 ${
                            isMember
                              ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200"
                              : "bg-[#1877F2] text-white hover:bg-[#1565C0]"
                          }`}
                        >
                          <span>{isMember ? "Joined" : "Join"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* SELECTED INDIVIDUAL GROUP DETAIL VIEW & FEED */
          <motion.div
            key="groups-details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Go back backlink */}
            <button
              onClick={() => setSelectedGroup(null)}
              className="flex items-center space-x-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-[#1877F2] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-bold">Back to Groups Directory</span>
            </button>

            {/* Banner details */}
            <div className="bg-gradient-to-r from-[#1877F2] to-[#0D47A1] p-6 rounded-xl text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-48">
              <div className="absolute right-0 bottom-0 opacity-15">
                <Users className="w-64 h-64 -mr-16 -mb-16" />
              </div>

              <div className="relative z-10">
                <div className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full inline-block font-bold py-1 px-2.5 mb-2">
                  Specialized Community Link
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold truncate">{selectedGroup.name}</h2>
                <p className="text-xs text-blue-100 mt-1 max-w-xl">{selectedGroup.description}</p>
              </div>

              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/20 mt-6 pt-4">
                <div className="text-xs text-blue-50">
                  Created on {new Date(selectedGroup.createdAt).toLocaleDateString()} · <strong>{selectedGroup.members.length} Members</strong>
                </div>

                <button
                  onClick={() => handleJoinLeaveToggle(selectedGroup)}
                  className="h-8 px-5 bg-white text-neutral-900 hover:bg-neutral-100 rounded-lg text-xs font-bold shadow transition"
                >
                  {selectedGroup.members.includes(userProfile?.uid || "") ? "Joined (Leave Group)" : "Join Group"}
                </button>
              </div>
            </div>

            {/* Content: Form + Group Posts list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Feed panel */}
              <div className="md:col-span-2 space-y-4">
                {selectedGroup.members.includes(userProfile?.uid || "") ? (
                  /* Create Post inside Group Box */
                  <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-800 overflow-hidden shrink-0">
                        {userProfile?.profilePicture ? (
                          <img
                            src={userProfile.profilePicture}
                            alt={userProfile.fullName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-white bg-[#1877F2]">
                            {userProfile?.fullName[0]}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-neutral-500">
                        Post inside <strong className="text-neutral-800 dark:text-neutral-100">{selectedGroup.name}</strong>
                      </span>
                    </div>

                    <form onSubmit={handleAddGroupPost} className="space-y-3">
                      <textarea
                        required
                        rows={2}
                        placeholder={`Share something with ${selectedGroup.name}...`}
                        value={groupPostText}
                        onChange={(e) => setGroupPostText(e.target.value)}
                        className="w-full p-3 bg-neutral-50 dark:bg-[#3A3B3C] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
                      />

                      <div className="flex items-center justify-between">
                        {/* Static image attach notification */}
                        <label className="flex items-center space-x-1 text-xs text-neutral-500 dark:text-[#B0B3B8] cursor-pointer hover:text-[#1877F2]">
                          <ImageIcon className="w-4 h-4 text-emerald-500" />
                          <span>Attach Photos</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              if (e.target.files) setGroupPostImages(Array.from(e.target.files));
                            }}
                            className="hidden"
                          />
                        </label>

                        {groupPostImages.length > 0 && (
                          <span className="text-[10px] bg-[#1877F2]/10 text-[#1877F2] font-semibold py-0.5 px-2 rounded">
                            {groupPostImages.length} selected
                          </span>
                        )}

                        <button
                          type="submit"
                          disabled={submittingPost || !groupPostText.trim()}
                          className="h-8 px-4 bg-[#1877F2] hover:bg-[#1565C0] text-xs font-bold text-white rounded-lg flex items-center space-x-1 shadow transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{submittingPost ? "Posting..." : "Post"}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-950/20 px-4 py-3 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <span>Please Join this Group to publish posts or comments inside this feed channel.</span>
                  </div>
                )}

                {/* Posts mapping */}
                <div className="space-y-4">
                  {selectedGroupPosts.length === 0 ? (
                    <div className="bg-white dark:bg-[#242526] p-8 text-center rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm text-xs text-neutral-400">
                      No posts uploaded inside this group yet. Write the pioneer message!
                    </div>
                  ) : (
                    selectedGroupPosts.map((post) => <PostCard key={post.postId} post={post} />)
                  )}
                </div>
              </div>

              {/* Sidebar member lists */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <div className="flex items-center space-x-2 font-bold text-xs text-neutral-400 uppercase tracking-wider mb-3 pb-1 border-b border-neutral-100 dark:border-neutral-800">
                    <Info className="w-4 h-4 text-neutral-400" />
                    <span>Guidelines</span>
                  </div>
                  <ul className="text-xs text-neutral-600 dark:text-[#B0B3B8] space-y-2 list-disc pl-4 leading-relaxed">
                    <li>Treat every community user with professional courtesy.</li>
                    <li>Ensure photos and text focus closely on the group's intent.</li>
                    <li>Spam or commercial advertisements are restricted.</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
