"""
Database Service for Usage Analytics
Tracks chat messages and token usage per user
"""

from typing import Dict, List, Optional
from datetime import datetime
from supabase import create_client, Client
from app.core.config import settings


class DatabaseService:
    """Supabase database service for analytics and chat history"""
    
    def __init__(self):
        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            raise ValueError("Supabase credentials not configured")
        
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY
        )
    
    async def save_message(self, user_id: str, thread_id: str, role: str, content: str, tokens: int = 0) -> Dict:
        """
        Save a chat message to the database
        
        Args:
            user_id: User's unique ID
            thread_id: Conversation thread ID
            role: Message role ('user' or 'assistant')
            content: Message content
            tokens: Estimated token count
        
        Returns:
            Saved message data
        """
        try:
            data = {
                "user_id": user_id,
                "thread_id": thread_id,
                "role": role,
                "content": content,
                "tokens": tokens,
                "created_at": datetime.utcnow().isoformat()
            }
            
            response = self.client.table("messages").insert(data).execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            print(f"Error saving message: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_conversation_history(self, user_id: str, thread_id: str, limit: int = 50) -> List[Dict]:
        """
        Get conversation history for a thread
        
        Args:
            user_id: User's ID
            thread_id: Thread ID
            limit: Maximum number of messages to retrieve
        
        Returns:
            List of messages ordered by creation time
        """
        try:
            response = (
                self.client.table("messages")
                .select("*")
                .eq("user_id", user_id)
                .eq("thread_id", thread_id)
                .order("created_at", desc=False)
                .limit(limit)
                .execute()
            )
            return response.data
        except Exception as e:
            print(f"Error getting conversation history: {e}")
            return []
    
    async def get_user_stats(self, user_id: str) -> Dict:
        """
        Get usage statistics for a user
        
        Args:
            user_id: User's ID
        
        Returns:
            Dictionary with total messages, tokens, and conversations
        """
        try:
            # Get total messages
            messages_response = (
                self.client.table("messages")
                .select("*", count="exact")
                .eq("user_id", user_id)
                .execute()
            )
            
            total_messages = messages_response.count if hasattr(messages_response, 'count') else 0
            
            # Calculate total tokens
            total_tokens = 0
            if messages_response.data:
                total_tokens = sum(msg.get("tokens", 0) for msg in messages_response.data)
            
            # Get unique thread count
            threads_response = (
                self.client.table("messages")
                .select("thread_id")
                .eq("user_id", user_id)
                .execute()
            )
            
            unique_threads = len(set(msg["thread_id"] for msg in threads_response.data)) if threads_response.data else 0
            
            return {
                "total_messages": total_messages,
                "total_tokens": total_tokens,
                "total_conversations": unique_threads
            }
        except Exception as e:
            print(f"Error getting user stats: {e}")
            return {
                "total_messages": 0,
                "total_tokens": 0,
                "total_conversations": 0
            }
    
    async def increment_token_usage(self, user_id: str, thread_id: str, tokens: int) -> bool:
        """
        Increment token usage for tracking
        
        Args:
            user_id: User's ID
            thread_id: Thread ID
            tokens: Number of tokens to add
        
        Returns:
            Success status
        """
        try:
            data = {
                "user_id": user_id,
                "thread_id": thread_id,
                "tokens": tokens,
                "created_at": datetime.utcnow().isoformat()
            }
            
            self.client.table("token_usage").insert(data).execute()
            return True
        except Exception as e:
            print(f"Error incrementing token usage: {e}")
            return False


# Global database service instance
db_service = DatabaseService()
