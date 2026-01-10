-- 1. Add is_read column to community_messages if it doesn't exist
ALTER TABLE public.community_messages 
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- 2. Update RLS for community_messages to allow updating is_read
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON community_messages;

CREATE POLICY "Users can update messages in their conversations" 
ON community_messages 
FOR UPDATE 
USING (
    is_conversation_participant(conversation_id)
)
WITH CHECK (
    is_conversation_participant(conversation_id)
);

-- 3. Fix Search/Follows Permissions
ALTER TABLE public.community_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read follows" ON public.community_follows;
CREATE POLICY "Anyone can read follows"
ON public.community_follows
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON public.community_follows;
CREATE POLICY "Users can follow others"
ON public.community_follows
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.community_follows;
CREATE POLICY "Users can unfollow"
ON public.community_follows
FOR DELETE
USING (auth.uid() = follower_id);

-- 4. Ensure community_conversation_participants allows inserts (for starting chats)
DROP POLICY IF EXISTS "Participants can insert themselves" ON community_conversation_participants;
CREATE POLICY "Participants can insert themselves"
ON community_conversation_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);
