-- Facebook Clone Supabase Database Schema
-- Paste and run this script in your Supabase SQL Editor to initialize all tables and configure policies.

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  "uid" TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "bio" TEXT,
  "location" TEXT,
  "website" TEXT,
  "profilePicture" TEXT,
  "coverPhoto" TEXT,
  "createdAt" TEXT NOT NULL,
  "work" TEXT,
  "education" TEXT,
  "interests" TEXT,
  "role" TEXT DEFAULT 'user',
  "suspended" BOOLEAN DEFAULT false,
  "lastActive" TEXT,
  "deviceType" TEXT,
  "loginHistory" TEXT[] DEFAULT '{}',
  "theme" TEXT,
  "xp" INTEGER DEFAULT 0,
  "level" TEXT DEFAULT 'Beginner',
  "achievements" TEXT[] DEFAULT '{}',
  "skills" TEXT,
  "portfolio" TEXT
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow all actions on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 2. Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
  "postId" TEXT PRIMARY KEY,
  "authorId" TEXT NOT NULL REFERENCES public.users("uid") ON DELETE CASCADE,
  "authorName" TEXT NOT NULL,
  "authorAvatar" TEXT,
  "content" TEXT NOT NULL,
  "images" TEXT[] DEFAULT '{}',
  "likes" TEXT[] DEFAULT '{}',
  "reactions" JSONB DEFAULT '{}'::jsonb,
  "commentsCount" INTEGER DEFAULT 0,
  "createdAt" TEXT NOT NULL,
  "groupId" TEXT,
  "groupName" TEXT,
  "pageId" TEXT,
  "pageName" TEXT,
  "pageAvatar" TEXT,
  "authorIsPage" BOOLEAN DEFAULT false
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Allow all actions on posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);

-- 3. Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
  "commentId" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL REFERENCES public.posts("postId") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES public.users("uid") ON DELETE CASCADE,
  "username" TEXT NOT NULL,
  "profileImage" TEXT,
  "text" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Allow all actions on comments" ON public.comments FOR ALL USING (true) WITH CHECK (true);

-- 4. Relationships Table (Friend Requests and Connections)
CREATE TABLE IF NOT EXISTS public.relationships (
  "id" TEXT PRIMARY KEY,
  "fromId" TEXT NOT NULL REFERENCES public.users("uid") ON DELETE CASCADE,
  "toId" TEXT NOT NULL REFERENCES public.users("uid") ON DELETE CASCADE,
  "status" TEXT NOT NULL, -- 'requested' or 'friends'
  "createdAt" TEXT NOT NULL
);

ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on relationships" ON public.relationships FOR SELECT USING (true);
CREATE POLICY "Allow all actions on relationships" ON public.relationships FOR ALL USING (true) WITH CHECK (true);

-- 5. Chats Table (Rooms)
CREATE TABLE IF NOT EXISTS public.chats (
  "roomId" TEXT PRIMARY KEY,
  "participants" TEXT[] DEFAULT '{}',
  "lastMessage" TEXT,
  "lastMessageAt" TEXT,
  "typing" JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on chats" ON public.chats FOR SELECT USING (true);
CREATE POLICY "Allow all actions on chats" ON public.chats FOR ALL USING (true) WITH CHECK (true);

-- 6. Messages Table (Inside Rooms)
CREATE TABLE IF NOT EXISTS public.messages (
  "messageId" TEXT PRIMARY KEY,
  "roomId" TEXT NOT NULL REFERENCES public.chats("roomId") ON DELETE CASCADE,
  "senderId" TEXT NOT NULL REFERENCES public.users("uid") ON DELETE CASCADE,
  "text" TEXT NOT NULL,
  "image" TEXT,
  "reactions" JSONB DEFAULT '{}'::jsonb,
  "seenBy" TEXT[] DEFAULT '{}',
  "createdAt" TEXT NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Allow all actions on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL REFERENCES public.users("uid") ON DELETE CASCADE,
  "senderId" TEXT NOT NULL REFERENCES public.users("uid") ON DELETE CASCADE,
  "senderName" TEXT NOT NULL,
  "senderAvatar" TEXT,
  "postId" TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "createdAt" TEXT NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow all actions on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 8. Groups Table
CREATE TABLE IF NOT EXISTS public.groups (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "coverPhoto" TEXT,
  "ownerId" TEXT NOT NULL REFERENCES public.users("uid") ON DELETE CASCADE,
  "members" TEXT[] DEFAULT '{}',
  "createdAt" TEXT NOT NULL
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Allow all actions on groups" ON public.groups FOR ALL USING (true) WITH CHECK (true);

-- 9. Pages Table
CREATE TABLE IF NOT EXISTS public.pages (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "profilePicture" TEXT,
  "coverPhoto" TEXT,
  "ownerId" TEXT NOT NULL REFERENCES public.users("uid") ON DELETE CASCADE,
  "followers" TEXT[] DEFAULT '{}',
  "createdAt" TEXT NOT NULL
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on pages" ON public.pages FOR SELECT USING (true);
CREATE POLICY "Allow all actions on pages" ON public.pages FOR ALL USING (true) WITH CHECK (true);

-- 10. Bookmarks Table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users("uid") ON DELETE CASCADE,
  "postId" TEXT NOT NULL REFERENCES public.posts("postId") ON DELETE CASCADE,
  "createdAt" TEXT NOT NULL
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on bookmarks" ON public.bookmarks FOR SELECT USING (true);
CREATE POLICY "Allow all actions on bookmarks" ON public.bookmarks FOR ALL USING (true) WITH CHECK (true);

-- 11. Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
  "id" TEXT PRIMARY KEY,
  "reporterId" TEXT NOT NULL REFERENCES public.users("uid") ON DELETE CASCADE,
  "reporterName" TEXT NOT NULL,
  "postId" TEXT,
  "postContent" TEXT,
  "reason" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on reports" ON public.reports FOR SELECT USING (true);
CREATE POLICY "Allow all actions on reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);

-- 12. Highlights Table
CREATE TABLE IF NOT EXISTS public.highlights (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users("uid") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "coverColor" TEXT NOT NULL,
  "postIds" TEXT[] DEFAULT '{}',
  "createdAt" TEXT NOT NULL
);

ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on highlights" ON public.highlights FOR SELECT USING (true);
CREATE POLICY "Allow all actions on highlights" ON public.highlights FOR ALL USING (true) WITH CHECK (true);
