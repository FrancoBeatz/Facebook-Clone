import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ThumbsUp, MessageSquare, Trash2, Send, CornerDownRight, Bookmark, Flag, Share2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { PostService } from "../services/post";
import { BookmarkService } from "../services/bookmark";
import { AdminService } from "../services/admin";
import { NotificationService } from "../services/notification";
import { Post, Comment } from "../types";

const REACTION_MAP: Record<string, { emoji: string; label: string; color: string }> = {
  like: { emoji: "👍", label: "Like", color: "text-[#1877F2] font-semibold" },
  love: { emoji: "❤️", label: "Love", color: "text-rose-500 font-bold" },
  care: { emoji: "🥰", label: "Care", color: "text-amber-500 font-bold" },
  haha: { emoji: "😆", label: "Haha", color: "text-amber-500 font-semibold" },
  wow: { emoji: "😮", label: "Wow", color: "text-amber-500 font-semibold" },
};

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { userProfile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null); // commentId we are replying to
  const [replyText, setReplyText] = useState("");

  const [isSaved, setIsSaved] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const [sharedCopied, setSharedCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Active Real-Time Reaction tracker
  const activeReactionKey = userProfile && post.reactions
    ? Object.keys(post.reactions).find((k) => post.reactions![k]?.includes(userProfile.uid))
    : null;

  const isLiked = userProfile && post.likes ? post.likes.includes(userProfile.uid) : false;

  // Facebook Reactions panel activation state
  const [showReactionPanel, setShowReactionPanel] = useState(false);
  const panelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (panelTimeoutRef.current) clearTimeout(panelTimeoutRef.current);
    };
  }, []);

  // Handle bookmark tracking
  useEffect(() => {
    if (!userProfile) return;
    const unsub = BookmarkService.listenToUserBookmarks(userProfile.uid, (list) => {
      setIsSaved(list.some((b) => b.postId === post.postId));
    });
    return unsub;
  }, [post.postId, userProfile]);

  // Subscribe to comments
  useEffect(() => {
    if (!showComments) return;
    const unsub = PostService.listenToComments(post.postId, (list) => {
      setComments(list);
    });
    return unsub;
  }, [post.postId, showComments]);

  const handleLikeToggle = async () => {
    if (!userProfile) return;
    try {
      if (activeReactionKey) {
        await PostService.reactToPost(post.postId, userProfile.uid, "");
      } else {
        await PostService.reactToPost(post.postId, userProfile.uid, "like");
        await NotificationService.createNotification(
          "like",
          post.authorId,
          userProfile.uid,
          userProfile.fullName,
          userProfile.profilePicture || "",
          post.postId
        );
      }
    } catch (err) {
      console.error("Failed standard like toggler action:", err);
    }
  };

  const handleSharePost = async () => {
    const postUrl = `${window.location.origin}/post/${post.postId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${post.authorName}`,
          text: post.content,
          url: postUrl,
        });
      } else {
        await navigator.clipboard.writeText(postUrl);
        setSharedCopied(true);
        setTimeout(() => setSharedCopied(false), 2000);
      }
    } catch (err) {
      try {
        await navigator.clipboard.writeText(postUrl);
        setSharedCopied(true);
        setTimeout(() => setSharedCopied(false), 2000);
      } catch (err2) {
        console.error("Clipboard copy failed:", err2);
      }
    }
  };

  const handleConfirmedDelete = async () => {
    setDeleting(true);
    try {
      await PostService.deletePost(post.postId);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Failed to delete post:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !userProfile) return;

    const textToSubmit = newCommentText;
    setNewCommentText("");

    try {
      await PostService.addComment(
        post.postId,
        userProfile.uid,
        userProfile.fullName,
        userProfile.profilePicture || "",
        textToSubmit
      );

      // Dispatch Notification
      await NotificationService.createNotification(
        "comment",
        post.authorId,
        userProfile.uid,
        userProfile.fullName,
        userProfile.profilePicture || "",
        post.postId
      );
    } catch (err) {
      console.error("Failed standard comment dispatch:", err);
    }
  };

  const handleAddReply = async (commentId: string, parentUsername: string) => {
    if (!replyText.trim() || !userProfile) return;

    const formattedText = `@${parentUsername} ${replyText}`;
    setReplyText("");
    setReplyTo(null);

    try {
      await PostService.addComment(
        post.postId,
        userProfile.uid,
        userProfile.fullName,
        userProfile.profilePicture || "",
        formattedText
      );

      // Notify original post owner
      await NotificationService.createNotification(
        "comment",
        post.authorId,
        userProfile.uid,
        userProfile.fullName,
        userProfile.profilePicture || "",
        post.postId
      );
    } catch (err) {
      console.error("Failed comments nested reply execution:", err);
    }
  };

  const handleDeletePost = () => {
    setShowDeleteConfirm(true);
  };

  const handleSaveToggle = async () => {
    if (!userProfile) return;
    try {
      if (isSaved) {
        await BookmarkService.unsavePost(userProfile.uid, post.postId);
      } else {
        await BookmarkService.savePost(userProfile.uid, post.postId);
      }
    } catch (e) {
      console.error("Failed bookmark state swap:", e);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !reportReason.trim()) return;

    try {
      await AdminService.reportContent(
        userProfile.uid,
        userProfile.fullName,
        post.postId,
        post.content,
        reportReason.trim()
      );
      setReportReason("");
      setShowReportForm(false);
      alert("This post has been reported to administrators for review. Thank you!");
    } catch (err) {
      console.error("Failed moderation flag dispatch:", err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      try {
        await PostService.deleteComment(post.postId, commentId);
      } catch (err) {
        console.error("Failed comment delete request:", err);
      }
    }
  };

  // Process comments finding replies: we treat any comment starting with "@" as a indented thread reply.
  const flatComments = comments.map(c => {
    const isReply = c.text.trim().startsWith("@");
    return { ...c, isReply };
  });

  return (
    <article className="w-full bg-[#fafeff] dark:bg-[#242526] rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-fade-in flex flex-col">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <Link to={`/profile/${post.authorId}`} className="flex items-center space-x-3 group">
          {post.authorAvatar ? (
            <img
              src={post.authorAvatar}
              alt={post.authorName}
              className="w-10 h-10 rounded-full object-cover group-hover:brightness-95 transition shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-600 dark:text-[#E4E6EB] shrink-0">
              {post.authorName[0].toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-sans font-bold text-neutral-900 dark:text-[#E4E6EB] text-sm group-hover:underline leading-snug">
              {post.authorName}
              {post.groupName && (
                <span className="text-xs text-neutral-500 font-normal">
                  {" "}
                  posted in <strong className="hover:underline text-[#1877F2]/90">{post.groupName}</strong>
                </span>
              )}
              {post.pageName && !post.authorIsPage && (
                <span className="text-xs text-neutral-500 font-normal">
                  {" "}
                  shared on <strong className="hover:underline text-indigo-500">{post.pageName}</strong>
                </span>
              )}
            </div>
            <div className="text-[11px] text-neutral-400 dark:text-[#B0B3B8] font-sans">
              {new Date(post.createdAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </Link>

        {/* Post Controls Header Section */}
        <div className="flex items-center space-x-1">
          {/* Bookmark Trigger */}
          {userProfile && (
            <button
              onClick={handleSaveToggle}
              className={`p-2 rounded-full transition ${
                isSaved
                  ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/10"
                  : "text-neutral-400 hover:text-amber-500 hover:bg-neutral-100 dark:hover:bg-[#3A3B3C]"
              }`}
              title={isSaved ? "Unsave Post" : "Save Post"}
            >
              <Bookmark className={`w-4.5 h-4.5 ${isSaved ? "fill-amber-500" : ""}`} />
            </button>
          )}

          {/* Flag Report Trigger */}
          {userProfile && post.authorId !== userProfile.uid && (
            <button
              onClick={() => setShowReportForm(!showReportForm)}
              className={`p-2 rounded-full transition ${
                showReportForm
                  ? "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/10"
                  : "text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-[#3A3B3C]"
              }`}
              title="Report Post Content"
            >
              <Flag className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Delete Post Trigger if current user is owner */}
          {userProfile && post.authorId === userProfile.uid && (
            <button
              onClick={handleDeletePost}
              className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] rounded-full transition"
              title="Delete Post"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Report Content Form */}
      {showReportForm && (
        <div className="mx-4 my-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl text-xs space-y-2 animate-slide-up">
          <p className="font-bold text-rose-800 dark:text-rose-200">Flag this content for moderation</p>
          <form onSubmit={handleReportSubmit} className="space-y-2">
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full h-8 px-2 bg-white dark:bg-[#3A3B3C] border border-neutral-300 dark:border-neutral-700 rounded-lg text-[11px]"
              required
            >
              <option value="">Select reason...</option>
              <option value="Spam or Unsolicited ad">Spam or Unsolicited ad</option>
              <option value="Hate Speech or Harassment">Hate Speech or Harassment</option>
              <option value="Nudity or Sensitive material">Nudity or Sensitive material</option>
              <option value="Misinformation / Fake news">Misinformation / Fake news</option>
              <option value="Violence / Self-harm">Violence / Self-harm</option>
            </select>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowReportForm(false)}
                className="px-2.5 py-1 border border-neutral-300 dark:border-neutral-700 rounded-lg text-[10px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reportReason}
                className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg text-[10px]"
              >
                Submit Flag
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-neutral-900 dark:text-[#E4E6EB] text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans">
          {post.content}
        </p>
      </div>

      {/* Post Images */}
      {post.images && post.images.length > 0 && (
        <div
          className={`grid gap-1 px-1 bg-neutral-100 dark:bg-[#18191A] border-y border-neutral-100 dark:border-neutral-900 ${
            post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {post.images.map((imgUrl, i) => (
            <a
              key={i}
              href={imgUrl}
              target="_blank"
              rel="noreferrer"
              className="flex justify-center items-center max-h-96 overflow-hidden hover:brightness-95 transition"
            >
              <img
                src={imgUrl}
                alt="Post Media attachment"
                className="w-full h-full object-cover max-h-96"
                referrerPolicy="no-referrer"
              />
            </a>
          ))}
        </div>
      )}

      {/* Post Metrics Stats */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-100 dark:border-[#3A3B3C] text-xs text-neutral-400 dark:text-[#B0B3B8]">
        <div className="flex items-center space-x-1.5">
          {/* Reaction icons stack summary */}
          <div className="flex items-center -space-x-1">
            {post.reactions && Object.keys(post.reactions).map((key) => {
              const count = post.reactions![key]?.length || 0;
              if (count === 0) return null;
              const emoji = REACTION_MAP[key]?.emoji || "👍";
              return (
                <span key={key} className="text-xs select-none filter drop-shadow-sm brightness-110" title={`${key}: ${count}`}>
                  {emoji}
                </span>
              );
            })}
            {(!post.reactions || Object.values(post.reactions).every((arr: any) => Array.isArray(arr) && arr.length === 0)) && (post.likes?.length || 0) > 0 && (
              <span className="text-xs select-none">👍</span>
            )}
          </div>
          <span className="font-sans">
            {post.likes ? post.likes.length : 0} {post.likes?.length === 1 ? "reaction" : "reactions"}
          </span>
        </div>

        <button onClick={() => setShowComments(!showComments)} className="font-sans hover:underline">
          {post.commentsCount || 0} {post.commentsCount === 1 ? "comment" : "comments"}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between px-2 py-1.5 border-b border-neutral-100 dark:border-[#3A3B3C]">
        <div 
          className="flex-1 relative"
          onMouseEnter={() => {
            if (panelTimeoutRef.current) clearTimeout(panelTimeoutRef.current);
            setShowReactionPanel(true);
          }}
          onMouseLeave={() => {
            panelTimeoutRef.current = setTimeout(() => {
              setShowReactionPanel(false);
            }, 800);
          }}
        >
          {/* Reaction Floating Panel with smooth spring and bounce effects */}
          <AnimatePresence>
            {showReactionPanel && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-[#242526] px-2.5 py-1.5 rounded-full shadow-xl border border-neutral-200 dark:border-neutral-800 flex items-center space-x-2.5 z-40"
              >
                {Object.entries(REACTION_MAP).map(([key, react], idx) => (
                  <motion.button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (userProfile) {
                        PostService.reactToPost(post.postId, userProfile.uid, activeReactionKey === key ? "" : key);
                      }
                      setShowReactionPanel(false);
                    }}
                    whileHover={{ 
                      scale: 1.45, 
                      y: -12,
                      rotate: [0, -10, 10, 0],
                      transition: { type: "spring", stiffness: 400, damping: 10 }
                    }}
                    whileTap={{ scale: 0.8, rotate: 10 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { delay: idx * 0.03 } 
                    }}
                    className="flex flex-col items-center justify-center cursor-pointer relative group/item"
                  >
                    <span className="text-2.5xl md:text-3xl select-none filter drop-shadow-sm leading-none">{react.emoji}</span>
                    <span className="absolute -top-7 bg-neutral-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/item:opacity-100 transition pointer-events-none capitalize">
                      {react.label}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            onClick={() => {
              if (!userProfile) return;
              if (activeReactionKey) {
                PostService.reactToPost(post.postId, userProfile.uid, "");
              } else {
                PostService.reactToPost(post.postId, userProfile.uid, "like");
              }
            }}
            whileTap={{ scale: 0.9 }}
            className={`w-full py-2 flex items-center justify-center space-x-2 text-sm rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] transition cursor-pointer ${
              activeReactionKey
                ? REACTION_MAP[activeReactionKey]?.color
                : isLiked
                ? "text-[#1877F2] font-semibold"
                : "text-neutral-500 dark:text-[#B0B3B8]"
            }`}
          >
            {activeReactionKey ? (
              <motion.span 
                key={activeReactionKey}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 12 }}
                className="text-base select-none leading-none flex items-center"
              >
                {REACTION_MAP[activeReactionKey]?.emoji}
              </motion.span>
            ) : isLiked ? (
              <motion.span 
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                className="text-base select-none leading-none flex items-center"
              >
                👍
              </motion.span>
            ) : (
              <ThumbsUp className="w-4.5 h-4.5" />
            )}
            <span className="capitalize">
              {activeReactionKey ? REACTION_MAP[activeReactionKey]?.label : "Like"}
            </span>
          </motion.button>
        </div>

        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex-1 py-2 flex items-center justify-center space-x-2 text-sm rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] transition ${
            showComments ? "text-neutral-900 dark:text-white font-semibold" : "text-neutral-500 dark:text-[#B0B3B8]"
          }`}
        >
          <MessageSquare className="w-4.5 h-4.5" />
          <span>Comment</span>
        </button>

        <button
          onClick={handleSharePost}
          className={`flex-1 py-2 flex items-center justify-center space-x-2 text-sm rounded-xl transition ${
            sharedCopied 
              ? "text-emerald-500 font-bold bg-emerald-500/10 dark:bg-emerald-950/15" 
              : "text-neutral-500 dark:text-[#B0B3B8] hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] hover:text-emerald-500"
          }`}
          title="Generate sharing web link"
        >
          <Share2 className="w-4.5 h-4.5" />
          <span>{sharedCopied ? "Copied!" : "Share"}</span>
        </button>
      </div>

      {/* Comments Drawer / listing */}
      {showComments && (
        <div className="bg-neutral-50 dark:bg-[#1C1D1E] px-4 py-3 space-y-4 flex-1">
          {/* Post New Comment */}
          <form onSubmit={handleAddComment} className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-700 overflow-hidden shrink-0">
              {userProfile?.profilePicture ? (
                <img
                  src={userProfile.profilePicture}
                  alt={userProfile.fullName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-white bg-[#1877F2]">
                  {userProfile?.fullName[0] || "U"}
                </div>
              )}
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full h-9 pl-3 pr-10 bg-neutral-100 dark:bg-[#3A3B3C] rounded-full text-sm text-neutral-950 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="absolute right-2 top-1.5 p-1 text-[#1877F2] disabled:opacity-50 transition"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </div>
          </form>

          {/* Comments List */}
          {comments.length === 0 ? (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4">
              Be the first to comment on this post
            </p>
          ) : (
            <div className="space-y-3.5 max-h-80 overflow-y-auto">
              {flatComments.map((comment) => (
                <div key={comment.commentId} className={`flex flex-col ${comment.isReply ? "ml-8" : ""}`}>
                  
                  {/* Comment Details */}
                  <div className="flex items-start space-x-2.5">
                    {comment.isReply && (
                      <CornerDownRight className="w-4 h-4 text-neutral-400 mt-1 shrink-0" />
                    )}

                    <Link to={`/profile/${comment.userId}`} className="shrink-0">
                      {comment.profileImage ? (
                        <img
                          src={comment.profileImage}
                          alt={comment.username}
                          className="w-7.5 h-7.5 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-7.5 h-7.5 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-600 dark:text-white">
                          C
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="bg-neutral-100 dark:bg-[#3A3B3C] rounded-2xl px-3.5 py-1.5 leading-snug">
                        <Link
                          to={`/profile/${comment.userId}`}
                          className="font-bold text-xs text-neutral-900 dark:text-[#E4E6EB] hover:underline"
                        >
                          {comment.username}
                        </Link>
                        <p className="text-sm text-neutral-800 dark:text-neutral-100 mt-0.5 break-words whitespace-pre-wrap">
                          {comment.text}
                        </p>
                      </div>

                      {/* Comment Actions (Reply / Delete) */}
                      <div className="flex items-center space-x-3.5 mt-1 ml-1 text-[11px] text-[#B0B3B8] font-sans">
                        <span>
                          {new Date(comment.createdAt).toLocaleDateString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        
                        {!comment.isReply && (
                          <button
                            onClick={() => setReplyTo(comment.commentId)}
                            className="hover:underline font-bold text-neutral-500 dark:text-[#B0B3B8]"
                          >
                            Reply
                          </button>
                        )}

                        {userProfile && (comment.userId === userProfile.uid || post.authorId === userProfile.uid) && (
                          <button
                            onClick={() => handleDeleteComment(comment.commentId)}
                            className="hover:text-red-500 hover:underline text-neutral-400"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* REPLY ELEMENT */}
                  {replyTo === comment.commentId && (
                    <div className="ml-8 mt-2.5 flex items-start space-x-2 animate-fade-in bg-white dark:bg-[#242526] p-2 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <input
                        type="text"
                        placeholder={`Reply to ${comment.username}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 h-8 bg-neutral-100 dark:bg-[#3A3B3C] rounded-full px-3 text-xs text-neutral-950 dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddReply(comment.commentId, comment.username)}
                        disabled={!replyText.trim()}
                        className="h-8 shadow bg-[#1877F2] text-white text-xs px-3 rounded-full hover:bg-[#1565C0] font-bold"
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => setReplyTo(null)}
                        className="h-8 border border-neutral-300 dark:border-neutral-700 text-neutral-500 text-xs px-3.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Absolute Overlay custom alert confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="bg-white dark:bg-[#1C1D1E] rounded-2xl p-6 max-w-sm w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center space-x-3 text-red-500">
                <AlertTriangle className="w-6 h-6 animate-pulse shrink-0" />
                <h3 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100">Delete Post?</h3>
              </div>
              <p className="text-xs text-neutral-500 dark:text-[#B0B3B8] leading-relaxed">
                This action is irreversible. This post's content, media items, comment threads, and reaction counts will be permanently removed.
              </p>
              <div className="flex justify-end space-x-2 pt-1.5">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3.5 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-[11px] font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmedDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-[11px] shadow-sm transition disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
};
