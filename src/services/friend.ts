import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase/config";
import { Relationship, UserProfile } from "../types";

export const FriendService = {
  getRelationshipId(user1: string, user2: string): string {
    return [user1, user2].sort().join("_");
  },

  async sendFriendRequest(fromId: string, toId: string): Promise<void> {
    const relId = this.getRelationshipId(fromId, toId);
    const path = `relationships/${relId}`;
    try {
      const newRequest: Relationship = {
        id: relId,
        fromId,
        toId,
        status: "requested",
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "relationships", relId), newRequest);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  async acceptFriendRequest(relId: string, currentUserId: string): Promise<void> {
    const path = `relationships/${relId}`;
    try {
      // Security rules mandate that only the recipient (toId) can accept standard status change to 'friends'
      // toId is part of existing, we verify toId = currentUserId
      await updateDoc(doc(db, "relationships", relId), {
        status: "friends",
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async rejectFriendRequest(relId: string): Promise<void> {
    const path = `relationships/${relId}`;
    try {
      await deleteDoc(doc(db, "relationships", relId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  async removeFriend(user1: string, user2: string): Promise<void> {
    const relId = this.getRelationshipId(user1, user2);
    const path = `relationships/${relId}`;
    try {
      await deleteDoc(doc(db, "relationships", relId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  listenToRelationships(userId: string, callback: (relationships: Relationship[]) => void) {
    const path = "relationships";
    // We listen to relationships where user is fromId or toId
    // Since firestore doesn't do OR query on separate fields easily without composite indices,
    // we query relationships twice or listen to the full collection (since list is low count)
    // or run queries where fromId == userId or toId == userId.
    // Let's create queries.
    const qFrom = query(collection(db, "relationships"), where("fromId", "==", userId));
    const qTo = query(collection(db, "relationships"), where("toId", "==", userId));

    let fromRels: Relationship[] = [];
    let toRels: Relationship[] = [];

    const handleMerge = () => {
      // Merge with uniqueness
      const map = new Map<string, Relationship>();
      fromRels.forEach(r => map.set(r.id, r));
      toRels.forEach(r => map.set(r.id, r));
      callback(Array.from(map.values()));
    };

    const unsubFrom = onSnapshot(qFrom, (snapshot) => {
      fromRels = [];
      snapshot.forEach(docSnap => fromRels.push(docSnap.data() as Relationship));
      handleMerge();
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });

    const unsubTo = onSnapshot(qTo, (snapshot) => {
      toRels = [];
      snapshot.forEach(docSnap => toRels.push(docSnap.data() as Relationship));
      handleMerge();
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return () => {
      unsubFrom();
      unsubTo();
    };
  },

  getMutualFriends(
    user1Id: string,
    user2Id: string,
    allUsers: UserProfile[],
    relationships: Relationship[]
  ): UserProfile[] {
    // Get list of friends for user 1
    const user1Friends = relationships
      .filter(r => r.status === "friends" && (r.fromId === user1Id || r.toId === user1Id))
      .map(r => r.fromId === user1Id ? r.toId : r.fromId);

    // Get list of friends for user 2
    const user2Friends = relationships
      .filter(r => r.status === "friends" && (r.fromId === user2Id || r.toId === user2Id))
      .map(r => r.fromId === user2Id ? r.toId : r.fromId);

    // Intersection
    const mutualIds = user1Friends.filter(id => user2Friends.includes(id));

    // Map to UserProfiles
    return allUsers.filter(u => mutualIds.includes(u.uid));
  }
};
