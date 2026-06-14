# Security Specification (TDD) for Facebook Clone

## 1. Data Invariants

- **User Profiles**:
  - The document ID inside the `/users` collection must match the user's authenticated `request.auth.uid`.
  - A user cannot modify their `uid` or `email` after registration.
- **Posts**:
  - A post's `authorId` must match `request.auth.uid`. No user can spoof the author of a post.
  - Immutables like `postId`, `authorId`, and `createdAt` cannot be modified during updates.
- **Comments**:
  - A comment's `userId` must equal `request.auth.uid`.
- **Chats**:
  - A user can only access `/chats/{roomId}` and its `/messages` if they are part of the `participants` list of that room.
  - Typing status can only be set for the user's own ID.
- **Notifications**:
  - A notification can only be read, modified (`isRead`), or deleted by its designated `receiverId`.
- **Relationships**:
  - A friend request's `fromId` must match the current user ID, and cannot be spoofed.
  - Only the `toId` user (the recipient of a request) can accept it by changing the status to `'friends'`.

---

## 2. The "Dirty Dozen" Payloads

Here are 12 malicious payloads that our security rules must strictly block:

### Identity Spoofing (Users)
1. **User Spoofing on Create**: Creating a user profile document with random ID `abc` but authenticated as user `xyz`.
2. **PII Isolation Leak on Read**: User `abc` trying to direct-get user `xyz`'s private PII if stored together, or without proper rules.
3. **Immutables Modification**: User `abc` trying to change their registered `email` or `uid` to hijack another user's identity.

### Post Security
4. **Post Author Spoofing**: Path is `/posts/post1`, payload is `{ postId: 'post1', authorId: 'xyz' }` where current auth UID is `abc`.
5. **Admin Access Escalation**: User `abc` trying to set a custom field `isAdmin` to true or modifying custom metadata.
6. **Malicious Likes Array Manipulation**: User `abc` trying to wipe out everyone else's UIDs from the `likes` array or adding multiple fake accounts.

### Relationship / Friend Request Tampering
7. **Self-Approval of Friend Request**: User `abc` sending a request to `xyz`, then executing an update to change `status` to `'friends'` (only the recipient `xyz` can accept).
8. **Friend Request Creator Spoofing**: User `abc` creating a relationship document with `fromId` set to `xyz`.

### Chat / Messenger Privacy Breach
9. **Eavesdropping on Private Chats**: User `abc` attempting to list or read documents in `/chats/room_xyz_pqr` when they are not in the participants list.
10. **Typing Indicator Spoofing**: User `abc` trying to flag that user `xyz` is typing inside room `room_abc_xyz`.

### Notification Modification
11. **Reading Another's Notifications**: User `abc` trying to read notifications meant for user `xyz`.
12. **Tampering with Notification Creators**: User `abc` trying to mark someone else's notification as read or deleting it.

---

## 3. The Test Runner Structure (`firestore.rules.test.ts`)

A test framework structure mapping these assertions using Firebase Emulator rules testing or unit test formats.

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

let testEnv: RulesTestEnvironment;

describe("Facebook Clone Security Rules", () => {
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "plasma-snow-6hnbb",
      firestore: {
        rules: "firestore.rules",
      },
    });
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it("should enforce: Dirty Dozen Payload #1 - Deny creating user document with mismatched ID", async () => {
    const context = testEnv.authenticatedContext("abc");
    const db = context.firestore();
    await assertFails(
      db.doc("users/xyz").set({
        uid: "xyz",
        fullName: "Imposter",
        username: "imposter",
        email: "imposter@gmail.com",
        createdAt: new Date().toISOString(),
      })
    );
  });

  it("should enforce: Dirty Dozen Payload #4 - Deny creating a post with spoofed authorId", async () => {
    const context = testEnv.authenticatedContext("abc");
    const db = context.firestore();
    await assertFails(
      db.doc("posts/post1").set({
        postId: "post1",
        authorId: "xyz",
        authorName: "Fake Author",
        content: "Spoofing content",
        commentsCount: 0,
        createdAt: new Date().toISOString(),
      })
    );
  });
});
```
