"""
Web Search Fallback Tool using Tavily API.
Used when iFixit does not have a repair guide.
"""

from langchain_core.tools import tool
from tavily import TavilyClient

from app.core.config import settings


@tool
async def search_web_for_repair_solution(query: str) -> str:
    """
    Search the web for repair solutions when iFixit does not have an official guide.

    Args:
        query: The repair problem to search for.

    Returns:
        Formatted search results with links and summaries.
    """
    if not settings.TAVILY_API_KEY or settings.TAVILY_API_KEY == "your_tavily_api_key_here":
        return "Web search is not configured. Add TAVILY_API_KEY to enable this fallback."

    try:
        client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        search_query = f"how to repair {query} tutorial guide"
        results = client.search(
            query=search_query,
            search_depth="advanced",
            max_results=5,
            include_domains=["youtube.com", "reddit.com", "instructables.com"],
        )

        markdown = f"# Web Search Results for: {query}\n\n"
        markdown += "Warning: these are community solutions. Verify them before attempting repairs.\n\n"

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

        return f"Not found: no web results found for '{query}'. Please try rephrasing your question."

    except Exception as e:
        return f"Error searching web: {str(e)}"
