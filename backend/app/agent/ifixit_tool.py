"""
iFixit API Tool for LangGraph Agent
Searches and retrieves verified repair guides from iFixit.com.
"""

from typing import Any, Dict, List, Optional
from urllib.parse import quote
import re

import httpx
from langchain_core.tools import tool

from app.core.api_keys import get_next_ifixit_app_id


PROBLEM_WORDS = {
    "back",
    "battery",
    "broken",
    "button",
    "camera",
    "charge",
    "charging",
    "crack",
    "cracked",
    "display",
    "drift",
    "fix",
    "glass",
    "issue",
    "keyboard",
    "lcd",
    "not",
    "overheating",
    "port",
    "problem",
    "repair",
    "replace",
    "replacement",
    "screen",
    "shattered",
    "speaker",
    "touch",
    "trackpad",
    "working",
    "wont",
    "won",
    "turn",
    "power",
}
STOP_PHRASES = [
    "how do i",
    "how to",
    "please",
    "my",
    "the",
    "a",
    "an",
]
CONNECTOR_WORDS = {"to", "for", "with", "and", "on"}
GENERIC_DEVICE_WORDS = {
    "cell",
    "cellphone",
    "device",
    "devices",
    "electronics",
    "mobile",
    "mobiles",
    "phone",
    "phones",
    "smartphone",
    "smartphones",
}


def _ifixit_headers() -> Optional[Dict[str, str]]:
    """Attach an optional iFixit App ID when one is configured."""
    app_id = get_next_ifixit_app_id()
    if not app_id:
        return None
    return {"X-App-Id": app_id}


def _extract_media_image_url(media: Dict[str, Any]) -> str:
    """Return the best displayable URL from an iFixit media item."""
    image = media.get("image") if isinstance(media.get("image"), dict) else media
    for size in ("standard", "large", "medium", "thumbnail", "original"):
        image_url = image.get(size)
        if image_url and image_url.startswith(("http://", "https://")):
            return image_url
    return ""


