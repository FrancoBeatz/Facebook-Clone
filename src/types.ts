export interface UserProfile {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  bio?: string;
  location?: string;
  website?: string;
  profilePicture?: string;
  coverPhoto?: string;
  createdAt: string;
  
  // Custom metrics/fields for Facebook clone features
  work?: string;
  education?: string;
  interests?: string;
  role?: "admin" | "user";
  suspended?: boolean;
  lastActive?: string;
  deviceType?: string;
  loginHistory?: string[]; // array of ISO datetimes
  
  // Custom SaaS-grade social app upgrades
  theme?: string;
  xp?: number;
  level?: string;
  achievements?: string[];
  skills?: string;
  portfolio?: string;
}

export interface Post {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  images?: string[];
  likes: string[]; // List of userUids
  commentsCount: number;
  createdAt: string;

  // Add group & page fields
  groupId?: string;
  groupName?: string;
  pageId?: string;
  pageName?: string;
  pageAvatar?: string;
  authorIsPage?: boolean;
}

export interface Comment {
  commentId: string;
  userId: string;
  username: string;
  profileImage?: string;
  text: string;
  createdAt: string;
}

export interface Message {
  messageId: string;
  senderId: string;
  text: string;
  image?: string;
  reactions?: Record<string, string>; // userId -> emoji
  seenBy?: string[]; // uids of users who have seen this message
  createdAt: string;
}

export interface ChatRoom {
  roomId: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  typing?: Record<string, boolean>; // userId -> isTyping
}

export interface Notification {
  id: string;
  type: "like" | "comment" | "friend_request" | "friend_accept" | "message";
  receiverId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  postId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Relationship {
  id: string;
  fromId: string; // sender of friend request
  toId: string; // receiver of friend request
  status: "requested" | "friends";
  createdAt: string;
}

// FB clone - Groups
export interface Group {
  id: string;
  name: string;
  description: string;
  coverPhoto?: string;
  ownerId: string;
  members: string[]; // list of user uids
  createdAt: string;
}

// FB clone - Business Pages
export interface BusinessPage {
  id: string;
  name: string;
  description: string;
  category: string;
  profilePicture?: string;
  coverPhoto?: string;
  ownerId: string;
  followers: string[]; // list of user uids
  createdAt: string;
}

// FB clone - Saved posts (Bookmarks)
export interface Bookmark {
  id: string; // unique reservation
  userId: string;
  postId: string;
  createdAt: string;
}

// FB clone - Activity tracking & Reports for admin
export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  postId?: string;
  postContent?: string;
  reason: string;
  createdAt: string;
  status: "pending" | "resolved";
}

// FB clone - Story Highlights
export interface Highlight {
  id: string;
  userId: string;
  title: string;
  coverColor: string; // Tailwind bg class like "bg-gradient-to-tr from-pink-500 to-rose-500"
  postIds: string[]; // List of post UIDs in this highlight
  createdAt: string;
}


