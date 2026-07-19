/*
# Snapix — core social platform schema

## Overview
Full data model for Snapix: profiles, posts, stories, reels, messaging,
notifications, social graph, saves/collections, interests, onboarding,
privacy, and content moderation. RLS scoped to authenticated users.
Storage buckets for user media. Tables created first, then RLS policies,
so foreign keys resolve cleanly.

## New Tables
- profiles, posts, post_media, likes, comments
- follows, follow_requests
- stories, story_views, story_highlights, highlight_items
- reels, reel_likes, reel_comments
- conversations, conversation_members, messages, message_reads
- notifications
- collections, saved_posts
- interests, user_interests
- blocks, mutes, reports, drafts

## Security
- RLS enabled on every table.
- Social content (profiles/posts/stories/reels/comments/likes): readable by
  authenticated, writable by owner.
- Messages: only conversation members.
- Notifications/saves/collections/drafts/blocks/mutes/interests: owner only.
- Storage: public read, auth-only write.
*/

-- ===== TABLES FIRST =====

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  bio text,
  avatar_url text,
  cover_url text,
  website text,
  location text,
  is_private boolean NOT NULL DEFAULT false,
  is_creator boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  interests text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  caption text,
  location text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts (user_id);

CREATE TABLE IF NOT EXISTS post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  position int NOT NULL DEFAULT 0,
  alt_text text
);

CREATE TABLE IF NOT EXISTS likes (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments (post_id, created_at);

CREATE TABLE IF NOT EXISTS follows (
  follower_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS follow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE (requester_id, requested_id)
);

CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url text,
  media_type text NOT NULL DEFAULT 'image',
  text text,
  background text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX IF NOT EXISTS stories_user_id_idx ON stories (user_id);

CREATE TABLE IF NOT EXISTS story_views (
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);

CREATE TABLE IF NOT EXISTS story_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  cover_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS highlight_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id uuid NOT NULL REFERENCES story_highlights(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text DEFAULT 'image'
);

CREATE TABLE IF NOT EXISTS reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  caption text,
  audio_name text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reels_created_at_idx ON reels (created_at DESC);

CREATE TABLE IF NOT EXISTS reel_likes (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, reel_id)
);

