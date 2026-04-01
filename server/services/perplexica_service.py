"""
Perplexica AI Search Service.

Provides web search capabilities through Perplexica API with:
- Multiple focus modes (Academic, Reddit, YouTube, etc.)
- Result caching with TTL
- Source normalization
- Error handling and fallbacks
"""

import os
import json
import logging
import hashlib
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

import httpx
from dotenv import load_dotenv

from config.perplexica import (
    get_perplexica_config, FocusMode, PerplexicaConfig,
    PERPLEXICA_ENDPOINTS
)

load_dotenv()
logger = logging.getLogger(__name__)


@dataclass
class PerplexicaSource:
    """A normalized source from Perplexica search."""
    title: str
    url: str
    snippet: str
    relevance: float = 0.8
    metadata: Dict = field(default_factory=dict)


@dataclass
class PerplexicaResult:
    """Result from a Perplexica search."""
    answer: str
    sources: List[PerplexicaSource]
    query: str
    focus_mode: FocusMode
    follow_up_questions: List[str] = field(default_factory=list)
    search_time_ms: int = 0
    from_cache: bool = False
    error: Optional[str] = None


class ResultCache:
    """In-memory cache for Perplexica results with TTL."""
    
    def __init__(self, ttl_seconds: int = 1800):
        self._cache: Dict[str, tuple] = {}  # key -> (result, expiry)
        self._ttl = ttl_seconds
    
    def _hash_key(self, query: str, focus_mode: str) -> str:
        """Generate cache key from query and focus mode."""
        content = f"{query.lower().strip()}:{focus_mode}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def get(self, query: str, focus_mode: str) -> Optional[PerplexicaResult]:
        """Get cached result if valid."""
        key = self._hash_key(query, focus_mode)
        if key in self._cache:
            result, expiry = self._cache[key]
            if datetime.now() < expiry:
                result.from_cache = True
                return result
            else:
                del self._cache[key]
        return None
    
    def set(self, query: str, focus_mode: str, result: PerplexicaResult):
        """Cache a result."""
        key = self._hash_key(query, focus_mode)
        expiry = datetime.now() + timedelta(seconds=self._ttl)
        self._cache[key] = (result, expiry)
    
    def clear(self):
        """Clear all cached results."""
        self._cache.clear()
    
    def cleanup(self):
        """Remove expired entries."""
        now = datetime.now()
        expired = [k for k, (_, exp) in self._cache.items() if now >= exp]
        for key in expired:
            del self._cache[key]


