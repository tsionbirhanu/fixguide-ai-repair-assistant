"""
Database Service for Usage Analytics
Tracks chat messages, conversations, and token usage per user.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional

from supabase import Client, create_client

from app.core.config import settings


class DatabaseService:
    """Supabase database service for analytics and chat history."""

    def __init__(self):
        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            raise ValueError("Supabase credentials not configured")

        self._url = settings.SUPABASE_URL
        self._anon_key = settings.SUPABASE_ANON_KEY
        self._service_key = settings.SUPABASE_SERVICE_KEY
        self.uses_service_role = bool(self._service_key)

        # Prefer service role for trusted backend writes. Fall back to anon+user JWT.
        db_key = self._service_key or self._anon_key
        self.client: Client = create_client(self._url, db_key)

    def _client_for(self, access_token: Optional[str] = None) -> Client:
        """Return a Supabase client authorized for this request."""
        if self.uses_service_role or not access_token:
            return self.client

        user_client = create_client(self._url, self._anon_key)
        user_client.postgrest.auth(access_token)
        return user_client

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _title_from_content(content: str) -> str:
        title = (content or "").strip()
        if not title or title == "[Image]":
            title = "New chat"
        return title[:50]

    async def ensure_conversation(
        self,
        user_id: str,
        thread_id: str,
        title: Optional[str] = None,
        access_token: Optional[str] = None,
    ) -> bool:
        """Create the conversation metadata row if it does not exist."""
        try:
            client = self._client_for(access_token)
            existing = (
                client.table("conversations")
                .select("thread_id")
                .eq("user_id", user_id)
                .eq("thread_id", thread_id)
                .limit(1)
                .execute()
            )

            if existing.data:
                client.table("conversations").update({"updated_at": self._now()}).eq(
                    "user_id", user_id
                ).eq("thread_id", thread_id).execute()
                return True

            data = {
                "user_id": user_id,
                "thread_id": thread_id,
                "title": self._title_from_content(title or ""),
                "created_at": self._now(),
                "updated_at": self._now(),
            }
            client.table("conversations").insert(data).execute()
            return True
        except Exception as e:
            print(f"Error ensuring conversation: {e}")
            return False

    async def save_message(
        self,
        user_id: str,
        thread_id: str,
        role: str,
        content: str,
        tokens: int = 0,
        access_token: Optional[str] = None,
    ) -> Dict:
        """Save a chat message to the database."""
        try:
            client = self._client_for(access_token)
            if role == "user":
                await self.ensure_conversation(user_id, thread_id, content, access_token)

            data = {
                "user_id": user_id,
                "thread_id": thread_id,
                "role": role,
                "content": content,
                "tokens": tokens,
                "created_at": self._now(),
            }

            response = client.table("messages").insert(data).execute()

            # Keep the thread at the top of the conversation list.
            await self.ensure_conversation(user_id, thread_id, None, access_token)
            return {"success": True, "data": response.data}
        except Exception as e:
            print(f"Error saving message: {e}")
            return {"success": False, "error": str(e)}

    async def get_conversation_history(
        self,
        user_id: str,
        thread_id: str,
        limit: int = 50,
        access_token: Optional[str] = None,
    ) -> List[Dict]:
        """Get conversation history for a thread, ordered oldest to newest."""
        try:
            client = self._client_for(access_token)
            response = (
                client.table("messages")
                .select("*")
                .eq("user_id", user_id)
                .eq("thread_id", thread_id)
                .order("created_at", desc=False)
                .limit(limit)
                .execute()
            )
            return response.data or []
        except Exception as e:
            print(f"Error getting conversation history: {e}")
            return []

    async def list_conversations(
        self,
        user_id: str,
        access_token: Optional[str] = None,
    ) -> List[Dict]:
        """List conversation metadata, falling back to messages if needed."""
        client = self._client_for(access_token)
        try:
            response = (
                client.table("conversations")
                .select("thread_id,title,created_at,updated_at")
                .eq("user_id", user_id)
                .order("updated_at", desc=True)
                .execute()
            )
            return response.data or []
        except Exception as e:
            print(f"Error listing conversations table: {e}")

        try:
            response = (
                client.table("messages")
                .select("thread_id,role,content,created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=False)
                .execute()
            )
            threads: Dict[str, Dict] = {}
            for row in response.data or []:
                thread_id = row.get("thread_id")
                if not thread_id:
                    continue
                if thread_id not in threads:
                    threads[thread_id] = {
                        "thread_id": thread_id,
                        "title": "New chat",
                        "created_at": row.get("created_at"),
                        "updated_at": row.get("created_at"),
                    }
                threads[thread_id]["updated_at"] = row.get("created_at") or threads[thread_id]["updated_at"]
                if row.get("role") == "user" and threads[thread_id]["title"] == "New chat":
                    threads[thread_id]["title"] = self._title_from_content(row.get("content") or "")

            conversations = list(threads.values())
            conversations.sort(key=lambda item: item.get("updated_at") or "", reverse=True)
            return conversations
        except Exception as e:
            print(f"Error listing conversations from messages: {e}")
            return []

    async def rename_conversation(
        self,
        user_id: str,
        thread_id: str,
        title: str,
        access_token: Optional[str] = None,
    ) -> bool:
        """Rename a conversation thread."""
        clean_title = self._title_from_content(title)
        try:
            client = self._client_for(access_token)
            await self.ensure_conversation(user_id, thread_id, clean_title, access_token)
            client.table("conversations").update(
                {"title": clean_title, "updated_at": self._now()}
            ).eq("user_id", user_id).eq("thread_id", thread_id).execute()
            return True
        except Exception as e:
            print(f"Error renaming conversation: {e}")
            return False

    async def delete_conversation(
        self,
        user_id: str,
        thread_id: str,
        access_token: Optional[str] = None,
    ) -> bool:
        """Delete a conversation and its stored analytics rows."""
        try:
            client = self._client_for(access_token)
            client.table("messages").delete().eq("user_id", user_id).eq("thread_id", thread_id).execute()
            try:
                client.table("token_usage").delete().eq("user_id", user_id).eq("thread_id", thread_id).execute()
            except Exception as e:
                print(f"Error deleting token usage: {e}")
            try:
                client.table("conversations").delete().eq("user_id", user_id).eq("thread_id", thread_id).execute()
            except Exception as e:
                print(f"Error deleting conversation metadata: {e}")
            return True
        except Exception as e:
            print(f"Error deleting conversation: {e}")
            return False

    async def get_user_stats(self, user_id: str, access_token: Optional[str] = None) -> Dict:
        """Get usage statistics for a user."""
        try:
            client = self._client_for(access_token)
            messages_response = (
                client.table("messages")
                .select("*", count="exact")
                .eq("user_id", user_id)
                .execute()
            )

            total_messages = messages_response.count if hasattr(messages_response, "count") else 0
            total_tokens = sum(msg.get("tokens", 0) for msg in messages_response.data or [])

            conversations = await self.list_conversations(user_id, access_token)

            return {
                "total_messages": total_messages,
                "total_tokens": total_tokens,
                "total_conversations": len(conversations),
            }
        except Exception as e:
            print(f"Error getting user stats: {e}")
            return {
                "total_messages": 0,
                "total_tokens": 0,
                "total_conversations": 0,
            }

    async def increment_token_usage(
        self,
        user_id: str,
        thread_id: str,
        tokens: int,
        access_token: Optional[str] = None,
    ) -> bool:
        """Increment token usage for tracking."""
        try:
            client = self._client_for(access_token)
            data = {
                "user_id": user_id,
                "thread_id": thread_id,
                "tokens": tokens,
                "created_at": self._now(),
            }

            client.table("token_usage").insert(data).execute()
            return True
        except Exception as e:
            print(f"Error incrementing token usage: {e}")
            return False


# Global database service instance
db_service = DatabaseService()
