-- Create conversations table
CREATE TABLE IF NOT EXISTS community_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create participants table
CREATE TABLE IF NOT EXISTS community_conversation_participants (
    conversation_id UUID REFERENCES community_conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS community_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES community_conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_by JSONB DEFAULT '[]'::jsonb -- Array of user_ids who read the message
);

-- Enable RLS
ALTER TABLE community_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

-- DROP policies if they exist to avoid errors on re-run
DROP POLICY IF EXISTS "Users can view their conversations" ON community_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON community_conversations;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON community_conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON community_conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON community_messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON community_messages;

-- Policies for conversations
CREATE POLICY "Users can view their conversations" 
    ON community_conversations 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM community_conversation_participants 
            WHERE conversation_id = community_conversations.id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversations" 
    ON community_conversations 
    FOR INSERT 
    WITH CHECK (true);

-- Policies for participants
CREATE POLICY "Users can view participants of their conversations" 
    ON community_conversation_participants 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM community_conversation_participants AS my_participation
            WHERE my_participation.conversation_id = community_conversation_participants.conversation_id 
            AND my_participation.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add participants" 
    ON community_conversation_participants 
    FOR INSERT 
    WITH CHECK (true);

-- Policies for messages
CREATE POLICY "Users can view messages in their conversations" 
    ON community_messages 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM community_conversation_participants 
            WHERE conversation_id = community_messages.conversation_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their conversations" 
    ON community_messages 
    FOR INSERT 
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM community_conversation_participants 
            WHERE conversation_id = community_messages.conversation_id 
            AND user_id = auth.uid()
        )
    );