async def search_device(query: str) -> Optional[Dict[str, Any]]:
    """Search for a device on iFixit and return the first matching device."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        for device_query in build_device_search_queries(query):
            url = f"https://www.ifixit.com/api/2.0/search/{quote(device_query, safe='')}"
            params = {"filter": "device"}

            try:
                response = await client.get(url, params=params, headers=_ifixit_headers())
                response.raise_for_status()
                data = response.json()

                if data.get("results"):
                    device = data["results"][0]
                    return {
                        "title": device.get("title", ""),
                        "url": device.get("url", ""),
                        "wiki_title": device.get("wiki_title", device.get("title", "")),
                        "matched_query": device_query,
                    }
            except Exception as e:
                print(f"Error searching device '{device_query}': {e}")
        return None


async def list_repair_guides(device_title: str) -> List[Dict[str, Any]]:
    """Get all available repair guides for a device."""
    encoded_title = quote(device_title, safe="")
    url = f"https://www.ifixit.com/api/2.0/wikis/CATEGORY/{encoded_title}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, headers=_ifixit_headers())
            response.raise_for_status()
            data = response.json()

            guides = []
            for guide in data.get("guides", []):
                guides.append(
                    {
                        "guideid": guide.get("guideid"),
                        "title": guide.get("title", ""),
                        "subject": guide.get("subject", ""),
                        "url": guide.get("url", ""),
                        "difficulty": guide.get("difficulty", ""),
                    }
                )
            return guides
        except Exception as e:
            print(f"Error listing repair guides: {e}")
            return []


async def get_repair_guide_details(guide_id: int) -> Optional[Dict[str, Any]]:
    """Get detailed step-by-step instructions for a repair guide."""
    url = f"https://www.ifixit.com/api/2.0/guides/{guide_id}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, headers=_ifixit_headers())
            response.raise_for_status()
            data = response.json()

            cleaned_guide = {
                "title": data.get("title", ""),
                "difficulty": data.get("difficulty", ""),
                "time_required": data.get("time_required", ""),
                "source_url": data.get("url", ""),
                "introduction": data.get("introduction_rendered", ""),
                "conclusion": data.get("conclusion_rendered", ""),
                "tools": [],
                "parts": [],
                "steps": [],
            }

            for tool_item in data.get("tools", []):
                cleaned_guide["tools"].append(
                    {
                        "name": tool_item.get("text", ""),
                        "quantity": tool_item.get("quantity", 1),
                    }
                )

            for part in data.get("parts", []):
                cleaned_guide["parts"].append(
                    {
                        "name": part.get("text", ""),
                        "quantity": part.get("quantity", 1),
                    }
                )

            for step in data.get("steps", []):
                step_data = {
                    "title": step.get("title", ""),
                    "lines": [],
                    "images": [],
                }

                for line in step.get("lines", []):
                    if line.get("text_rendered"):
                        step_data["lines"].append(line["text_rendered"])

                seen_images = set()
                for media in step.get("media", {}).get("data", []):
                    image_url = _extract_media_image_url(media)
                    if image_url and image_url not in seen_images:
                        seen_images.add(image_url)
                        step_data["images"].append(image_url)

                cleaned_guide["steps"].append(step_data)

            return cleaned_guide

        except Exception as e:
            print(f"Error getting repair guide details: {e}")
            return None


def format_guide_as_markdown(guide: Dict[str, Any]) -> str:
    """Format cleaned guide data as Markdown for display."""
    md = f"# {guide['title']}\n\n"

    if guide.get("difficulty"):
        md += f"**Difficulty:** {guide['difficulty']}\n\n"
    if guide.get("time_required"):
        md += f"**Time Required:** {guide['time_required']}\n\n"
    if guide.get("source_url"):
        md += f"**Source:** {guide['source_url']}\n\n"

    if guide.get("introduction"):
        md += f"## Introduction\n\n{guide['introduction']}\n\n"

    if guide.get("tools"):
        md += "## Tools Needed\n\n"
        for tool_item in guide["tools"]:
            qty = f"({tool_item['quantity']}x) " if tool_item["quantity"] > 1 else ""
            md += f"- {qty}{tool_item['name']}\n"
        md += "\n"

    if guide.get("parts"):
        md += "## Parts Needed\n\n"
        for part in guide["parts"]:
            qty = f"({part['quantity']}x) " if part["quantity"] > 1 else ""
            md += f"- {qty}{part['name']}\n"
        md += "\n"

    if guide.get("steps"):
        md += "## Repair Steps\n\n"
        for i, step in enumerate(guide["steps"], 1):
            md += f"### Step {i}"
            if step.get("title"):
                md += f": {step['title']}"
            md += "\n\n"

            for img_url in step.get("images", []):
                md += f"![Step {i}]({img_url})\n\n"

            for line in step.get("lines", []):
                md += f"{line}\n\n"

    if guide.get("conclusion"):
        md += f"## Conclusion\n\n{guide['conclusion']}\n\n"

    return md


def _query_tokens(text: str) -> set:
    """Extract rough matching tokens from a device/issue query."""
    ignored = {
        "a",
        "an",
        "and",
        "for",
        "fix",
        "guide",
        "how",
        "issue",
        "my",
        "of",
        "on",
        "repair",
        "replace",
        "replacement",
        "the",
        "to",
        "with",
    }
    return {token for token in re.findall(r"[a-z0-9]+", text.lower()) if token not in ignored}


def _device_tokens_from_query(query: str) -> List[str]:
    """Extract likely device tokens after removing repair issue words."""
    normalized = " ".join((query or "").split())
    normalized = normalized.replace("won't", "wont").replace("doesn't", "doesnt")
    normalized = re.sub(r"[?!.:,;]+", " ", normalized)
    lowered = normalized.lower()

    for phrase in STOP_PHRASES:
        lowered = re.sub(rf"\b{re.escape(phrase)}\b", " ", lowered)

    tokens = re.findall(r"[a-z0-9+]+", lowered)
    return [
        token
        for token in tokens
        if token not in PROBLEM_WORDS and token not in CONNECTOR_WORDS
    ]


def _needs_specific_device(query: str) -> bool:
    """Return True when a query is too broad to map to an iFixit device."""
    device_tokens = _device_tokens_from_query(query)
    return not device_tokens or all(token in GENERIC_DEVICE_WORDS for token in device_tokens)


def build_device_search_queries(query: str) -> List[str]:
    """Build iFixit device-search candidates from a device plus problem query."""
    raw = " ".join((query or "").split())
    if not raw:
        return []

    candidates = [raw]
    device_tokens = _device_tokens_from_query(raw)
    if device_tokens:
        candidates.append(" ".join(device_tokens))

    # Most iFixit device searches work best as brand/model, e.g. "iPhone 13".
    if len(device_tokens) >= 2:
        candidates.append(" ".join(device_tokens[:2]))
    if len(device_tokens) >= 3:
        candidates.append(" ".join(device_tokens[:3]))

    unique_candidates = []
    seen = set()
    for candidate in candidates:
        clean_candidate = " ".join(candidate.split())
        key = clean_candidate.lower()
        if clean_candidate and key not in seen:
            seen.add(key)
            unique_candidates.append(clean_candidate)
    return unique_candidates


def _score_guide(guide: Dict[str, Any], query_tokens: set) -> int:
    """Score guide relevance using title and subject token overlap."""
    searchable = f"{guide.get('title', '')} {guide.get('subject', '')}"
    guide_tokens = _query_tokens(searchable)
    title_tokens = _query_tokens(guide.get("title", ""))
    return len(query_tokens & guide_tokens) + len(query_tokens & title_tokens)


def select_best_guide(guides: List[Dict[str, Any]], device_query: str) -> Dict[str, Any]:
    """Pick the most relevant iFixit guide for the user's issue."""
    query_tokens = _query_tokens(device_query)
    if not query_tokens:
        return guides[0]
    return max(guides, key=lambda guide: _score_guide(guide, query_tokens))


@tool
async def search_ifixit_repair_guide(device_query: str) -> str:
    """
    Search iFixit for repair guides for a specific device problem.

    Args:
        device_query: Description of the device and issue.

    Returns:
        Formatted repair guide in Markdown, or a not-found message.
    """
    if _needs_specific_device(device_query):
        return (
            "Need device model: this repair request is too broad for a verified iFixit guide. "
            "Please include the exact phone model, for example `iPhone 13 screen replacement`, "
            "`Samsung Galaxy S21 screen replacement`, or `Google Pixel 7 cracked screen`."
        )

    device = await search_device(device_query)

    if not device:
        return f"Not found: no device found for '{device_query}' on iFixit. Consider using web search instead."

    guides = await list_repair_guides(device["wiki_title"])

    if not guides:
        return f"Not found: no repair guides found for {device['wiki_title']} on iFixit. Consider using web search instead."

    selected_guide = select_best_guide(guides, device_query)
    guide_details = await get_repair_guide_details(selected_guide["guideid"])

    if not guide_details:
        return f"Error: could not retrieve guide details for {selected_guide['title']}."

    guide_details["source_url"] = guide_details.get("source_url") or selected_guide.get("url", "")
    return format_guide_as_markdown(guide_details)
