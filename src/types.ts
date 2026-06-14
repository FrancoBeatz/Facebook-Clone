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
