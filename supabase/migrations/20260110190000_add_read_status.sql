-- Add is_read column to community_messages
ALTER TABLE public.community_messages 
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Policy to allow users to update is_read (mark as read)
-- We need to allow users to update messages they received in a conversation they participate in.
-- But standard update policy might be restricted to sender.
-- Let's check existing update policies or create a specific one.

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
