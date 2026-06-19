import React, { useState, useEffect } from "react";
import { CreatePostBox } from "../components/CreatePostBox";
import { PostCard } from "../components/PostCard";
import { PostSkeleton } from "../components/Skeleton";
import { PostService } from "../services/post";
import { Post } from "../types";
import { Globe, RefreshCw, Sparkles } from "lucide-react";

export const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingNews, setTrendingNews] = useState<any[]>([]);
  const [fetchingNews, setFetchingNews] = useState(false);

  const fetchTrends = async () => {
    setFetchingNews(true);
    try {
      const res = await fetch("/api/gemini/news-grounding");
      const json = await res.json();
      if (json.news) {
        setTrendingNews(json.news);
      }
    } catch (err) {
      console.warn("Could not load grounded news trends:", err);
    } finally {
      setFetchingNews(false);
    }
  };

  useEffect(() => {
    fetchTrends();

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
      
      {/* Real-Time Google Search Grounding News Widget */}
      <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 dark:from-indigo-900/20 dark:via-[#242526] dark:to-emerald-900/15 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-neutral-800 dark:text-[#E4E6EB]">
            <Globe className="w-4 h-4 text-indigo-500 animate-spin" style={{ animationDuration: "16s" }} />
            <span className="font-extrabold text-xs sm:text-sm tracking-tight flex items-center gap-1.5">
              Live Search Trends
              <span className="text-[9px] font-black bg-indigo-500 text-white rounded px-1.5 py-0.5 uppercase tracking-widest leading-none scale-90">Grounding</span>
            </span>
          </div>
          <button
            onClick={fetchTrends}
            disabled={fetchingNews}
            className="text-[10px] text-neutral-400 hover:text-indigo-500 transition disabled:opacity-50 flex items-center space-x-1 font-bold"
          >
            <RefreshCw className={`w-3 h-3 ${fetchingNews ? "animate-spin" : ""}`} />
            <span>Updates</span>
          </button>
        </div>

        {fetchingNews ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-neutral-200/50 dark:bg-neutral-800/40 h-24 rounded-lg" />
            ))}
          </div>
        ) : trendingNews.length === 0 ? (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 italic text-center py-2">
            Trending search topics refresh on connection. Click updates.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {trendingNews.map((item, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#1E1F20] hover:bg-[#F2F4F7] dark:hover:bg-[#2A2B2D] p-3 rounded-xl border border-neutral-100 dark:border-neutral-850/60 shadow-xs hover:shadow transition duration-200 cursor-pointer flex flex-col justify-between group h-full"
                title="Click to write about this!"
                onClick={() => {
                  const inputEl = document.getElementById("post-textarea") as HTMLTextAreaElement;
                  if (inputEl) {
                    inputEl.value = `Reflecting on today's grounded trend: "${item.title}" - ${item.description} #${item.category.replace(/\s+/g, "")} #GroundedTrends`;
                    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                    inputEl.focus();
                  }
                }}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] bg-indigo-500/10 text-indigo-500 font-extrabold px-1.5 py-0.5 rounded border border-indigo-500/15 uppercase tracking-widest">
                      {item.category}
                    </span>
                    <Sparkles className="w-3 h-3 text-yellow-400 opacity-60 group-hover:opacity-100 transition" />
                  </div>
                  <h5 className="font-extrabold text-[11px] sm:text-[12px] text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-snug group-hover:text-indigo-500 transition">
                    {item.title}
                  </h5>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>
                <div className="text-[8px] text-neutral-400 dark:text-neutral-500 mt-2 font-mono flex items-center justify-between">
                  <span>By: info-mesh</span>
                  <span className="text-[#1877F2]/80 group-hover:underline font-bold">Write Post →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
