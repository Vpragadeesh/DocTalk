"""
MCP Client for DocTalk

Client to interact with the MCP server from FastAPI endpoints.
Handles request/response formatting and error handling.
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from mcp.mcp_server import get_mcp_server, MCPToolResult, MCPToolName

logger = logging.getLogger(__name__)


class MCPClient:
    """
    Client to interact with the MCP server.
    
    Provides a simple interface for calling MCP tools from FastAPI endpoints.
    """
    
    def __init__(self, timeout: float = 30.0):
        """
        Initialize MCP client.
        
        Args:
            timeout: Default timeout for tool calls
        """
        self.timeout = timeout
    
    async def web_search(
        self,
        query: str,
        num_results: int = 5,
        search_engine: str = "duckduckgo"
    ) -> Dict[str, Any]:
        """
        Execute web search via MCP.
        
        Args:
            query: Search query
            num_results: Number of results
            search_engine: Search engine to use
            
        Returns:
            Search results
        """
        server = get_mcp_server()
        result = await asyncio.wait_for(
            server.execute_tool(
                MCPToolName.WEB_SEARCH,
                {
                    "query": query,
                    "num_results": num_results,
                    "search_engine": search_engine
                }
            ),
            timeout=self.timeout
        )
        
        if not result.success:
            raise Exception(f"Web search failed: {result.error}")
        
        return result.data
    
    async def extract_content(
        self,
        url: str,
        include_structure: bool = True
    ) -> Dict[str, Any]:
        """
        Extract content from URL via MCP.
        
        Args:
            url: URL to extract from
            include_structure: Preserve structure
            
        Returns:
            Extracted content
        """
        server = get_mcp_server()
        result = await asyncio.wait_for(
            server.execute_tool(
                MCPToolName.EXTRACT_CONTENT,
                {
                    "url": url,
                    "include_structure": include_structure
                }
            ),
            timeout=self.timeout
        )
        
        if not result.success:
            raise Exception(f"Content extraction failed: {result.error}")
        
        return result.data
    
    async def search_and_extract(
        self,
        query: str,
        num_results: int = 3,
        max_content_length: int = 5000
    ) -> Dict[str, Any]:
        """
        Search web and extract content from results.
        
        Args:
            query: Search query
            num_results: Number of results to extract
            max_content_length: Max content per result
            
        Returns:
            Search results with extracted content
        """
        server = get_mcp_server()
        result = await asyncio.wait_for(
            server.execute_tool(
                MCPToolName.SEARCH_AND_EXTRACT,
                {
                    "query": query,
                    "num_results": num_results,
                    "max_content_length": max_content_length
                }
            ),
            timeout=self.timeout
        )
        
        if not result.success:
            raise Exception(f"Search and extract failed: {result.error}")
        
        return result.data
    
    def get_available_tools(self) -> List[Dict]:
        """Get list of available MCP tools."""
        server = get_mcp_server()
        return server.get_tools()


# Singleton instance
_mcp_client_instance: Optional[MCPClient] = None


def get_mcp_client() -> MCPClient:
    """Get or create the MCP client singleton instance."""
    global _mcp_client_instance
    if _mcp_client_instance is None:
        _mcp_client_instance = MCPClient()
    return _mcp_client_instance


async def format_web_results_for_context(
    results: List[Dict],
    max_total_length: int = 10000
) -> str:
    """
    Format web search results for LLM context.
    
    Args:
        results: List of search results
        max_total_length: Maximum total context length
        
    Returns:
        Formatted context string
    """
    context_parts = []
    current_length = 0
    
    for i, result in enumerate(results):
        # Format result
        title = result.get("title", "Untitled")
        url = result.get("url", "")
        content = result.get("full_content", result.get("snippet", ""))
        
        # Truncate content if needed
        available_length = max_total_length - current_length - 200
        if len(content) > available_length:
            content = content[:available_length] + "..."
        
        formatted = f"""
--- WEB SOURCE {i + 1} ---
Title: {title}
URL: {url}

{content}
"""
        context_parts.append(formatted)
        current_length += len(formatted)
        
        if current_length >= max_total_length:
            break
    
    return "\n".join(context_parts)


async def format_hybrid_context(
    doc_results: List[Dict],
    web_results: List[Dict],
    max_total_length: int = 15000
) -> str:
    """
    Format combined document and web results for LLM context.
    
    Args:
        doc_results: Document search results
        web_results: Web search results
        max_total_length: Maximum total context length
        
    Returns:
        Formatted context string with both sources
    """
    context_parts = []
    
    # Add document results first
    if doc_results:
        context_parts.append("=== UPLOADED DOCUMENTS ===\n")
        for i, doc in enumerate(doc_results):
            filename = doc.get("filename", "Unknown")
            page = doc.get("page", "?")
            content = doc.get("full_text", doc.get("text", ""))[:2000]
            
            context_parts.append(f"""
--- DOCUMENT {i + 1}: {filename} (Page {page}) ---
{content}
""")
    
    # Add web results
    if web_results:
        context_parts.append("\n=== WEB SOURCES ===\n")
        for i, result in enumerate(web_results):
            title = result.get("title", "Untitled")
            url = result.get("url", "")
            content = result.get("full_content", result.get("snippet", ""))[:2000]
            
            context_parts.append(f"""
--- WEB SOURCE {i + 1}: {title} ---
URL: {url}
{content}
""")
    
    full_context = "\n".join(context_parts)
    
    # Truncate if too long
    if len(full_context) > max_total_length:
        full_context = full_context[:max_total_length] + "\n... [Content truncated]"
    
    return full_context
