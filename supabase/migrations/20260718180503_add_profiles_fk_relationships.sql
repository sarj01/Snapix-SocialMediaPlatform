-- Add FKs from content tables to profiles so PostgREST can resolve
-- embedded profile relations without explicit hints. The existing
-- FKs point to auth.users, which PostgREST can't traverse for embedding.

-- posts -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'posts_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- comments -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comments_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE comments
      ADD CONSTRAINT comments_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- stories -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stories_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE stories
      ADD CONSTRAINT stories_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- reels -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reels_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE reels
      ADD CONSTRAINT reels_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- reel_comments -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reel_comments_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE reel_comments
      ADD CONSTRAINT reel_comments_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- notifications actor -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notifications_actor_id_profiles_fkey'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_actor_id_profiles_fkey
      FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- follows (follower + following) -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'follows_follower_id_profiles_fkey'
  ) THEN
    ALTER TABLE follows
      ADD CONSTRAINT follows_follower_id_profiles_fkey
      FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'follows_following_id_profiles_fkey'
  ) THEN
    ALTER TABLE follows
      ADD CONSTRAINT follows_following_id_profiles_fkey
      FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
