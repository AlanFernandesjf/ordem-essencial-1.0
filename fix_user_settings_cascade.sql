-- Fix Foreign Key Constraints for user_settings and others
-- This script adds ON DELETE CASCADE to ensure complete user deletion

-- 1. User Settings (The one causing the current error)
ALTER TABLE public.user_settings
DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;

ALTER TABLE public.user_settings
ADD CONSTRAINT user_settings_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 2. User Subscriptions (Just in case it wasn't covered or named differently)
-- Check if table exists first to avoid errors, but in SQL Editor we just run it.
-- Assuming table name 'user_subscriptions' or 'subscriptions' based on schema.

-- If 'subscriptions' table exists
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 3. Community Tables (If they exist based on previous context)
-- Community Posts
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'community_posts') THEN
        ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_user_id_fkey;
        ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Community Comments
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'community_comments') THEN
        ALTER TABLE public.community_comments DROP CONSTRAINT IF EXISTS community_comments_user_id_fkey;
        ALTER TABLE public.community_comments ADD CONSTRAINT community_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Community Likes
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'community_likes') THEN
        ALTER TABLE public.community_likes DROP CONSTRAINT IF EXISTS community_likes_user_id_fkey;
        ALTER TABLE public.community_likes ADD CONSTRAINT community_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Community Event Participants
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'community_event_participants') THEN
        ALTER TABLE public.community_event_participants DROP CONSTRAINT IF EXISTS community_event_participants_user_id_fkey;
        ALTER TABLE public.community_event_participants ADD CONSTRAINT community_event_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Community Follows (Follower)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'community_follows') THEN
        ALTER TABLE public.community_follows DROP CONSTRAINT IF EXISTS community_follows_follower_id_fkey;
        ALTER TABLE public.community_follows ADD CONSTRAINT community_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Community Follows (Following)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'community_follows') THEN
        ALTER TABLE public.community_follows DROP CONSTRAINT IF EXISTS community_follows_following_id_fkey;
        ALTER TABLE public.community_follows ADD CONSTRAINT community_follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