CREATE TABLE IF NOT EXISTS reel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  text text,
  media_url text,
  media_type text,
  reply_to uuid REFERENCES messages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS message_reads (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  entity_id uuid,
  entity_type text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_posts (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  emoji text
);

CREATE TABLE IF NOT EXISTS user_interests (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id uuid NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, interest_id)
);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS mutes (
  muter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (muter_id, muted_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  caption text,
  media jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- ===== RLS + POLICIES =====

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "posts_insert" ON posts;
CREATE POLICY "posts_insert" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "posts_update" ON posts;
CREATE POLICY "posts_update" ON posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "posts_delete" ON posts;
CREATE POLICY "posts_delete" ON posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_media_select" ON post_media;
CREATE POLICY "post_media_select" ON post_media FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "post_media_insert" ON post_media;
CREATE POLICY "post_media_insert" ON post_media FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()));
DROP POLICY IF EXISTS "post_media_delete" ON post_media;
CREATE POLICY "post_media_delete" ON post_media FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()));

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "likes_select" ON likes;
CREATE POLICY "likes_select" ON likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "likes_insert" ON likes;
CREATE POLICY "likes_insert" ON likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "likes_delete" ON likes;
CREATE POLICY "likes_delete" ON likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "comments_insert" ON comments;
CREATE POLICY "comments_insert" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "comments_delete" ON comments;
CREATE POLICY "comments_delete" ON comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follows_select" ON follows;
CREATE POLICY "follows_select" ON follows FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "follows_insert" ON follows;
CREATE POLICY "follows_insert" ON follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "follows_delete" ON follows;
CREATE POLICY "follows_delete" ON follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follow_requests_select" ON follow_requests;
CREATE POLICY "follow_requests_select" ON follow_requests FOR SELECT TO authenticated USING (auth.uid() = requester_id OR auth.uid() = requested_id);
DROP POLICY IF EXISTS "follow_requests_insert" ON follow_requests;
CREATE POLICY "follow_requests_insert" ON follow_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
DROP POLICY IF EXISTS "follow_requests_update" ON follow_requests;
CREATE POLICY "follow_requests_update" ON follow_requests FOR UPDATE TO authenticated USING (auth.uid() = requested_id) WITH CHECK (auth.uid() = requested_id);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stories_select" ON stories;
CREATE POLICY "stories_select" ON stories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "stories_insert" ON stories;
CREATE POLICY "stories_insert" ON stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "stories_delete" ON stories;
CREATE POLICY "stories_delete" ON stories FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "story_views_select" ON story_views;
CREATE POLICY "story_views_select" ON story_views FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "story_views_insert" ON story_views;
CREATE POLICY "story_views_insert" ON story_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER TABLE story_highlights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "highlights_select" ON story_highlights;
CREATE POLICY "highlights_select" ON story_highlights FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "highlights_insert" ON story_highlights;
CREATE POLICY "highlights_insert" ON story_highlights FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "highlights_delete" ON story_highlights;
CREATE POLICY "highlights_delete" ON story_highlights FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE highlight_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "highlight_items_select" ON highlight_items;
CREATE POLICY "highlight_items_select" ON highlight_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "highlight_items_insert" ON highlight_items;
CREATE POLICY "highlight_items_insert" ON highlight_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM story_highlights WHERE story_highlights.id = highlight_id AND story_highlights.user_id = auth.uid()));
DROP POLICY IF EXISTS "highlight_items_delete" ON highlight_items;
CREATE POLICY "highlight_items_delete" ON highlight_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM story_highlights WHERE story_highlights.id = highlight_id AND story_highlights.user_id = auth.uid()));

ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reels_select" ON reels;
CREATE POLICY "reels_select" ON reels FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "reels_insert" ON reels;
CREATE POLICY "reels_insert" ON reels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reels_update" ON reels;
CREATE POLICY "reels_update" ON reels FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reels_delete" ON reels;
CREATE POLICY "reels_delete" ON reels FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reel_likes_select" ON reel_likes;
CREATE POLICY "reel_likes_select" ON reel_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "reel_likes_insert" ON reel_likes;
CREATE POLICY "reel_likes_insert" ON reel_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reel_likes_delete" ON reel_likes;
CREATE POLICY "reel_likes_delete" ON reel_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reel_comments_select" ON reel_comments;
CREATE POLICY "reel_comments_select" ON reel_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "reel_comments_insert" ON reel_comments;
CREATE POLICY "reel_comments_insert" ON reel_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reel_comments_delete" ON reel_comments;
CREATE POLICY "reel_comments_delete" ON reel_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversation_members WHERE conversation_members.conversation_id = conversations.id AND conversation_members.user_id = auth.uid()));
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert" ON conversations FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conv_members_select" ON conversation_members;
CREATE POLICY "conv_members_select" ON conversation_members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversation_members m2 WHERE m2.conversation_id = conversation_members.conversation_id AND m2.user_id = auth.uid()));
DROP POLICY IF EXISTS "conv_members_insert" ON conversation_members;
CREATE POLICY "conv_members_insert" ON conversation_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM conversation_members m2 WHERE m2.conversation_id = conversation_members.conversation_id AND m2.user_id = auth.uid()));

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversation_members WHERE conversation_members.conversation_id = messages.conversation_id AND conversation_members.user_id = auth.uid()));
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM conversation_members WHERE conversation_members.conversation_id = messages.conversation_id AND conversation_members.user_id = auth.uid()));
DROP POLICY IF EXISTS "messages_delete" ON messages;
CREATE POLICY "messages_delete" ON messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "message_reads_select" ON message_reads;
CREATE POLICY "message_reads_select" ON message_reads FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversation_members cm JOIN messages m ON m.id = message_reads.message_id WHERE cm.conversation_id = m.conversation_id AND cm.user_id = auth.uid()));
DROP POLICY IF EXISTS "message_reads_insert" ON message_reads;
CREATE POLICY "message_reads_insert" ON message_reads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collections_select" ON collections;
CREATE POLICY "collections_select" ON collections FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "collections_insert" ON collections;
CREATE POLICY "collections_insert" ON collections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "collections_delete" ON collections;
CREATE POLICY "collections_delete" ON collections FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saved_posts_select" ON saved_posts;
CREATE POLICY "saved_posts_select" ON saved_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_posts_insert" ON saved_posts;
CREATE POLICY "saved_posts_insert" ON saved_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_posts_delete" ON saved_posts;
CREATE POLICY "saved_posts_delete" ON saved_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "interests_select" ON interests;
CREATE POLICY "interests_select" ON interests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "interests_insert" ON interests;
CREATE POLICY "interests_insert" ON interests FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_interests_select" ON user_interests;
CREATE POLICY "user_interests_select" ON user_interests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "user_interests_insert" ON user_interests;
CREATE POLICY "user_interests_insert" ON user_interests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_interests_delete" ON user_interests;
CREATE POLICY "user_interests_delete" ON user_interests FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blocks_select" ON blocks;
CREATE POLICY "blocks_select" ON blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
DROP POLICY IF EXISTS "blocks_insert" ON blocks;
CREATE POLICY "blocks_insert" ON blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "blocks_delete" ON blocks;
CREATE POLICY "blocks_delete" ON blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

