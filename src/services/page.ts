import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase/config";
import { BusinessPage } from "../types";

export const PageService = {
  async createPage(name: string, description: string, category: string, ownerId: string): Promise<string> {
    const pageRef = doc(collection(db, "pages"));
    const path = `pages/${pageRef.id}`;
    try {
      const newPage: BusinessPage = {
        id: pageRef.id,
        name,
        description,
        category,
        ownerId,
        followers: [ownerId],
        createdAt: new Date().toISOString(),
      };
      await setDoc(pageRef, newPage);
      return pageRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  async followPage(pageId: string, userId: string): Promise<void> {
    const path = `pages/${pageId}`;
    try {
      const pageRef = doc(db, "pages", pageId);
      await updateDoc(pageRef, {
        followers: arrayUnion(userId),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async unfollowPage(pageId: string, userId: string): Promise<void> {
    const path = `pages/${pageId}`;
    try {
      const pageRef = doc(db, "pages", pageId);
      await updateDoc(pageRef, {
        followers: arrayRemove(userId),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async getPage(pageId: string): Promise<BusinessPage | null> {
    const path = `pages/${pageId}`;
    try {
      const docRef = doc(db, "pages", pageId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as BusinessPage;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async getAllPages(): Promise<BusinessPage[]> {
    const path = "pages";
    try {
      const qSnapshot = await getDocs(collection(db, "pages"));
      const list: BusinessPage[] = [];
      qSnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as BusinessPage);
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  listenToPages(callback: (pages: BusinessPage[]) => void) {
    const path = "pages";
    const q = query(collection(db, "pages"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: BusinessPage[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as BusinessPage);
        });
        callback(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  }
};
