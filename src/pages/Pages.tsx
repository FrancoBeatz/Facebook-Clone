import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { PageService } from "../services/page";
import { PostService } from "../services/post";
import { PostCard } from "../components/PostCard";
import { BusinessPage, Post } from "../types";
import { Award, Plus, FolderHeart, Star, ArrowLeft, Image as ImageIcon, Send, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Pages: React.FC = () => {
  const { userProfile } = useAuth();
  const [pages, setPages] = useState<BusinessPage[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pageName, setPageName] = useState("");
  const [pageDesc, setPageDesc] = useState("");
  const [pageCategory, setPageCategory] = useState("Brand / Product");

  // Selection states
  const [selectedPage, setSelectedPage] = useState<BusinessPage | null>(null);
  const [selectedPagePosts, setSelectedPagePosts] = useState<Post[]>([]);
  const [pagePostText, setPagePostText] = useState("");
  const [pagePostImages, setPagePostImages] = useState<File[]>([]);
  const [submittingPost, setSubmittingPost] = useState(false);

  // Page Post mode: owner can toggle "Post as Page" vs "Post as User Profile"
  const [postAsPage, setPostAsPage] = useState(true);

  const categories = ["Brand / Product", "Local Business", "Public Figure", "Entertainment", "Education / Tech", "Community"];

  // Load Pages
  useEffect(() => {
    const unsub = PageService.listenToPages((list) => {
      setPages(list);
      setLoading(false);

      if (selectedPage) {
        const fresh = list.find((p) => p.id === selectedPage.id);
        if (fresh) setSelectedPage(fresh);
      }
    });
    return unsub;
  }, [selectedPage]);

  // Load active Page posts
  useEffect(() => {
    if (!selectedPage) return;

    const unsubPosts = PostService.listenToFeed((allPosts) => {
      // Find posts where pageId matches this page, or posts composed on this page feed
      const filtered = allPosts.filter((p) => p.pageId === selectedPage.id);
      setSelectedPagePosts(filtered);
    });

    return unsubPosts;
  }, [selectedPage]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !pageName.trim()) return;

    try {
      const pId = await PageService.createPage(
        pageName.trim(),
        pageDesc.trim(),
        pageCategory,
        userProfile.uid
      );
      setPageName("");
      setPageDesc("");
      setShowCreateForm(false);

      // Open detail view
      const freshPage = await PageService.getPage(pId);
      if (freshPage) setSelectedPage(freshPage);
    } catch (e) {
      console.error("Failed to construct business profile page:", e);
    }
  };

  const handleFollowToggle = async (page: BusinessPage) => {
    if (!userProfile) return;
    const isFollowing = page.followers.includes(userProfile.uid);

    try {
      if (isFollowing) {
        await PageService.unfollowPage(page.id, userProfile.uid);
      } else {
        await PageService.followPage(page.id, userProfile.uid);
      }
    } catch (e) {
      console.error("Page follow state change failed:", e);
    }
  };

  const handleAddPageFeedPost = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!userProfile || !selectedPage || !pagePostText.trim()) return;

     setSubmittingPost(true);
     const isOwner = selectedPage.ownerId === userProfile.uid;
     const actualPostAsPage = isOwner && postAsPage;

     try {
       // Setup author identifiers based on toggle status (Post as Page vs Post as private profile)
       const authorUid = actualPostAsPage ? selectedPage.id : userProfile.uid;
       const authorLabel = actualPostAsPage ? selectedPage.name : userProfile.fullName;
       // Mock corporate page default layout fallback
       const authorAvatarUrl = actualPostAsPage 
         ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200" 
         : (userProfile.profilePicture || "");

       await PostService.createPost(
         authorUid,
         authorLabel,
         authorAvatarUrl,
         pagePostText,
         pagePostImages,
         {
           pageId: selectedPage.id,
           pageName: selectedPage.name,
           pageAvatar: authorAvatarUrl,
           authorIsPage: actualPostAsPage,
         }
       );

       setPagePostText("");
       setPagePostImages([]);
     } catch (err) {
       console.error("Failed post addition to Business Page:", err);
     } finally {
       setSubmittingPost(false);
     }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-2 sm:px-4 py-6 space-y-6">
      <AnimatePresence mode="wait">
        {!selectedPage ? (
          /* ALL BUSINESS PAGES VIEW */
          <motion.div
            key="pages-list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header Banner */}
            <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100 flex items-center space-x-2">
                  <Award className="w-6 h-6 text-indigo-500" />
                  <span>Business Pages Directory</span>
                </h1>
                <p className="text-xs text-neutral-500 dark:text-[#B0B3B8] mt-0.5">
                  Discover brands, organizations, and public figure channels. Or launch your own company!
                </p>
              </div>

              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full sm:w-auto h-9 px-4 fill-none bg-[#1877F2] hover:bg-[#1565C0] text-sm text-white font-bold rounded-lg transition flex items-center justify-center space-x-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Create Business Page</span>
              </button>
            </div>

            {/* Creating Page Dialog Modal overlay */}
            {showCreateForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div onClick={() => setShowCreateForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
                <div className="relative w-full max-w-md bg-white dark:bg-[#242526] p-6 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-slide-up">
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Create Business Page Profile</h3>
                  <form onSubmit={handleCreatePage} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-neutral-500 block mb-1">Page / Brand Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Acme Tech Solutions"
                        value={pageName}
                        onChange={(e) => setPageName(e.target.value)}
                        className="w-full h-10 px-3 bg-neutral-50 dark:bg-[#3A3B3C] border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-neutral-500 block mb-1">Category Select</label>
                      <select
                        value={pageCategory}
                        onChange={(e) => setPageCategory(e.target.value)}
                        className="w-full h-10 px-3 bg-neutral-50 dark:bg-[#3A3B3C] border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-neutral-500 block mb-1">Short Description</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="What's this business page about?"
                        value={pageDesc}
                        onChange={(e) => setPageDesc(e.target.value)}
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
                        Launch Page
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* List Pages Cards */}
            {loading ? (
              <div className="text-center py-10 font-sans font-bold animate-pulse text-neutral-400">Loading business directory lists...</div>
            ) : pages.length === 0 ? (
              <div className="bg-white dark:bg-[#242526] p-10 text-center rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <Award className="w-12 h-12 text-indigo-500/10 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1">No Brand Pages Active</h3>
                <p className="text-xs text-neutral-500 dark:text-[#B0B3B8] mb-4">Be the pioneer and construct your company business page!</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-1.5 text-xs bg-[#1877F2] text-white rounded-lg font-bold"
                >
                  Create Corporate Profile Page
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pages.map((p) => {
                  const isFollowing = userProfile ? p.followers.includes(userProfile.uid) : false;
                  return (
                    <div
                      key={p.id}
                      className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white">
                            <FolderHeart className="w-5 h-5" />
                          </div>
                          <div>
                            <button
                              onClick={() => setSelectedPage(p)}
                              className="font-bold text-sm text-neutral-900 dark:text-white hover:underline text-left block leading-tight"
                            >
                              {p.name}
                            </button>
                            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded mt-0.5 inline-block">
                              {p.category}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-[#B0B3B8] mt-2 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 mt-4 pt-3 text-xs">
                        <span className="text-neutral-400">{p.followers.length} followers</span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedPage(p)}
                            className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded font-semibold"
                          >
                            Explore Page
                          </button>
                          <button
                            onClick={() => handleFollowToggle(p)}
                            className={`px-3 py-1 rounded font-bold transition flex items-center space-x-0.5 ${
                              isFollowing ? "bg-emerald-500 text-white" : "bg-[#1877F2] text-white hover:bg-blue-600"
                            }`}
                          >
                            <Star className="w-3 h-3 fill-current shrink-0" />
                            <span>{isFollowing ? "Liked" : "Like Page"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* SELECTED INDIVIDUAL BUSINESS PAGE VIEW */
          <motion.div
            key="page-detail"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Back links */}
            <button
              onClick={() => setSelectedPage(null)}
              className="flex items-center space-x-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-[#1877F2] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-bold">Back to Pages Directory</span>
            </button>

            {/* Cover header card */}
            <div className="bg-white dark:bg-[#242526] rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="h-40 bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-500 relative flex items-center justify-center text-white">
                <Award className="w-16 h-16 opacity-30 animate-pulse" />
              </div>

              <div className="p-6 relative -mt-10 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-3 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
                  <div className="w-24 h-24 rounded-full border-4 border-white dark:border-[#242526] bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold font-mono shadow-md shrink-0 select-none">
                    {selectedPage.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-neutral-900 dark:text-white flex items-center space-x-2">
                      <span>{selectedPage.name}</span>
                      <ShieldCheck className="w-5.5 h-5.5 text-blue-500 fill-blue-500" />
                    </h2>
                    <p className="text-xs text-[#1877F2] font-extrabold mt-0.5">{selectedPage.category}</p>
                    <p className="text-xs text-neutral-400 mt-1">{selectedPage.followers.length} Followers</p>
                  </div>
                </div>

                <button
                  onClick={() => handleFollowToggle(selectedPage)}
                  className={`h-9 px-5 rounded-lg text-xs font-bold shadow transition flex items-center space-x-1 ${
                    selectedPage.followers.includes(userProfile?.uid || "")
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-[#1877F2] text-white hover:bg-blue-600"
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>{selectedPage.followers.includes(userProfile?.uid || "") ? "Liked & Following" : "Like Page"}</span>
                </button>
              </div>

              <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-800/10 text-xs text-neutral-600 dark:text-[#B0B3B8] leading-relaxed">
                <strong>About us: </strong> {selectedPage.description || "Acme professional corporate page channel."}
              </div>
            </div>

            {/* Composition + Post Feed panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                {/* Custom Page publication composer box */}
                {selectedPage.ownerId === userProfile?.uid && (
                  <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                      <span className="text-xs font-bold text-neutral-500">Page Publisher Desk</span>
                      
                      {/* Identity switches: Post as Page vs Post as User */}
                      <button
                        onClick={() => setPostAsPage(!postAsPage)}
                        className="flex items-center space-x-1.5 text-xs text-[#1877F2] font-bold"
                      >
                        {postAsPage ? <ToggleRight className="w-6 h-6 shrink-0 text-indigo-500" /> : <ToggleLeft className="w-6 h-6 shrink-0 text-neutral-400" />}
                        <span>{postAsPage ? "Posting as Page Identity" : "Posting as personal profile"}</span>
                      </button>
                    </div>

                    <form onSubmit={handleAddPageFeedPost} className="space-y-3">
                      <textarea
                        required
                        rows={2}
                        placeholder={postAsPage ? `Post public updates representing ${selectedPage.name}...` : "Publish a standard community review..."}
                        value={pagePostText}
                        onChange={(e) => setPagePostText(e.target.value)}
                        className="w-full p-3 bg-neutral-50 dark:bg-[#3A3B3C] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />

                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-1 text-xs text-neutral-500 dark:text-[#B0B3B8] cursor-pointer hover:text-indigo-500">
                          <ImageIcon className="w-4 h-4 text-pink-500" />
                          <span>Attach Media</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              if (e.target.files) setPagePostImages(Array.from(e.target.files));
                            }}
                            className="hidden"
                          />
                        </label>

                        {pagePostImages.length > 0 && (
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-500 font-semibold py-0.5 px-2 rounded">
                            {pagePostImages.length} loaded
                          </span>
                        )}

                        <button
                          type="submit"
                          disabled={submittingPost || !pagePostText.trim()}
                          className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg flex items-center space-x-1 shadow transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{submittingPost ? "Uploading..." : "Publish Announcement"}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Posts */}
                <div className="space-y-4">
                  {selectedPagePosts.length === 0 ? (
                    <div className="bg-white dark:bg-[#242526] p-10 text-center rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm text-xs text-neutral-400">
                      No announcements posted on this page yet.
                    </div>
                  ) : (
                    selectedPagePosts.map((post) => <PostCard key={post.postId} post={post} />)
                  )}
                </div>
              </div>

              {/* Guidelines or sidebar detail stats */}
              <div className="space-y-4 col-span-1">
                <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 pb-1 border-b border-neutral-100 dark:border-neutral-800">
                    Acme Certified Page
                  </h4>
                  <ul className="text-xs text-neutral-600 dark:text-[#B0B3B8] space-y-2 pl-4 list-disc leading-relaxed">
                    <li>Certified and guaranteed secure corporate channel.</li>
                    <li>Official announcements carry real badge validation.</li>
                    <li>Liked posts appear directly in search metrics.</li>
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
