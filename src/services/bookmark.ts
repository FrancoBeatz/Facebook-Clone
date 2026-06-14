import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase/config";
import { Bookmark } from "../types";

export const BookmarkService = {
  async savePost(userId: string, postId: string): Promise<void> {
    const bookmarkId = `${userId}_${postId}`;
    const path = `bookmarks/${bookmarkId}`;
    try {
      const newBookmark: Bookmark = {
        id: bookmarkId,
        userId,
        postId,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "bookmarks", bookmarkId), newBookmark);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  async unsavePost(userId: string, postId: string): Promise<void> {
    const bookmarkId = `${userId}_${postId}`;
    const path = `bookmarks/${bookmarkId}`;
    try {
      await deleteDoc(doc(db, "bookmarks", bookmarkId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  listenToUserBookmarks(userId: string, callback: (bookmarks: Bookmark[]) => void) {
    const path = "bookmarks";
    const q = query(collection(db, "bookmarks"), where("userId", "==", userId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Bookmark[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Bookmark);
        });
        callback(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  }
};
