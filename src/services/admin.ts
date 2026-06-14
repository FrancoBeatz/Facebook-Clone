import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase/config";
import { Report } from "../types";
import { PostService } from "./post";

export const AdminService = {
  async reportContent(
    reporterId: string,
    reporterName: string,
    postId: string,
    postContent: string,
    reason: string
  ): Promise<void> {
    const reportRef = doc(collection(db, "reports"));
    const path = `reports/${reportRef.id}`;
    try {
      const newReport: Report = {
        id: reportRef.id,
        reporterId,
        reporterName,
        postId,
        postContent,
        reason,
        createdAt: new Date().toISOString(),
        status: "pending",
      };
      await setDoc(reportRef, newReport);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  listenToReports(callback: (reports: Report[]) => void) {
    const path = "reports";
    const q = query(collection(db, "reports"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Report[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Report);
        });
        // client-side sort
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async resolveReport(reportId: string): Promise<void> {
    const path = `reports/${reportId}`;
    try {
      await updateDoc(doc(db, "reports", reportId), {
        status: "resolved",
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async suspendUser(userId: string): Promise<void> {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, "users", userId), {
        suspended: true,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async unsuspendUser(userId: string): Promise<void> {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, "users", userId), {
        suspended: false,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async deletePost(postId: string): Promise<void> {
    return PostService.deletePost(postId);
  }
};
