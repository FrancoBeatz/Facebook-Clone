import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase/config";
import { Highlight } from "../types";

export const HighlightService = {
  async createHighlight(
    userId: string,
    title: string,
    coverColor: string,
    postIds: string[]
  ): Promise<void> {
    const highlightId = `hi_${userId}_${Date.now()}`;
    const path = `highlights/${highlightId}`;
    try {
      const newHighlight: Highlight = {
        id: highlightId,
        userId,
        title,
        coverColor,
        postIds,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "highlights", highlightId), newHighlight);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  async deleteHighlight(highlightId: string): Promise<void> {
    const path = `highlights/${highlightId}`;
    try {
      await deleteDoc(doc(db, "highlights", highlightId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  listenToUserHighlights(
    userId: string,
    callback: (highlights: Highlight[]) => void
  ) {
    const path = "highlights";
    const q = query(collection(db, "highlights"), where("userId", "==", userId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Highlight[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Highlight);
        });
        // Sort by creation date
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  }
};
