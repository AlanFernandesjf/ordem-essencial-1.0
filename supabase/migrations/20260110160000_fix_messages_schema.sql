-- Fix Infinite Recursion by using a SECURITY DEFINER function

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM community_conversation_participants 
    WHERE conversation_id = _conversation_id 
    AND user_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_participant TO authenticated;

-- Update Policies to use the function

-- Conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON community_conversations;
CREATE POLICY "Users can view their conversations" 
    ON community_conversations 
    FOR SELECT 
    USING (is_conversation_participant(id));

-- Participants
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON community_conversation_participants;
CREATE POLICY "Users can view participants of their conversations" 
    ON community_conversation_participants 
    FOR SELECT 
    USING (is_conversation_participant(conversation_id));

-- Messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON community_messages;
CREATE POLICY "Users can view messages in their conversations" 
    ON community_messages 
    FOR SELECT 
    USING (is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON community_messages;
CREATE POLICY "Users can insert messages in their conversations" 
    ON community_messages 
    FOR INSERT 
    WITH CHECK (
        auth.uid() = sender_id AND
        is_conversation_participant(conversation_id)
    );

-- Fix Foreign Key Relationship for PostgREST embedding
-- We want community_conversation_participants.user_id to reference profiles(id) instead of auth.users(id)
-- First, try to drop the existing constraint. We assume the name based on convention.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'community_conversation_participants_user_id_fkey'
        AND table_name = 'community_conversation_participants'
    ) THEN
        ALTER TABLE community_conversation_participants 
        DROP CONSTRAINT community_conversation_participants_user_id_fkey;
    END IF;
END $$;

-- Add the new constraint
ALTER TABLE community_conversation_participants
ADD CONSTRAINT community_conversation_participants_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;