class PerplexicaService:
    """
    Service for interacting with Perplexica AI Search.
    
    Features:
    - Multiple search focus modes
    - Result caching
    - Source normalization
    - Retry logic with exponential backoff
    """
    
    def __init__(self, config: Optional[PerplexicaConfig] = None):
        self.config = config or get_perplexica_config()
        self._cache = ResultCache(self.config.cache_ttl)
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.config.api_url,
                timeout=httpx.Timeout(self.config.timeout)
            )
        return self._client
    
    async def close(self):
        """Close HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
    
    async def check_health(self) -> Dict[str, Any]:
        """Check if Perplexica API is available."""
        try:
            client = await self._get_client()
            response = await client.get("/api/config")
            
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "api_url": self.config.api_url,
                    "enabled": self.config.enabled
                }
            else:
                return {
                    "status": "unhealthy",
                    "error": f"API returned status {response.status_code}"
                }
        except Exception as e:
            logger.warning(f"Perplexica health check failed: {e}")
            return {
                "status": "unavailable",
                "error": str(e)
            }
    
    async def search(
        self,
        query: str,
        focus_mode: FocusMode = None,
        use_cache: bool = True,
        history: List[Dict] = None
    ) -> PerplexicaResult:
        """
        Perform a search using Perplexica.
        
        Args:
            query: Search query
            focus_mode: Search focus mode
            use_cache: Whether to use cached results
            history: Conversation history for context
            
        Returns:
            PerplexicaResult with answer and sources
        """
        focus_mode = focus_mode or self.config.default_focus_mode
        start_time = datetime.now()
        
        # Check cache first
        if use_cache:
            cached = self._cache.get(query, focus_mode.value)
            if cached:
                logger.info(f"Perplexica cache hit for: {query[:50]}...")
                return cached
        
        # Check if service is enabled
        if not self.config.enabled:
            return PerplexicaResult(
                answer="",
                sources=[],
                query=query,
                focus_mode=focus_mode,
                error="Perplexica search is disabled"
            )
        
        try:
            client = await self._get_client()
            
            # Build request payload
            payload = {
                "chatModel": {
                    "provider": "openai",  # Perplexica's internal model
                    "model": "gpt-4o-mini"
                },
                "embeddingModel": {
                    "provider": "openai",
                    "model": "text-embedding-3-small"
                },
                "query": query,
                "focusMode": focus_mode.value,
                "optimizationMode": "balanced",
                "history": history or []
            }
            
            logger.info(f"Perplexica search: {query[:50]}... (mode: {focus_mode.value})")
            
            response = await client.post(
                PERPLEXICA_ENDPOINTS["search"],
                json=payload
            )
            
            if response.status_code != 200:
                error_msg = f"Perplexica API error: {response.status_code}"
                logger.error(error_msg)
                return PerplexicaResult(
                    answer="",
                    sources=[],
                    query=query,
                    focus_mode=focus_mode,
                    error=error_msg
                )
            
            # Parse response
            data = response.json()
            result = self._parse_response(data, query, focus_mode)
            
            # Calculate search time
            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            result.search_time_ms = int(elapsed)
            
            # Cache the result
            if use_cache and not result.error:
                self._cache.set(query, focus_mode.value, result)
            
            logger.info(f"Perplexica returned {len(result.sources)} sources in {result.search_time_ms}ms")
            return result
            
        except httpx.TimeoutException:
            logger.error(f"Perplexica timeout for query: {query[:50]}...")
            return PerplexicaResult(
                answer="",
                sources=[],
                query=query,
                focus_mode=focus_mode,
                error="Search timed out"
            )
        except Exception as e:
            logger.error(f"Perplexica search error: {e}", exc_info=True)
            return PerplexicaResult(
                answer="",
                sources=[],
                query=query,
                focus_mode=focus_mode,
                error=str(e)
            )
    
    def _parse_response(
        self,
        data: Dict,
        query: str,
        focus_mode: FocusMode
    ) -> PerplexicaResult:
        """Parse Perplexica API response into normalized format."""
        answer = data.get("message", "")
        raw_sources = data.get("sources", [])
        suggestions = data.get("suggestions", [])
        
        # Normalize sources
        sources = []
        for i, src in enumerate(raw_sources[:self.config.max_results]):
            try:
                source = PerplexicaSource(
                    title=src.get("title", f"Source {i+1}"),
                    url=src.get("url", ""),
                    snippet=self._truncate(src.get("content", ""), 300),
                    relevance=1.0 - (i * 0.05),  # Decay by position
                    metadata={
                        "engine": src.get("engine", "unknown"),
                        "position": i + 1
                    }
                )
                sources.append(source)
            except Exception as e:
                logger.warning(f"Failed to parse source: {e}")
        
        return PerplexicaResult(
            answer=answer,
            sources=sources,
            query=query,
            focus_mode=focus_mode,
            follow_up_questions=suggestions[:3] if suggestions else []
        )
    
    def _truncate(self, text: str, max_length: int) -> str:
        """Truncate text to max length."""
        if len(text) <= max_length:
            return text
        return text[:max_length - 3] + "..."
    
    async def search_with_retry(
        self,
        query: str,
        focus_mode: FocusMode = None,
        max_retries: int = 2,
        **kwargs
    ) -> PerplexicaResult:
        """Search with exponential backoff retry."""
        last_error = None
        
        for attempt in range(max_retries + 1):
            result = await self.search(query, focus_mode, **kwargs)
            
            if not result.error:
                return result
            
            last_error = result.error
            
            if attempt < max_retries:
                wait_time = 2 ** attempt  # 1s, 2s, 4s...
                logger.info(f"Retry {attempt + 1}/{max_retries} in {wait_time}s...")
                await asyncio.sleep(wait_time)
        
        return PerplexicaResult(
            answer="",
            sources=[],
            query=query,
            focus_mode=focus_mode or self.config.default_focus_mode,
            error=f"Failed after {max_retries} retries: {last_error}"
        )
    
    def clear_cache(self):
        """Clear the result cache."""
        self._cache.clear()
        logger.info("Perplexica cache cleared")


# Singleton service instance
_service: Optional[PerplexicaService] = None


def get_perplexica_service() -> PerplexicaService:
    """Get the Perplexica service singleton."""
    global _service
    if _service is None:
        _service = PerplexicaService()
    return _service


async def search_perplexica(
    query: str,
    focus_mode: str = "webSearch",
    use_cache: bool = True
) -> PerplexicaResult:
    """
    Convenience function for Perplexica search.
    
    Args:
        query: Search query
        focus_mode: Focus mode string
        use_cache: Whether to use cache
        
    Returns:
        PerplexicaResult
    """
    service = get_perplexica_service()
    mode = FocusMode(focus_mode) if focus_mode else None
    return await service.search(query, mode, use_cache)
