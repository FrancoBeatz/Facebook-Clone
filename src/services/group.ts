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
import { Group } from "../types";

export const GroupService = {
  async createGroup(name: string, description: string, ownerId: string): Promise<string> {
    const groupRef = doc(collection(db, "groups"));
    const path = `groups/${groupRef.id}`;
    try {
      const newGroup: Group = {
        id: groupRef.id,
        name,
        description,
        ownerId,
        members: [ownerId],
        createdAt: new Date().toISOString(),
      };
      await setDoc(groupRef, newGroup);
      return groupRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  async joinGroup(groupId: string, userId: string): Promise<void> {
    const path = `groups/${groupId}`;
    try {
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        members: arrayUnion(userId),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const path = `groups/${groupId}`;
    try {
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        members: arrayRemove(userId),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async getGroup(groupId: string): Promise<Group | null> {
    const path = `groups/${groupId}`;
    try {
      const docRef = doc(db, "groups", groupId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Group;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async getAllGroups(): Promise<Group[]> {
    const path = "groups";
    try {
      const qSnapshot = await getDocs(collection(db, "groups"));
      const list: Group[] = [];
      qSnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Group);
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  listenToGroups(callback: (groups: Group[]) => void) {
    const path = "groups";
    const q = query(collection(db, "groups"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Group[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Group);
        });
        callback(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  }
};
