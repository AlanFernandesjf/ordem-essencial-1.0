-- Create Community Posts Table
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Community Comments Table
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Community Likes Table
CREATE TABLE IF NOT EXISTS community_likes (
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

-- Create Community Events Table
CREATE TABLE IF NOT EXISTS community_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  max_participants INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Community Event Participants Table
CREATE TABLE IF NOT EXISTS community_event_participants (
  event_id UUID REFERENCES community_events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (event_id, user_id)
);

-- Create Community Follows Table
CREATE TABLE IF NOT EXISTS community_follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

-- Enable RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_follows ENABLE ROW LEVEL SECURITY;

-- Policies for community_posts
CREATE POLICY "Posts are viewable by everyone" ON community_posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for community_comments
CREATE POLICY "Comments are viewable by everyone" ON community_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON community_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON community_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for community_likes
CREATE POLICY "Likes are viewable by everyone" ON community_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can create likes" ON community_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON community_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for community_events
CREATE POLICY "Events are viewable by everyone" ON community_events
  FOR SELECT USING (true);

CREATE POLICY "Users can create events" ON community_events
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their events" ON community_events
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their events" ON community_events
  FOR DELETE USING (auth.uid() = creator_id);

-- Policies for community_event_participants
CREATE POLICY "Participants are viewable by everyone" ON community_event_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join events" ON community_event_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave events" ON community_event_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for community_follows
CREATE POLICY "Follows are viewable by everyone" ON community_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON community_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" ON community_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Function to handle likes count
CREATE OR REPLACE FUNCTION handle_new_like()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_posts
  SET likes_count = likes_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_created ON community_likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON community_likes
  FOR EACH ROW EXECUTE PROCEDURE handle_new_like();

CREATE OR REPLACE FUNCTION handle_unlike()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_posts
  SET likes_count = likes_count - 1
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_deleted ON community_likes;
CREATE TRIGGER on_like_deleted
  AFTER DELETE ON community_likes
  FOR EACH ROW EXECUTE PROCEDURE handle_unlike();
