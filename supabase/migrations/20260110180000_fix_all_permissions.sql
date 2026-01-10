-- FIX ALL PERMISSIONS (Profiles & Messaging)
-- Run this in Supabase SQL Editor to fix search and chat issues.

-- ==========================================
-- 1. PROFILES: Allow users to search/view others
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove restrictive policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Allow authenticated users to view all profiles (needed for Search & Community)
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true); 

-- Ensure users can still update only their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- ==========================================
-- 2. MESSAGING: Fix permissions for conversations
-- ==========================================

-- Helper Function to check participation
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

-- Conversations Policies
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

-- Participants Policies
ALTER TABLE community_conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view participants of their conversations" ON community_conversation_participants;
CREATE POLICY "Users can view participants of their conversations" 
    ON community_conversation_participants 
    FOR SELECT 
    USING (is_conversation_participant(conversation_id));

-- CRITICAL FIX: Allow users to add participants (themselves and others)
DROP POLICY IF EXISTS "Users can insert participants" ON community_conversation_participants;
CREATE POLICY "Users can insert participants" 
    ON community_conversation_participants 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Messages Policies
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
