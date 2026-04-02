"""
MCP Server for DocTalk - Web Search and Content Extraction

This module implements an MCP (Model Context Protocol) server that provides
web search and content extraction capabilities using Lightpanda.

Tools provided:
- web_search: Search the web for information
- extract_content: Extract main content from a URL
- search_and_extract: Search web and extract content from top results
"""

import json
import logging
import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class MCPToolName(str, Enum):
    """Available MCP tools."""
    WEB_SEARCH = "web_search"
    EXTRACT_CONTENT = "extract_content"
    SEARCH_AND_EXTRACT = "search_and_extract"


@dataclass
class MCPToolResult:
    """Result from an MCP tool execution."""
    success: bool
    data: Any
    error: Optional[str] = None
    metadata: Optional[Dict] = None


class MCPServer:
    """
    MCP Server implementation for DocTalk.
    
    Provides web search and content extraction tools that can be called
    from the RAG pipeline to supplement document search with real-time web data.
    """
    
    def __init__(self):
        """Initialize the MCP server with search and extraction capabilities."""
        from mcp.lightpanda_search import LightpandaSearch
        from mcp.lightpanda_extractor import LightpandaExtractor
        
        self.search_engine = LightpandaSearch()
        self.extractor = LightpandaExtractor()
        self.tools = self._register_tools()
        
        logger.info("MCP Server initialized with %d tools", len(self.tools))
    
    def _register_tools(self) -> Dict[str, Dict]:
        """Register available MCP tools with their schemas."""
        return {
            MCPToolName.WEB_SEARCH: {
                "name": "web_search",
                "description": "Search the web for information using multiple search engines",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query text"
                        },
                        "num_results": {
                            "type": "integer",
                            "description": "Number of results to return",
                            "default": 5
                        },
                        "search_engine": {
                            "type": "string",
                            "enum": ["duckduckgo", "google", "bing"],
                            "description": "Search engine to use",
                            "default": "duckduckgo"
                        }
                    },
                    "required": ["query"]
                }
            },
            MCPToolName.EXTRACT_CONTENT: {
                "name": "extract_content",
                "description": "Extract main content from a web page URL",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": {
                            "type": "string",
                            "description": "URL to extract content from"
                        },
                        "include_structure": {
                            "type": "boolean",
                            "description": "Preserve heading/list structure",
                            "default": True
                        }
                    },
                    "required": ["url"]
                }
            },
            MCPToolName.SEARCH_AND_EXTRACT: {
                "name": "search_and_extract",
                "description": "Search web and extract full content from top results",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query"
                        },
                        "num_results": {
                            "type": "integer",
                            "description": "Number of results to extract",
                            "default": 3
                        },
                        "max_content_length": {
                            "type": "integer",
                            "description": "Maximum content length per result",
                            "default": 5000
                        }
                    },
                    "required": ["query"]
                }
            }
        }
    
    def get_tools(self) -> List[Dict]:
        """Return list of available tools with their schemas."""
        return list(self.tools.values())
    
    async def execute_tool(self, tool_name: str, parameters: Dict) -> MCPToolResult:
        """
        Execute an MCP tool with given parameters.
        
        Args:
            tool_name: Name of the tool to execute
            parameters: Tool parameters
            
        Returns:
            MCPToolResult with execution results
        """
        try:
            if tool_name == MCPToolName.WEB_SEARCH:
                return await self._execute_web_search(parameters)
            elif tool_name == MCPToolName.EXTRACT_CONTENT:
                return await self._execute_extract_content(parameters)
            elif tool_name == MCPToolName.SEARCH_AND_EXTRACT:
                return await self._execute_search_and_extract(parameters)
            else:
                return MCPToolResult(
                    success=False,
                    data=None,
                    error=f"Unknown tool: {tool_name}"
                )
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            return MCPToolResult(
                success=False,
                data=None,
                error=str(e)
            )
    
    async def _execute_web_search(self, params: Dict) -> MCPToolResult:
        """Execute web search tool."""
        query = params.get("query")
        num_results = params.get("num_results", 5)
        search_engine = params.get("search_engine", "duckduckgo")
        
        results = await self.search_engine.search(
            query=query,
            num_results=num_results,
            engine=search_engine
        )
        
        return MCPToolResult(
            success=True,
            data={
                "query": query,
                "results": results,
                "total_results": len(results),
                "search_engine": search_engine
            },
            metadata={"tool": "web_search"}
        )
    
    async def _execute_extract_content(self, params: Dict) -> MCPToolResult:
        """Execute content extraction tool."""
        url = params.get("url")
        include_structure = params.get("include_structure", True)
        
        content = await self.extractor.extract(
            url=url,
            include_structure=include_structure
        )
        
        return MCPToolResult(
            success=True,
            data=content,
            metadata={"tool": "extract_content", "url": url}
        )
    
    async def _execute_search_and_extract(self, params: Dict) -> MCPToolResult:
        """Execute combined search and extraction."""
        query = params.get("query")
        num_results = params.get("num_results", 3)
        max_content_length = params.get("max_content_length", 5000)
        
        # First, search
        search_results = await self.search_engine.search(
            query=query,
            num_results=num_results
        )
        
        # Then, extract content from each result
        extracted_results = []
        for result in search_results:
            try:
                content = await self.extractor.extract(
                    url=result["url"],
                    include_structure=True
                )
                
                # Truncate content if needed
                full_content = content.get("content", "")
                if len(full_content) > max_content_length:
                    full_content = full_content[:max_content_length] + "..."
                
                extracted_results.append({
                    **result,
                    "full_content": full_content,
                    "sections": content.get("sections", {}),
                    "metadata": content.get("metadata", {})
                })
            except Exception as e:
                logger.warning(f"Failed to extract content from {result['url']}: {e}")
                extracted_results.append({
                    **result,
                    "full_content": result.get("snippet", ""),
                    "extraction_error": str(e)
                })
        
        return MCPToolResult(
            success=True,
            data={
                "query": query,
                "results": extracted_results,
                "total_results": len(extracted_results)
            },
            metadata={"tool": "search_and_extract"}
        )


# Singleton instance
_mcp_server_instance: Optional[MCPServer] = None


def get_mcp_server() -> MCPServer:
    """Get or create the MCP server singleton instance."""
    global _mcp_server_instance
    if _mcp_server_instance is None:
        _mcp_server_instance = MCPServer()
    return _mcp_server_instance


async def check_mcp_health() -> Dict:
    """Check MCP server health status."""
    try:
        server = get_mcp_server()
        tools = server.get_tools()
        return {
            "status": "online",
            "tools_available": len(tools),
            "tool_names": [t["name"] for t in tools]
        }
    except Exception as e:
        return {
            "status": "offline",
            "error": str(e)
        }