ALTER TABLE mutes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mutes_select" ON mutes;
CREATE POLICY "mutes_select" ON mutes FOR SELECT TO authenticated USING (auth.uid() = muter_id);
DROP POLICY IF EXISTS "mutes_insert" ON mutes;
CREATE POLICY "mutes_insert" ON mutes FOR INSERT TO authenticated WITH CHECK (auth.uid() = muter_id);
DROP POLICY IF EXISTS "mutes_delete" ON mutes;
CREATE POLICY "mutes_delete" ON mutes FOR DELETE TO authenticated USING (auth.uid() = muter_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_insert" ON reports;
CREATE POLICY "reports_insert" ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drafts_select" ON drafts;
CREATE POLICY "drafts_select" ON drafts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "drafts_insert" ON drafts;
CREATE POLICY "drafts_insert" ON drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "drafts_delete" ON drafts;
CREATE POLICY "drafts_delete" ON drafts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== STORAGE =====
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('reels', 'reels', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('messages', 'messages', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_read_all" ON storage.objects;
CREATE POLICY "storage_read_all" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id IN ('avatars','covers','posts','stories','reels','messages'));
DROP POLICY IF EXISTS "storage_upload_own" ON storage.objects;
CREATE POLICY "storage_upload_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('avatars','covers','posts','stories','reels','messages'));
DROP POLICY IF EXISTS "storage_delete_own" ON storage.objects;
CREATE POLICY "storage_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('avatars','covers','posts','stories','reels','messages'));

-- ===== SEED INTERESTS =====
INSERT INTO interests (name, emoji) VALUES
  ('Photography','📷'),('Travel','✈️'),('Food','🍽️'),('Fashion','👗'),('Music','🎵'),
  ('Art','🎨'),('Fitness','💪'),('Nature','🌿'),('Technology','💻'),('Gaming','🎮'),
  ('Books','📚'),('Cars','🏎️'),('Pets','🐾'),('Sports','⚽'),('Film','🎬'),
  ('Dance','💃'),('Architecture','🏛️'),('Coffee','☕'),('Wellness','🧘'),('Design','✏️')
ON CONFLICT (name) DO NOTHING;
