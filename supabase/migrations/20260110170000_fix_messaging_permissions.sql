-- FIX MESSAGING PERMISSIONS (RLS)
-- This script fixes the issue where messages are not received because the receiver is not correctly added or cannot view the conversation.

-- 1. Helper Function to check participation (Security Definer to bypass recursion)
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

-- 2. Update Policies for Conversations
ALTER TABLE community_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their conversations" ON community_conversations;
CREATE POLICY "Users can view their conversations" 
    ON community_conversations 
    FOR SELECT 
    USING (is_conversation_participant(id));

DROP POLICY IF EXISTS "Users can insert conversations" ON community_conversations;
CREATE POLICY "Users can insert conversations" 
    ON community_conversations 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 3. Update Policies for Participants
ALTER TABLE community_conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view participants of their conversations" ON community_conversation_participants;
CREATE POLICY "Users can view participants of their conversations" 
    ON community_conversation_participants 
    FOR SELECT 
    USING (is_conversation_participant(conversation_id));

-- CRITICAL FIX: Allow users to add participants (themselves and others) when starting a conversation
DROP POLICY IF EXISTS "Users can insert participants" ON community_conversation_participants;
CREATE POLICY "Users can insert participants" 
    ON community_conversation_participants 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 4. Update Policies for Messages
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

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

-- 5. Fix Foreign Key if needed (PostgREST embedding fix)
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

ALTER TABLE community_conversation_participants
ADD CONSTRAINT community_conversation_participants_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;
