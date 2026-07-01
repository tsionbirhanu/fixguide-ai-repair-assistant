import asyncio
import unittest

from fastapi.testclient import TestClient

from app.agent.ifixit_tool import (
    build_device_search_queries,
    _extract_media_image_url,
    _needs_specific_device,
    format_guide_as_markdown,
    select_best_guide,
)
from app.api import chat
from app.core.auth import _demo_users, auth_service
from app.core.config import Settings, settings
from app.core.api_keys import RoundRobinKeyRing
from app.main import app


class ConfigTests(unittest.TestCase):
    def test_debug_accepts_release_word(self):
        parsed = Settings(DEBUG="release")
        self.assertFalse(parsed.DEBUG)

    def test_debug_accepts_log_level_word(self):
        parsed = Settings(DEBUG="WARN")
        self.assertFalse(parsed.DEBUG)

    def test_api_key_lists_prefer_rotation_values(self):
        parsed = Settings(
            GEMINI_API_KEY="single-gemini",
            GEMINI_API_KEYS="gemini-1, gemini-2",
            TAVILY_API_KEY="single-tavily",
            TAVILY_API_KEYS="tavily-1\ntavily-2",
            IFIXIT_APP_ID="single-ifixit",
            IFIXIT_APP_IDS="ifixit-1, ifixit-2",
        )

        self.assertEqual(parsed.gemini_api_keys_list, ["gemini-1", "gemini-2"])
        self.assertEqual(parsed.tavily_api_keys_list, ["tavily-1", "tavily-2"])
        self.assertEqual(parsed.ifixit_app_ids_list, ["ifixit-1", "ifixit-2"])

    def test_round_robin_key_ring_cycles_keys(self):
        ring = RoundRobinKeyRing(["key-1", "key-2"])

        self.assertEqual(ring.next(), "key-1")
        self.assertEqual(ring.next(), "key-2")
        self.assertEqual(ring.next(), "key-1")


class RepairToolTests(unittest.TestCase):
    def test_extract_media_image_url_supports_ifixit_media_shape(self):
        media = {
            "standard": "https://guide-images.cdn.ifixit.com/example.standard",
            "large": "https://guide-images.cdn.ifixit.com/example.large",
        }

        self.assertEqual(
            _extract_media_image_url(media),
            "https://guide-images.cdn.ifixit.com/example.standard",
        )

    def test_device_search_queries_strip_problem_words(self):
        queries = build_device_search_queries("How to replace iPhone 13 screen?")

        self.assertIn("iphone 13", queries)

    def test_generic_phone_query_needs_specific_device(self):
        self.assertTrue(_needs_specific_device("cracked phone screen replacement"))
        self.assertFalse(_needs_specific_device("iPhone 13 cracked screen replacement"))

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

    def test_markdown_includes_step_images(self):
        markdown = format_guide_as_markdown(
            {
                "title": "Screen Replacement",
                "tools": [],
                "parts": [],
                "steps": [
                    {
                        "title": "Remove the display",
                        "images": ["https://example.com/step-1.jpg"],
                        "lines": ["Lift the display carefully."],
                    }
                ],
            }
        )

        self.assertIn("![Step 1](https://example.com/step-1.jpg)", markdown)
        self.assertIn("Lift the display carefully.", markdown)

    def test_stream_helper_appends_missing_tool_images(self):
        section = chat._missing_image_section(
            "Here are the repair steps.",
            ["![Step 1](https://example.com/step-1.jpg)"],
        )

        self.assertIn("## Reference Images", section)
        self.assertIn("![Step 1](https://example.com/step-1.jpg)", section)


class DemoAuthTests(unittest.TestCase):
    def setUp(self):
        self.original_demo_auth = settings.DEMO_AUTH
        settings.DEMO_AUTH = True
        _demo_users.clear()

    def tearDown(self):
        settings.DEMO_AUTH = self.original_demo_auth
        _demo_users.clear()

    def test_demo_token_survives_memory_reset(self):
        result = asyncio.run(auth_service.login("demo@example.com", "secret123"))
        token = result["access_token"]
        _demo_users.clear()

        user = asyncio.run(auth_service.get_user(token))

        self.assertEqual(user["id"], token)
        self.assertEqual(user["email"], "demo@example.com")

    def test_old_demo_token_is_still_accepted(self):
        token = "demo_1234567890abcdef"

        user = asyncio.run(auth_service.get_user(token))

        self.assertEqual(user["id"], token)
        self.assertEqual(user["email"], "demo@local.dev")


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
