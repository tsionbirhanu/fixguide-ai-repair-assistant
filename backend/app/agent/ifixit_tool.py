"""
iFixit API Tool for LangGraph Agent
Searches and retrieves verified repair guides from iFixit.com.
"""

from typing import Any, Dict, List, Optional
from urllib.parse import quote
import re

import httpx
from langchain_core.tools import tool


async def search_device(query: str) -> Optional[Dict[str, Any]]:
    """Search for a device on iFixit and return the first matching device."""
    url = f"https://www.ifixit.com/api/2.0/search/{quote(query, safe='')}"
    params = {"filter": "device"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if data.get("results"):
                device = data["results"][0]
                return {
                    "title": device.get("title", ""),
                    "url": device.get("url", ""),
                    "wiki_title": device.get("wiki_title", device.get("title", "")),
                }
            return None
        except Exception as e:
            print(f"Error searching device: {e}")
            return None


async def list_repair_guides(device_title: str) -> List[Dict[str, Any]]:
    """Get all available repair guides for a device."""
    encoded_title = quote(device_title, safe="")
    url = f"https://www.ifixit.com/api/2.0/wikis/CATEGORY/{encoded_title}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url)
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
            response = await client.get(url)
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

                for media in step.get("media", {}).get("data", []):
                    if media.get("image"):
                        image_url = media["image"].get("standard", "")
                        if image_url:
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
