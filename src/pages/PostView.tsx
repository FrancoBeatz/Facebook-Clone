import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Post } from "../types";
import { PostCard } from "../components/PostCard";
import { PostSkeleton } from "../components/Skeleton";
import { PostService } from "../services/post";

export const PostView: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      setLoading(true);
      try {
        const data = await PostService.getPost(postId);
        setPost(data);
      } catch (err) {
        console.error("Error drawing post detail view:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <Link
        to="/"
        className="inline-flex items-center space-x-2 text-sm font-semibold text-[#1877F2] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to News Feed</span>
      </Link>

      {loading ? (
        <PostSkeleton />
      ) : !post ? (
        <div className="bg-white dark:bg-[#242526] p-8 rounded-xl text-center border border-neutral-200 dark:border-neutral-800 my-6 shadow-sm">
          <h3 className="text-base font-bold text-neutral-800 dark:text-white">Post Not Found</h3>
          <p className="text-sm text-neutral-500">This article might have been deleted by the author.</p>
        </div>
      ) : (
        <PostCard post={post} />
      )}
    </div>
  );
};
