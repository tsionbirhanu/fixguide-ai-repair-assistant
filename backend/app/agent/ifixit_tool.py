"""
iFixit API Tool for LangGraph Agent
Searches and retrieves verified repair guides from iFixit.com
"""

import httpx
from typing import Dict, List, Optional, Any
from langchain_core.tools import tool


async def search_device(query: str) -> Optional[Dict[str, Any]]:
    """
    Step 1: Search for a device on iFixit
    Returns the first matching device
    """
    url = f"https://www.ifixit.com/api/2.0/search/{query}"
    params = {"filter": "device"}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("results") and len(data["results"]) > 0:
                # Return the first matching device
                device = data["results"][0]
                return {
                    "title": device.get("title", ""),
                    "url": device.get("url", ""),
                    "wiki_title": device.get("wiki_title", device.get("title", ""))
                }
            return None
        except Exception as e:
            print(f"Error searching device: {e}")
            return None


async def list_repair_guides(device_title: str) -> List[Dict[str, Any]]:
    """
    Step 2: Get all available repair guides for a device
    """
    # URL encode the device title
    encoded_title = device_title.replace(" ", "+")
    url = f"https://www.ifixit.com/api/2.0/wikis/CATEGORY/{encoded_title}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            guides = []
            if data.get("guides"):
                for guide in data["guides"]:
                    guides.append({
                        "guideid": guide.get("guideid"),
                        "title": guide.get("title", ""),
                        "subject": guide.get("subject", ""),
                        "url": guide.get("url", ""),
                        "difficulty": guide.get("difficulty", ""),
                    })
            return guides
        except Exception as e:
            print(f"Error listing repair guides: {e}")
            return []


async def get_repair_guide_details(guide_id: int) -> Optional[Dict[str, Any]]:
    """
    Step 3: Get detailed step-by-step instructions for a repair guide
    This function cleans the data to return only essential information
    """
    url = f"https://www.ifixit.com/api/2.0/guides/{guide_id}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            # Clean and extract only necessary information
            cleaned_guide = {
                "title": data.get("title", ""),
                "difficulty": data.get("difficulty", ""),
                "time_required": data.get("time_required", ""),
                "introduction": data.get("introduction_rendered", ""),
                "conclusion": data.get("conclusion_rendered", ""),
                "tools": [],
                "parts": [],
                "steps": []
            }
            
            # Extract tools
            for tool_item in data.get("tools", []):
                cleaned_guide["tools"].append({
                    "name": tool_item.get("text", ""),
                    "quantity": tool_item.get("quantity", 1)
                })
            
            # Extract parts
            for part in data.get("parts", []):
                cleaned_guide["parts"].append({
                    "name": part.get("text", ""),
                    "quantity": part.get("quantity", 1)
                })
            
            # Extract steps with images and text
            for step in data.get("steps", []):
                step_data = {
                    "title": step.get("title", ""),
                    "lines": [],
                    "images": []
                }
                
                # Extract text lines
                for line in step.get("lines", []):
                    if line.get("text_rendered"):
                        step_data["lines"].append(line["text_rendered"])
                
                # Extract images
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
    """
    Format the cleaned guide data as Markdown for display
    """
    md = f"# {guide['title']}\n\n"
    
    # Add metadata
    if guide.get('difficulty'):
        md += f"**Difficulty:** {guide['difficulty']}\n\n"
    if guide.get('time_required'):
        md += f"**Time Required:** {guide['time_required']}\n\n"
    
    # Add introduction
    if guide.get('introduction'):
        md += f"## Introduction\n\n{guide['introduction']}\n\n"
    
    # Add tools
    if guide.get('tools'):
        md += "## Tools Needed\n\n"
        for tool in guide['tools']:
            qty = f"({tool['quantity']}x) " if tool['quantity'] > 1 else ""
            md += f"- {qty}{tool['name']}\n"
        md += "\n"
    
    # Add parts
    if guide.get('parts'):
        md += "## Parts Needed\n\n"
        for part in guide['parts']:
            qty = f"({part['quantity']}x) " if part['quantity'] > 1 else ""
            md += f"- {qty}{part['name']}\n"
        md += "\n"
    
    # Add steps
    if guide.get('steps'):
        md += "## Repair Steps\n\n"
        for i, step in enumerate(guide['steps'], 1):
            md += f"### Step {i}"
            if step.get('title'):
                md += f": {step['title']}"
            md += "\n\n"
            
            # Add step images
            for img_url in step.get('images', []):
                md += f"![Step {i}]({img_url})\n\n"
            
            # Add step instructions
            for line in step.get('lines', []):
                md += f"{line}\n\n"
    
    # Add conclusion
    if guide.get('conclusion'):
        md += f"## Conclusion\n\n{guide['conclusion']}\n\n"
    
    return md


@tool
async def search_ifixit_repair_guide(device_query: str) -> str:
    """
    Search iFixit for repair guides for a specific device problem.
    
    Args:
        device_query: Description of the device and issue (e.g., "PS5 fan not working", "iPhone 13 screen replacement")
    
    Returns:
        Formatted repair guide in Markdown, or error message if not found
    """
    # Step 1: Find the device
    device = await search_device(device_query)
    
    if not device:
        return f"❌ No device found for '{device_query}' on iFixit. Consider using web search instead."
    
    device_title = device["wiki_title"]
    
    # Step 2: List available guides
    guides = await list_repair_guides(device_title)
    
    if not guides:
        return f"❌ No repair guides found for {device_title} on iFixit. Consider using web search instead."
    
    # Find the most relevant guide based on query
    # For now, we'll return the first guide, but you could implement better matching
    selected_guide = guides[0]
    
    # Step 3: Get detailed guide
    guide_details = await get_repair_guide_details(selected_guide["guideid"])
    
    if not guide_details:
        return f"❌ Could not retrieve guide details for {selected_guide['title']}"
    
    # Format as Markdown
    markdown_guide = format_guide_as_markdown(guide_details)
    
    return markdown_guide
