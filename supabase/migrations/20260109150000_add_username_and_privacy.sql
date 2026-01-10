-- Add username column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Update Policies for Community Posts
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON community_posts;

CREATE POLICY "Posts are viewable by connections" ON community_posts
FOR SELECT USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM community_follows
    WHERE follower_id = auth.uid()
    AND following_id = community_posts.user_id
  )
);

-- Update Policies for Community Events
DROP POLICY IF EXISTS "Events are viewable by everyone" ON community_events;

CREATE POLICY "Events are viewable by connections" ON community_events
FOR SELECT USING (
  auth.uid() = creator_id
  OR
  EXISTS (
    SELECT 1 FROM community_follows
    WHERE follower_id = auth.uid()
    AND following_id = community_events.creator_id
  )
);
