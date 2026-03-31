"""
Lightpanda Content Extractor

Extracts main content from web pages, filtering out navigation,
ads, and other non-content elements. Preserves structure.
"""

import asyncio
import logging
import re
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, NavigableString, Tag

logger = logging.getLogger(__name__)

# User agent
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Elements to exclude (navigation, ads, sidebars, etc.)
EXCLUDE_TAGS = {
    "nav", "header", "footer", "aside", "script", "style", "noscript",
    "iframe", "form", "button", "input", "select", "textarea", "svg",
    "video", "audio", "canvas", "map", "figure", "figcaption"
}

EXCLUDE_CLASSES = {
    "nav", "navbar", "navigation", "menu", "header", "footer", "sidebar",
    "ad", "ads", "advertisement", "banner", "cookie", "popup", "modal",
    "social", "share", "comment", "comments", "related", "recommended",
    "breadcrumb", "pagination", "widget"
}

EXCLUDE_IDS = {
    "nav", "navbar", "navigation", "menu", "header", "footer", "sidebar",
    "ad", "ads", "advertisement", "banner", "cookie", "popup", "modal"
}


class LightpandaExtractor:
    """
    Content extractor for web pages.
    
    Extracts main article content while filtering out:
    - Navigation menus
    - Advertisements
    - Sidebars
    - Headers/Footers
    - Comments sections
    - Related content widgets
    """
    
    def __init__(self, timeout: float = 15.0):
        """
        Initialize extractor.
        
        Args:
            timeout: Request timeout in seconds
        """
        self.timeout = timeout
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive"
        }
    
    async def extract(
        self,
        url: str,
        include_structure: bool = True
    ) -> Dict[str, Any]:
        """
        Extract main content from a URL.
        
        Args:
            url: URL to extract content from
            include_structure: Whether to preserve heading/list structure
            
        Returns:
            Dictionary with content, sections, and metadata
        """
        try:
            html = await self._fetch_page(url)
            return self._extract_content(html, url, include_structure)
        except Exception as e:
            logger.error(f"Failed to extract content from {url}: {e}")
            return {
                "content": "",
                "sections": {},
                "metadata": {"error": str(e), "url": url},
                "success": False
            }
    
    async def _fetch_page(self, url: str) -> str:
        """Fetch HTML content from URL."""
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.text
    
    def _extract_content(
        self,
        html: str,
        url: str,
        include_structure: bool
    ) -> Dict[str, Any]:
        """Parse HTML and extract main content."""
        soup = BeautifulSoup(html, "html.parser")
        
        # Extract metadata
        metadata = self._extract_metadata(soup, url)
        
        # Remove unwanted elements
        self._clean_soup(soup)
        
        # Find main content area
        main_content = self._find_main_content(soup)
        
        if include_structure:
            sections = self._extract_structured_content(main_content)
            content = self._sections_to_text(sections)
        else:
            content = self._extract_text_only(main_content)
            sections = {}
        
        return {
            "content": content,
            "sections": sections,
            "metadata": metadata,
            "content_length": len(content),
            "success": True
        }
    
    def _extract_metadata(self, soup: BeautifulSoup, url: str) -> Dict:
        """Extract page metadata (title, description, author, etc.)."""
        metadata = {"url": url}
        
        # Title
        title_tag = soup.find("title")
        if title_tag:
            metadata["title"] = title_tag.get_text(strip=True)
        
        # Meta description
        desc_tag = soup.find("meta", attrs={"name": "description"})
        if desc_tag:
            metadata["description"] = desc_tag.get("content", "")
        
        # Author
        author_tag = soup.find("meta", attrs={"name": "author"})
        if author_tag:
            metadata["author"] = author_tag.get("content", "")
        
        # Published date
        date_tag = soup.find("meta", attrs={"property": "article:published_time"})
        if date_tag:
            metadata["published_date"] = date_tag.get("content", "")
        
        # OG tags
        og_title = soup.find("meta", attrs={"property": "og:title"})
        if og_title:
            metadata["og_title"] = og_title.get("content", "")
        
        og_desc = soup.find("meta", attrs={"property": "og:description"})
        if og_desc:
            metadata["og_description"] = og_desc.get("content", "")
        
        # Domain
        parsed = urlparse(url)
        metadata["domain"] = parsed.netloc
        
        return metadata
    
    def _clean_soup(self, soup: BeautifulSoup) -> None:
        """Remove unwanted elements from soup."""
        # Remove excluded tags
        for tag in EXCLUDE_TAGS:
            for element in soup.find_all(tag):
                element.decompose()
        
        # Remove elements with excluded classes
        for element in soup.find_all(class_=True):
            classes = element.get("class", [])
            if isinstance(classes, str):
                classes = [classes]
            
            for cls in classes:
                if any(exc in cls.lower() for exc in EXCLUDE_CLASSES):
                    element.decompose()
                    break
        
        # Remove elements with excluded IDs
        for element in soup.find_all(id=True):
            element_id = element.get("id", "").lower()
            if any(exc in element_id for exc in EXCLUDE_IDS):
                element.decompose()
        
        # Remove hidden elements
        for element in soup.find_all(style=re.compile(r"display:\s*none", re.I)):
            element.decompose()
        
        # Remove elements with aria-hidden="true"
        for element in soup.find_all(attrs={"aria-hidden": "true"}):
            element.decompose()
    
    def _find_main_content(self, soup: BeautifulSoup) -> Tag:
        """Find the main content area of the page."""
        # Try semantic elements first
        main = soup.find("main")
        if main:
            return main
        
        article = soup.find("article")
        if article:
            return article
        
        # Try role="main"
        main_role = soup.find(attrs={"role": "main"})
        if main_role:
            return main_role
        
        # Try common content IDs
        for content_id in ["content", "main-content", "article", "post", "entry"]:
            content = soup.find(id=content_id)
            if content:
                return content
        
        # Try common content classes
        for content_class in ["content", "main-content", "article", "post", "entry"]:
            content = soup.find(class_=content_class)
            if content:
                return content
        
        # Fall back to body
        body = soup.find("body")
        return body if body else soup
    
    def _extract_structured_content(self, element: Tag) -> Dict[str, List[str]]:
        """Extract content with structure preserved."""
        sections = {
            "h1": [],
            "h2": [],
            "h3": [],
            "h4": [],
            "paragraphs": [],
            "lists": [],
            "blockquotes": [],
            "code": []
        }
        
        if not element:
            return sections
        
        # Extract headings
        for level in ["h1", "h2", "h3", "h4"]:
            for heading in element.find_all(level):
                text = heading.get_text(strip=True)
                if text and len(text) > 2:
                    sections[level].append(text)
        
        # Extract paragraphs
        for p in element.find_all("p"):
            text = p.get_text(strip=True)
            if text and len(text) > 20:  # Filter out short paragraphs
                sections["paragraphs"].append(text)
        
        # Extract lists
        for ul in element.find_all(["ul", "ol"]):
            items = []
            for li in ul.find_all("li", recursive=False):
                text = li.get_text(strip=True)
                if text:
                    items.append(text)
            if items:
                sections["lists"].append(items)
        
        # Extract blockquotes
        for quote in element.find_all("blockquote"):
            text = quote.get_text(strip=True)
            if text:
                sections["blockquotes"].append(text)
        
        # Extract code blocks
        for code in element.find_all(["code", "pre"]):
            text = code.get_text(strip=True)
            if text and len(text) > 10:
                sections["code"].append(text)
        
        return sections
    
    def _sections_to_text(self, sections: Dict[str, List]) -> str:
        """Convert structured sections to readable text."""
        parts = []
        
        # Add title (h1)
        for h1 in sections.get("h1", []):
            parts.append(f"# {h1}\n")
        
        # Add content in order
        for h2 in sections.get("h2", []):
            parts.append(f"\n## {h2}\n")
        
        for h3 in sections.get("h3", []):
            parts.append(f"\n### {h3}\n")
        
        # Add paragraphs
        for para in sections.get("paragraphs", []):
            parts.append(f"\n{para}\n")
        
        # Add lists
        for lst in sections.get("lists", []):
            for item in lst:
                parts.append(f"• {item}")
            parts.append("")
        
        # Add blockquotes
        for quote in sections.get("blockquotes", []):
            parts.append(f'\n> "{quote}"\n')
        
        return "\n".join(parts).strip()
    
    def _extract_text_only(self, element: Tag) -> str:
        """Extract plain text without structure."""
        if not element:
            return ""
        
        # Get all text
        text = element.get_text(separator="\n", strip=True)
        
        # Clean up whitespace
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        
        # Filter out very short lines (likely menu items, etc.)
        lines = [line for line in lines if len(line) > 15]
        
        return "\n\n".join(lines)
    
    async def extract_multiple(
        self,
        urls: List[str],
        include_structure: bool = True,
        max_concurrent: int = 5
    ) -> List[Dict]:
        """
        Extract content from multiple URLs concurrently.
        
        Args:
            urls: List of URLs to extract from
            include_structure: Whether to preserve structure
            max_concurrent: Maximum concurrent requests
            
        Returns:
            List of extraction results
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def extract_with_semaphore(url: str) -> Dict:
            async with semaphore:
                return await self.extract(url, include_structure)
        
        tasks = [extract_with_semaphore(url) for url in urls]
        return await asyncio.gather(*tasks)
