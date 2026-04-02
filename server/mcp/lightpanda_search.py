"""
Web Search Implementation

Provides web search capabilities using multiple search engines.
Uses httpx for async HTTP requests and lxml for fast HTML parsing.
"""

import asyncio
import logging
import hashlib
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from urllib.parse import quote_plus, urljoin, parse_qs, urlparse
import re

import httpx
from lxml import html

logger = logging.getLogger(__name__)

# User agent to mimic a real browser
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


class LightpandaSearch:
    """
    Web search implementation using multiple search engines.
    
    Supports:
    - DuckDuckGo (default, no API key required)
    - Google (requires scraping or API key)
    - Bing (requires scraping or API key)
    
    Uses lxml for fast HTML parsing.
    """
    
    def __init__(self, timeout: float = 10.0, max_retries: int = 3):
        """
        Initialize search engine.
        
        Args:
            timeout: Request timeout in seconds
            max_retries: Maximum retry attempts for failed requests
        """
        self.timeout = timeout
        self.max_retries = max_retries
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }
    
    async def search(
        self,
        query: str,
        num_results: int = 5,
        engine: str = "duckduckgo"
    ) -> List[Dict]:
        """
        Search the web using specified search engine.
        
        Args:
            query: Search query string
            num_results: Number of results to return
            engine: Search engine to use (duckduckgo, google, bing)
            
        Returns:
            List of search results with title, url, snippet
        """
        if engine == "duckduckgo":
            return await self._search_duckduckgo(query, num_results)
        elif engine == "google":
            return await self._search_google(query, num_results)
        elif engine == "bing":
            return await self._search_bing(query, num_results)
        else:
            logger.warning(f"Unknown engine {engine}, falling back to DuckDuckGo")
            return await self._search_duckduckgo(query, num_results)
    
    async def _search_duckduckgo(self, query: str, num_results: int) -> List[Dict]:
        """Search using DuckDuckGo HTML interface."""
        results = []
        
        # DuckDuckGo HTML search URL
        url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                
                # Parse with lxml
                tree = html.fromstring(response.text)
                
                # Find search results using XPath
                result_links = tree.xpath('//a[@class="result__a"]')
                result_snippets = tree.xpath('//a[@class="result__snippet"]')
                
                for i, link in enumerate(result_links):
                    if i >= num_results:
                        break
                    
                    title = link.text_content().strip()
                    href = link.get("href", "")
                    
                    # Get snippet if available
                    snippet_text = ""
                    if i < len(result_snippets):
                        snippet_text = result_snippets[i].text_content().strip()
                    
                    # Extract actual URL from DuckDuckGo redirect
                    if "uddg=" in href:
                        parsed = parse_qs(urlparse(href).query)
                        actual_url = parsed.get("uddg", [href])[0]
                    else:
                        actual_url = href
                    
                    if title and actual_url:
                        results.append({
                            "title": title,
                            "url": actual_url,
                            "snippet": snippet_text,
                            "source": "duckduckgo",
                            "rank": i + 1
                        })
                
                logger.info(f"DuckDuckGo search returned {len(results)} results for: {query}")
                
        except Exception as e:
            logger.error(f"DuckDuckGo search failed: {e}")
            results = await self._search_fallback(query, num_results)
        
        return results
    
    async def _search_google(self, query: str, num_results: int) -> List[Dict]:
        """Search using Google (scraping, may be rate limited)."""
        results = []
        
        url = f"https://www.google.com/search?q={quote_plus(query)}&num={num_results}"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                
                # Parse with lxml
                tree = html.fromstring(response.text)
                
                # Find search result divs using XPath
                search_divs = tree.xpath('//div[@class="g"]')
                
                for i, div in enumerate(search_divs):
                    if i >= num_results:
                        break
                    
                    # Extract title and URL
                    title_elems = div.xpath('.//h3')
                    link_elems = div.xpath('.//a[@href]')
                    snippet_elems = div.xpath('.//div[@class="VwiC3b"]')
                    
                    if title_elems and link_elems:
                        title = title_elems[0].text_content().strip()
                        result_url = link_elems[0].get("href", "")
                        snippet = snippet_elems[0].text_content().strip() if snippet_elems else ""
                        
                        if result_url.startswith("/url?q="):
                            result_url = result_url.split("/url?q=")[1].split("&")[0]
                        
                        if title and result_url and result_url.startswith("http"):
                            results.append({
                                "title": title,
                                "url": result_url,
                                "snippet": snippet,
                                "source": "google",
                                "rank": i + 1
                            })
                
                logger.info(f"Google search returned {len(results)} results for: {query}")
                
        except Exception as e:
            logger.error(f"Google search failed: {e}, falling back to DuckDuckGo")
            results = await self._search_duckduckgo(query, num_results)
        
        return results
    
    async def _search_bing(self, query: str, num_results: int) -> List[Dict]:
        """Search using Bing."""
        results = []
        
        url = f"https://www.bing.com/search?q={quote_plus(query)}&count={num_results}"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                
                # Parse with lxml
                tree = html.fromstring(response.text)
                
                # Find Bing result elements using XPath
                result_items = tree.xpath('//li[@class="b_algo"]')
                
                for i, item in enumerate(result_items):
                    if i >= num_results:
                        break
                    
                    title_elems = item.xpath('.//h2')
                    link_elems = item.xpath('.//a[@href]')
                    snippet_elems = item.xpath('.//p')
                    
                    if title_elems and link_elems:
                        title = title_elems[0].text_content().strip()
                        result_url = link_elems[0].get("href", "")
                        snippet = snippet_elems[0].text_content().strip() if snippet_elems else ""
                        
                        if title and result_url:
                            results.append({
                                "title": title,
                                "url": result_url,
                                "snippet": snippet,
                                "source": "bing",
                                "rank": i + 1
                            })
                
                logger.info(f"Bing search returned {len(results)} results for: {query}")
                
        except Exception as e:
            logger.error(f"Bing search failed: {e}, falling back to DuckDuckGo")
            results = await self._search_duckduckgo(query, num_results)
        
        return results
    
    async def _search_fallback(self, query: str, num_results: int) -> List[Dict]:
        """Fallback search using a simple web search API."""
        logger.warning("All search engines failed, returning empty results")
        return []
    
    def get_cache_key(self, query: str, engine: str) -> str:
        """Generate cache key for a search query."""
        content = f"{query}:{engine}"
        return hashlib.md5(content.encode()).hexdigest()
