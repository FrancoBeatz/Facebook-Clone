import { supabase, isSupabaseConfigured, localDb, pubsub } from "../supabase/client";
import { Post, Comment } from "../types";
import { UserService } from "./user";

export const PostService = {
  async getAllPosts(): Promise<Post[]> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("createdAt", { ascending: false });
        if (error) throw error;
        return (data || []) as Post[];
      } else {
        const list = localDb.get<Post[]>("posts", []);
        return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (err) {
      console.error("Error getting public posts:", err);
      return [];
    }
  },

  async getPost(postId: string): Promise<Post | null> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("postId", postId)
          .single();
        if (error) return null;
        return data as Post;
      } else {
        const posts = localDb.get<Post[]>("posts", []);
        return posts.find((p) => p.postId === postId) || null;
      }
    } catch (err) {
      console.error("Error in getPost:", err);
      return null;
    }
  },

  async createPost(
    authorId: string,
    authorName: string,
    authorAvatar: string,
    content: string,
    imageFiles: File[] = [],
    extraParams?: {
      groupId?: string;
      groupName?: string;
      pageId?: string;
      pageName?: string;
      pageAvatar?: string;
      authorIsPage?: boolean;
    }
  ): Promise<void> {
    try {
      const postId = "post_" + Math.random().toString(36).substring(3) + "_" + Date.now();
      const imageUrls: string[] = [];

      // Handle photos conversion
      for (const file of imageFiles) {
        try {
          if (isSupabaseConfigured && supabase) {
            const randId = Math.random().toString(36).substring(3);
            const path = `${postId}/${randId}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from("posts").upload(path, file);
            if (!uploadError) {
              const { data } = supabase.storage.from("posts").getPublicUrl(path);
              imageUrls.push(data.publicUrl);
              continue;
            }
          }
          // Fallback to base64 encoding
          const b64 = await UserService.convertFileToBase64(file);
          imageUrls.push(b64);
        } catch (err) {
          console.warn("Could not encode image file:", err);
        }
      }

      const newPost: Post = {
        postId,
        authorId,
        authorName,
        authorAvatar,
        content,
        images: imageUrls,
        likes: [],
        reactions: {},
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        ...(extraParams || {}),
      };

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("posts").insert(newPost);
        if (error) throw error;
      } else {
        const posts = localDb.get<Post[]>("posts", []);
        posts.unshift(newPost);
        localDb.set("posts", posts);
      }

      // Award XP for activity
      try {
        let actionType = "post_created";
        if (isSupabaseConfigured && supabase) {
          const { count } = await supabase
            .from("posts")
            .select("*", { count: "exact", head: true })
            .eq("authorId", authorId);
          if (count && count <= 1) actionType = "first_post";
        } else {
          const posts = localDb.get<Post[]>("posts", []);
          const authorPosts = posts.filter((p) => p.authorId === authorId);
          if (authorPosts.length <= 1) actionType = "first_post";
        }
        await UserService.awardXP(authorId, 30, actionType);
      } catch (xpErr) {
        console.warn("Failed to award XP:", xpErr);
      }
    } catch (err) {
      console.error("Error creating post:", err);
    }
  },

  listenToFeed(callback: (posts: Post[]) => void, onError?: (err: Error) => void) {
    if (isSupabaseConfigured && supabase) {
      this.getAllPosts().then(callback).catch(onError);

      const channel = supabase
        .channel("public-feed-updates")
        .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, async () => {
          const list = await this.getAllPosts();
          callback(list);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const fetchSorted = () => {
        const posts = localDb.get<Post[]>("posts", []);
        return [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      };
      callback(fetchSorted());
      return pubsub.subscribe("posts", () => {
        callback(fetchSorted());
      });
    }
  },

  listenToUserPosts(userId: string, callback: (posts: Post[]) => void, onError?: (err: Error) => void) {
    const fetchUserPosts = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("authorId", userId)
          .order("createdAt", { ascending: false });
        if (error) throw error;
        return (data || []) as Post[];
      } else {
        const posts = localDb.get<Post[]>("posts", []);
        return posts
          .filter((p) => p.authorId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    };

    fetchUserPosts().then(callback).catch(onError);

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`user-posts-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, async () => {
          const list = await fetchUserPosts();
          callback(list);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      return pubsub.subscribe("posts", async () => {
        const list = await fetchUserPosts();
        callback(list);
      });
    }
  },

  async likePost(postId: string, userId: string): Promise<void> {
    try {
      const current = await this.getPost(postId);
      if (!current) return;

      const currentLikes = current.likes || [];
      if (currentLikes.includes(userId)) return;

      const nextLikes = [...currentLikes, userId];

      if (isSupabaseConfigured && supabase) {
        await supabase.from("posts").update({ likes: nextLikes }).eq("postId", postId);
      } else {
        const posts = localDb.get<Post[]>("posts", []);
        const updated = posts.map((p) => (p.postId === postId ? { ...p, likes: nextLikes } : p));
        localDb.set("posts", updated);
      }
    } catch (err) {
      console.error("Error in liking post:", err);
    }
  },

  async reactToPost(postId: string, userId: string, reactionType: string): Promise<void> {
    try {
      const current = await this.getPost(postId);
      if (!current) return;

      const oldReactions = current.reactions || {};
      const oldLikes = current.likes || [];

      const updatedReactions: Record<string, string[]> = {};
      const keys = ["like", "love", "haha", "wow", "care"];
      keys.forEach((k) => {
        const arr = oldReactions[k] || [];
        updatedReactions[k] = arr.filter((u: string) => u !== userId);
      });

      let nextLikes = [...oldLikes];

      if (reactionType) {
        if (!updatedReactions[reactionType]) {
          updatedReactions[reactionType] = [];
        }
        updatedReactions[reactionType].push(userId);

        if (!nextLikes.includes(userId)) {
          nextLikes.push(userId);
        }
      } else {
        nextLikes = nextLikes.filter((u: string) => u !== userId);
      }

      if (isSupabaseConfigured && supabase) {
        await supabase
          .from("posts")
          .update({ reactions: updatedReactions, likes: nextLikes })
          .eq("postId", postId);
      } else {
        const posts = localDb.get<Post[]>("posts", []);
        const updated = posts.map((p) =>
          p.postId === postId ? { ...p, reactions: updatedReactions, likes: nextLikes } : p
        );
        localDb.set("posts", updated);
      }
    } catch (err) {
      console.error("Error processing reaction:", err);
    }
  },

  async unlikePost(postId: string, userId: string): Promise<void> {
    try {
      const current = await this.getPost(postId);
      if (!current) return;

      const currentLikes = current.likes || [];
      const nextLikes = currentLikes.filter((id) => id !== userId);

      if (isSupabaseConfigured && supabase) {
        await supabase.from("posts").update({ likes: nextLikes }).eq("postId", postId);
      } else {
        const posts = localDb.get<Post[]>("posts", []);
        const updated = posts.map((p) => (p.postId === postId ? { ...p, likes: nextLikes } : p));
        localDb.set("posts", updated);
      }
    } catch (err) {
      console.error("Error in unlikePost:", err);
    }
  },

  async deletePost(postId: string): Promise<void> {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("posts").delete().eq("postId", postId);
      } else {
        const posts = localDb.get<Post[]>("posts", []);
        const nextPosts = posts.filter((p) => p.postId !== postId);
        localDb.set("posts", nextPosts);
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  },

  async addComment(
    postId: string,
    userId: string,
    username: string,
    profileImage: string,
    text: string
  ): Promise<void> {
    try {
      const commentId = "comment_" + Math.random().toString(36).substring(3) + "_" + Date.now();
      const newComment: Comment = {
        commentId,
        userId,
        username,
        profileImage,
        text,
        createdAt: new Date().toISOString(),
      };

      if (isSupabaseConfigured && supabase) {
        // Increment post comments count
        const postObj = await this.getPost(postId);
        const nextCount = (postObj?.commentsCount || 0) + 1;

        // Insert comment and update commentsCount
        await supabase.from("comments").insert({ ...newComment, postId });
        await supabase.from("posts").update({ commentsCount: nextCount }).eq("postId", postId);
      } else {
        const commentsKey = `comments_${postId}`;
        const comments = localDb.get<Comment[]>(commentsKey, []);
        comments.push(newComment);
        localDb.set(commentsKey, comments);

        // Update posts counts
        const posts = localDb.get<Post[]>("posts", []);
        const updatedPosts = posts.map((p) =>
          p.postId === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
        );
        localDb.set("posts", updatedPosts);
      }
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  },

  listenToComments(postId: string, callback: (comments: Comment[]) => void, onError?: (err: Error) => void) {
    const fetchComments = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("comments")
          .select("*")
          .eq("postId", postId)
          .order("createdAt", { ascending: true });
        if (error) throw error;
        return (data || []) as Comment[];
      } else {
        const commentsKey = `comments_${postId}`;
        return localDb.get<Comment[]>(commentsKey, []);
      }
    };

    fetchComments().then(callback).catch(onError);

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`comments-${postId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, async () => {
          const list = await fetchComments();
          callback(list);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      return pubsub.subscribe(`comments_${postId}`, async () => {
        const list = await fetchComments();
        callback(list);
      });
    }
  },

  async deleteComment(postId: string, commentId: string): Promise<void> {
    try {
      if (isSupabaseConfigured && supabase) {
        const postObj = await this.getPost(postId);
        const nextCount = Math.max(0, (postObj?.commentsCount || 1) - 1);

        await supabase.from("comments").delete().eq("commentId", commentId);
        await supabase.from("posts").update({ commentsCount: nextCount }).eq("postId", postId);
      } else {
        const commentsKey = `comments_${postId}`;
        const comments = localDb.get<Comment[]>(commentsKey, []);
        const filtered = comments.filter((c) => c.commentId !== commentId);
        localDb.set(commentsKey, filtered);

        const posts = localDb.get<Post[]>("posts", []);
        const updatedPosts = posts.map((p) =>
          p.postId === postId ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 1) - 1) } : p
        );
        localDb.set("posts", updatedPosts);
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  },
};
