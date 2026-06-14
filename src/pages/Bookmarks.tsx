import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { BookmarkService } from "../services/bookmark";
import { PostService } from "../services/post";
import { PostCard } from "../components/PostCard";
import { Bookmark, Post } from "../types";
import { Bookmark as BookmarkIcon, Tag, FolderOpen, Trash2, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Bookmarks: React.FC = () => {
  const { userProfile } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // New Collection Organizer state
  const [collections, setCollections] = useState<string[]>(["All", "Favorites", "Read Later", "Work", "Personal"]);
  const [selectedCollection, setSelectedCollection] = useState("All");
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  // Map bookmark to collection details. Let's use localStorage to persist bookmark category mappings.
  // bookmarkMapping: Record<bookmarkId, collectionName>
  const [bookmarkMap, setBookmarkMap] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load local collections & mappings
    const savedColls = localStorage.getItem("bookmarks_collections");
    if (savedColls) {
      try {
        setCollections(JSON.parse(savedColls));
      } catch (e) {}
    }
    const savedMap = localStorage.getItem("bookmarks_collections_map");
    if (savedMap) {
      try {
        setBookmarkMap(JSON.parse(savedMap));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!userProfile) return;

    // Listen to live bookmarks from firestore
    const unsubscribe = BookmarkService.listenToUserBookmarks(userProfile.uid, (list) => {
      setBookmarks(list);

      // Fetch corresponding live posts
      if (list.length === 0) {
        setPosts([]);
        setLoading(false);
      } else {
        // Load posts for all bookmarks
        PostService.listenToFeed((allFeedPosts) => {
          const matchedPosts = allFeedPosts.filter((p) =>
            list.some((b) => b.postId === p.postId)
          );
          setPosts(matchedPosts);
          setLoading(false);
        });
      }
    });

    return unsubscribe;
  }, [userProfile]);

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    const cleanName = newCollectionName.trim();
    if (!collections.includes(cleanName)) {
      const updated = [...collections, cleanName];
      setCollections(updated);
      localStorage.setItem("bookmarks_collections", JSON.stringify(updated));
    }
    setNewCollectionName("");
    setShowAddCollection(false);
  };

  const assignCollection = (bookmarkId: string, collName: string) => {
    const updated = { ...bookmarkMap, [bookmarkId]: collName };
    setBookmarkMap(updated);
    localStorage.setItem("bookmarks_collections_map", JSON.stringify(updated));
  };

  const handleUnsave = async (postId: string) => {
    if (!userProfile) return;
    try {
      await BookmarkService.unsavePost(userProfile.uid, postId);
    } catch (err) {
      console.error("Failed to remove saved post:", err);
    }
  };

  // Filter posts based on selectedCollection criteria
  const displayedPosts = posts.filter((post) => {
    if (selectedCollection === "All") return true;
    const bId = `${userProfile?.uid}_${post.postId}`;
    const assigned = bookmarkMap[bId] || "Favorites"; // Default fallback
    return assigned === selectedCollection;
  });

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-2 sm:px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar Collections Organizer */}
      <div className="md:col-span-1 space-y-4">
        <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center space-x-2 font-bold text-neutral-900 dark:text-neutral-100 mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <FolderOpen className="w-5 h-5 text-amber-500" />
            <span className="text-sm">Collections</span>
          </div>

          <div className="space-y-1">
            {collections.map((coll) => (
              <button
                key={coll}
                onClick={() => setSelectedCollection(coll)}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition ${
                  selectedCollection === coll
                    ? "bg-[#1877F2]/10 text-[#1877F2] dark:bg-[#1877F2]/15"
                    : "text-neutral-700 dark:text-[#B0B3B8] hover:bg-neutral-50 dark:hover:bg-[#3A3B3C]"
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <Tag className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{coll}</span>
                </div>
                <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full text-neutral-500">
                  {coll === "All"
                    ? posts.length
                    : posts.filter((p) => (bookmarkMap[`${userProfile?.uid}_${p.postId}`] || "Favorites") === coll).length}
                </span>
              </button>
            ))}
          </div>

          {!showAddCollection ? (
            <button
              onClick={() => setShowAddCollection(true)}
              className="mt-4 w-full flex items-center justify-center space-x-1.5 py-1.5 border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-[#1877F2] hover:text-[#1877F2] text-xs font-bold text-neutral-500 dark:text-[#B0B3B8] rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Collection</span>
            </button>
          ) : (
            <form onSubmit={handleCreateCollection} className="mt-3 space-y-2">
              <input
                type="text"
                required
                maxLength={20}
                placeholder="Collection name..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="w-full h-8 px-2.5 bg-neutral-50 dark:bg-[#3A3B3C] border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs"
              />
              <div className="flex space-x-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddCollection(false)}
                  className="px-2.5 py-1 text-[10px] border border-neutral-300 dark:border-neutral-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-[#1877F2] text-white text-[10px] font-bold rounded-lg"
                >
                  Create
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Bookmarked posts view */}
      <div className="md:col-span-3 space-y-5">
        <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-100 flex items-center space-x-2">
              <BookmarkIcon className="w-5.5 h-5.5 text-amber-500 fill-amber-500" />
              <span>Saved Posts Directory</span>
            </h1>
            <p className="text-xs text-neutral-500 dark:text-[#B0B3B8] mt-0.5">
              Refining category: <strong className="text-[#1877F2]">{selectedCollection}</strong>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 font-sans font-bold animate-pulse text-neutral-400">
            Scanning saved database items...
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="bg-white dark:bg-[#242526] p-10 text-center rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1">
              No saved posts found in {selectedCollection}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-[#B0B3B8]">
              You can save posts directly in your explore newsfeed or match category shortcuts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedPosts.map((post) => {
              const bRef = bookmarks.find((b) => b.postId === post.postId);
              const bId = bRef?.id || `${userProfile?.uid}_${post.postId}`;
              const activeColl = bookmarkMap[bId] || "Favorites";

              return (
                <div key={post.postId} className="group relative">
                  {/* Dynamic Collection selector bar for Saved Posts */}
                  <div className="bg-neutral-200/50 dark:bg-[#3A3B3C]/40 px-4 py-2 text-xs flex items-center justify-between rounded-t-xl border-t border-l border-r border-neutral-200 dark:border-neutral-800 -mb-2 z-10 relative">
                    <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                      Saved in: <strong className="text-[#1877F2]">{activeColl}</strong>
                    </span>

                    <div className="flex items-center space-x-2">
                      <select
                        value={activeColl}
                        onChange={(e) => assignCollection(bId, e.target.value)}
                        className="bg-white dark:bg-[#242526] border border-neutral-300 dark:border-neutral-700 rounded-lg text-[11px] px-2 py-0.5"
                      >
                        {collections.filter(c => c !== "All").map((c) => (
                          <option key={c} value={c}>
                            Move to {c}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleUnsave(post.postId)}
                        className="text-neutral-400 hover:text-red-500 p-1 rounded-full hover:bg-neutral-50 dark:hover:bg-[#3A3B3C]"
                        title="Unsave Post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <PostCard post={post} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
