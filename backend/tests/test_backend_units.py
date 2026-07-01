import unittest

from fastapi.testclient import TestClient

from app.agent.ifixit_tool import format_guide_as_markdown, select_best_guide
from app.api import chat
from app.core.config import Settings, settings
from app.main import app


class ConfigTests(unittest.TestCase):
    def test_debug_accepts_release_word(self):
        parsed = Settings(DEBUG="release")
        self.assertFalse(parsed.DEBUG)


class RepairToolTests(unittest.TestCase):
    def test_select_best_guide_prefers_issue_match(self):
        guides = [
            {"guideid": 1, "title": "Battery Replacement", "subject": "Phone"},
            {"guideid": 2, "title": "Screen Replacement", "subject": "Phone display"},
        ]

        selected = select_best_guide(guides, "iPhone screen replacement")

        self.assertEqual(selected["guideid"], 2)

    def test_markdown_includes_source(self):
        markdown = format_guide_as_markdown(
            {
                "title": "Screen Replacement",
                "difficulty": "Moderate",
                "time_required": "30 minutes",
                "source_url": "https://www.ifixit.com/Guide/example",
                "tools": [],
                "parts": [],
                "steps": [],
            }
        )

        self.assertIn("**Source:** https://www.ifixit.com/Guide/example", markdown)


class DemoConversationApiTests(unittest.TestCase):
    def setUp(self):
        self.original_demo_auth = settings.DEMO_AUTH
        settings.DEMO_AUTH = True
        chat._demo_conversations.clear()
        chat._demo_conversation_titles.clear()
        self.client = TestClient(app)

    def tearDown(self):
        settings.DEMO_AUTH = self.original_demo_auth
        chat._demo_conversations.clear()
        chat._demo_conversation_titles.clear()

    def _auth_headers(self):
        response = self.client.post(
            "/api/auth/signup",
            json={"email": "demo@example.com", "password": "secret123"},
        )
        self.assertEqual(response.status_code, 200)
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}, token

    def test_demo_conversation_rename_delete_and_stats(self):
        headers, token = self._auth_headers()
        user_id = token
        thread_id = "thread-1"

        chat._store_demo_message(user_id, thread_id, "user", "How to fix PS5 fan?")
        chat._store_demo_message(user_id, thread_id, "assistant", "Check the fan guide.")

        conversations = self.client.get("/api/chat/conversations", headers=headers)
        self.assertEqual(conversations.status_code, 200)
        self.assertEqual(conversations.json()["conversations"][0]["title"], "How to fix PS5 fan?")

        rename = self.client.patch(
            f"/api/chat/conversations/{thread_id}",
            headers=headers,
            json={"title": "PS5 fan repair"},
        )
        self.assertEqual(rename.status_code, 200)
        self.assertEqual(rename.json()["conversation"]["title"], "PS5 fan repair")

        stats = self.client.get("/api/stats", headers=headers)
        self.assertEqual(stats.status_code, 200)
        self.assertEqual(stats.json()["total_messages"], 2)
        self.assertEqual(stats.json()["total_conversations"], 1)

        delete = self.client.delete(f"/api/chat/conversations/{thread_id}", headers=headers)
        self.assertEqual(delete.status_code, 200)

        conversations = self.client.get("/api/chat/conversations", headers=headers)
        self.assertEqual(conversations.json()["conversations"], [])


if __name__ == "__main__":
    unittest.main()
