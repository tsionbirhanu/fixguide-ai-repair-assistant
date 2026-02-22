"""
Web Search Fallback Tool using Tavily API
Used when iFixit doesn't have a repair guide
"""

from typing import Optional
from langchain_core.tools import tool
from tavily import TavilyClient
from app.core.config import settings


@tool
async def search_web_for_repair_solution(query: str) -> str:
    """
    Search the web for repair solutions when iFixit doesn't have an official guide.
    This is a fallback tool that searches community forums, YouTube, and other sources.
    
    Args:
        query: The repair problem to search for (e.g., "how to fix PS5 overheating issue")
    
    Returns:
        Formatted search results with links and summaries
    """
    if not settings.TAVILY_API_KEY or settings.TAVILY_API_KEY == "your_tavily_api_key_here":
        return "❌ Web search is not configured. Please add your Tavily API key to use this feature."
    
    try:
        # Initialize Tavily client
        client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        
        # Perform search with focus on repair/fix content
        search_query = f"how to repair {query} tutorial guide"
        results = client.search(
            query=search_query,
            search_depth="advanced",
            max_results=5,
            include_domains=["youtube.com", "reddit.com", "instructables.com"]
        )
        
        # Format results as Markdown
        markdown = f"# Web Search Results for: {query}\n\n"
        markdown += "⚠️ **Note:** These are community solutions. Please verify before attempting repairs.\n\n"
        
        if results.get("results"):
            for i, result in enumerate(results["results"], 1):
                title = result.get("title", "No title")
                url = result.get("url", "")
                content = result.get("content", "No description available")
                
                markdown += f"## {i}. {title}\n\n"
                markdown += f"**Source:** {url}\n\n"
                markdown += f"{content}\n\n"
                markdown += "---\n\n"
            
            return markdown
        else:
            return f"❌ No web results found for '{query}'. Please try rephrasing your question."
            
    except Exception as e:
        return f"❌ Error searching web: {str(e)}"
