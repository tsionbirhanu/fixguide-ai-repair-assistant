"""
Web Search Fallback Tool using Tavily API.
Used when iFixit does not have a repair guide.
"""

from langchain_core.tools import tool
from tavily import TavilyClient

from app.core.api_keys import get_next_tavily_api_key


def _extract_image_urls(images) -> list[str]:
    """Normalize Tavily image results into URL strings."""
    image_urls = []
    for image in images or []:
        if isinstance(image, str):
            url = image
        elif isinstance(image, dict):
            url = image.get("url") or image.get("src") or image.get("image_url")
        else:
            url = ""

        if url and url.startswith(("http://", "https://")):
            image_urls.append(url)

    return image_urls


@tool
async def search_web_for_repair_solution(query: str) -> str:
    """
    Search the web for repair solutions when iFixit does not have an official guide.

    Args:
        query: The repair problem to search for.

    Returns:
        Formatted search results with links and summaries.
    """
    tavily_api_key = get_next_tavily_api_key()
    if not tavily_api_key:
        return "Web search is not configured. Add TAVILY_API_KEY or TAVILY_API_KEYS to enable this fallback."

    try:
        client = TavilyClient(api_key=tavily_api_key)
        search_query = f"how to repair {query} tutorial guide"
        results = client.search(
            query=search_query,
            search_depth="advanced",
            max_results=5,
            include_images=True,
            include_domains=["youtube.com", "reddit.com", "instructables.com"],
        )

        markdown = f"# Web Search Results for: {query}\n\n"
        markdown += "Warning: these are community solutions. Verify them before attempting repairs.\n\n"
        image_urls = _extract_image_urls(results.get("images"))

        if image_urls:
            markdown += "## Related Images\n\n"
            for i, image_url in enumerate(image_urls[:4], 1):
                markdown += f"![Repair reference {i}]({image_url})\n\n"

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
        error_type = type(e).__name__
        detail = str(e).strip() or error_type
        if error_type == "ForbiddenError":
            detail = (
                "Tavily rejected the request (ForbiddenError). "
                "Check that TAVILY_API_KEY is valid, active, and has search access."
            )
        return f"Error searching web: {detail}"
