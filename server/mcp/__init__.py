"""
MCP Module for DocTalk

Provides web search and content extraction capabilities via MCP (Model Context Protocol).
"""

from mcp.mcp_server import MCPServer, get_mcp_server, check_mcp_health, MCPToolName
from mcp.mcp_client import MCPClient, get_mcp_client, format_web_results_for_context, format_hybrid_context
from mcp.lightpanda_search import LightpandaSearch
from mcp.lightpanda_extractor import LightpandaExtractor

__all__ = [
    "MCPServer",
    "MCPClient",
    "LightpandaSearch",
    "LightpandaExtractor",
    "get_mcp_server",
    "get_mcp_client",
    "check_mcp_health",
    "MCPToolName",
    "format_web_results_for_context",
    "format_hybrid_context"
]
