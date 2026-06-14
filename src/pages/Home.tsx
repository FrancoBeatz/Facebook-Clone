import React, { useState, useEffect } from "react";
import { CreatePostBox } from "../components/CreatePostBox";
import { PostCard } from "../components/PostCard";
import { PostSkeleton } from "../components/Skeleton";
import { PostService } from "../services/post";
import { Post } from "../types";

export const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to live newsfeed posts
    const unsubscribe = PostService.listenToFeed(
      (list) => {
        setPosts(list);
        setLoading(false);
      },
      (err) => {
        console.error("News feed load issue:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return (
    <div className="space-y-5 flex-1 max-w-2xl mx-auto w-full px-2 sm:px-4 py-4">
      {/* Story Reels standard spacing margin header can go here if needed,
          but let's focus on a highly-optimized clean feed publisher */}
      <CreatePostBox />

      {/* Posts Section */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white dark:bg-[#242526] rounded-xl p-8 text-center border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h3 className="text-base font-bold text-neutral-800 dark:text-[#E4E6EB] mb-1">
              Your Feed is Clean!
            </h3>
            <p className="text-sm text-neutral-500 dark:text-[#B0B3B8]">
              Publish your very first post above or connect with people in the sidebar suggestions!
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.postId} post={post} />
          ))
        )}
      </div>
    </div>
  );
};
