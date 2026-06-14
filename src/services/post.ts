import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDoc,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, handleFirestoreError, OperationType } from "../firebase/config";
import { Post, Comment } from "../types";

export const PostService = {
  async createPost(
    authorId: string,
    authorName: string,
    authorAvatar: string,
    content: string,
    imageFiles: File[] = []
  ): Promise<void> {
    const postRef = doc(collection(db, "posts"));
    const path = `posts/${postRef.id}`;
    try {
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const fileExt = file.name.split(".").pop();
        const randId = Math.random().toString(36).substring(3);
        const storagePath = `posts/${postRef.id}/${randId}_${Date.now()}.${fileExt}`;
        const imageRef = ref(storage, storagePath);
        await uploadBytes(imageRef, file);
        const url = await getDownloadURL(imageRef);
        imageUrls.push(url);
      }

      const newPost: Post = {
        postId: postRef.id,
        authorId,
        authorName,
        authorAvatar,
        content,
        images: imageUrls,
        likes: [],
        commentsCount: 0,
        createdAt: new Date().toISOString(),
      };

      const batch = writeBatch(db);
      batch.set(postRef, newPost);
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  listenToFeed(callback: (posts: Post[]) => void, onError?: (err: Error) => void) {
    const path = "posts";
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const posts: Post[] = [];
        snapshot.forEach((docSnap) => {
          posts.push(docSnap.data() as Post);
        });
        callback(posts);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  listenToUserPosts(userId: string, callback: (posts: Post[]) => void, onError?: (err: Error) => void) {
    const path = "posts";
    const q = query(
      collection(db, "posts"),
      where("authorId", "==", userId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const posts: Post[] = [];
        snapshot.forEach((docSnap) => {
          posts.push(docSnap.data() as Post);
        });
        // Client-side sorting for chronological order
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(posts);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async likePost(postId: string, userId: string): Promise<void> {
    const path = `posts/${postId}`;
    try {
      const docRef = doc(db, "posts", postId);
      await updateDoc(docRef, {
        likes: arrayUnion(userId),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async unlikePost(postId: string, userId: string): Promise<void> {
    const path = `posts/${postId}`;
    try {
      const docRef = doc(db, "posts", postId);
      await updateDoc(docRef, {
        likes: arrayRemove(userId),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async deletePost(postId: string): Promise<void> {
    const path = `posts/${postId}`;
    try {
      const docRef = doc(db, "posts", postId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  async addComment(
    postId: string,
    userId: string,
    username: string,
    profileImage: string,
    text: string
  ): Promise<void> {
    const commentsColPath = `posts/${postId}/comments`;
    const commentDocRef = doc(collection(db, "posts", postId, "comments"));
    const path = `${commentsColPath}/${commentDocRef.id}`;
    
    try {
      const newComment: Comment = {
        commentId: commentDocRef.id,
        userId,
        username,
        profileImage,
        text,
        createdAt: new Date().toISOString(),
      };

      const batch = writeBatch(db);
      batch.set(commentDocRef, newComment);
      batch.update(doc(db, "posts", postId), {
        commentsCount: increment(1),
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  listenToComments(postId: string, callback: (comments: Comment[]) => void, onError?: (err: Error) => void) {
    const path = `posts/${postId}/comments`;
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const comments: Comment[] = [];
        snapshot.forEach((docSnap) => {
          comments.push(docSnap.data() as Comment);
        });
        callback(comments);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async deleteComment(postId: string, commentId: string): Promise<void> {
    const path = `posts/${postId}/comments/${commentId}`;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "posts", postId, "comments", commentId));
      batch.update(doc(db, "posts", postId), {
        commentsCount: increment(-1),
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }
};
