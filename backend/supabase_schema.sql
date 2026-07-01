-- FixGuide AI - Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Table for storing chat messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_user_thread ON messages(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Table for persistent conversation metadata
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    thread_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
    ON conversations(user_id, updated_at DESC);

-- Table for tracking token usage (for analytics)
CREATE TABLE IF NOT EXISTS token_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    thread_id TEXT NOT NULL,
    tokens INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_token_usage_user ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages table
-- Users can only see their own messages
CREATE POLICY "Users can view own messages"
    ON messages FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own messages
CREATE POLICY "Users can update own messages"
    ON messages FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
    ON messages FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for conversations table
CREATE POLICY "Users can view own conversations"
    ON conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
    ON conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
    ON conversations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
    ON conversations FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for token_usage table
CREATE POLICY "Users can view own token usage"
    ON token_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own token usage"
    ON token_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own token usage"
    ON token_usage FOR DELETE
    USING (auth.uid() = user_id);

-- Function to get user stats (optional helper)
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
    total_messages BIGINT,
    total_tokens BIGINT,
    total_conversations BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT m.id) as total_messages,
        COALESCE(SUM(m.tokens), 0) as total_tokens,
        COUNT(DISTINCT m.thread_id) as total_conversations
    FROM messages m
    WHERE m.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
