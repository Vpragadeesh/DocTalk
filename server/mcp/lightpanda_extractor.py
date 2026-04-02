"""
Content Extractor

Extracts main content from web pages, filtering out navigation,
ads, and other non-content elements. Preserves structure.
Uses lxml for fast HTML parsing.
"""

import asyncio
import logging
import re
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin, urlparse

import httpx
from lxml import html

# Import Cleaner from the separate lxml_html_clean package
try:
    from lxml_html_clean import Cleaner
except ImportError:
    # Fallback for older lxml versions
    from lxml.html.clean import Cleaner

logger = logging.getLogger(__name__)

# User agent
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# XPath expressions for elements to exclude
EXCLUDE_XPATH = """
    //nav | //header | //footer | //aside | //script | //style | //noscript |
    //iframe | //form | //button | //input | //select | //textarea | //svg |
    //video | //audio | //canvas | //map | //*[contains(@class, 'nav')] |
    //*[contains(@class, 'menu')] | //*[contains(@class, 'sidebar')] |
    //*[contains(@class, 'footer')] | //*[contains(@class, 'header')] |
    //*[contains(@class, 'ad')] | //*[contains(@class, 'advertisement')] |
    //*[contains(@class, 'banner')] | //*[contains(@class, 'cookie')] |
    //*[contains(@class, 'popup')] | //*[contains(@class, 'modal')] |
    //*[contains(@class, 'social')] | //*[contains(@class, 'share')] |
    //*[contains(@class, 'comment')] | //*[contains(@class, 'related')] |
    //*[contains(@id, 'nav')] | //*[contains(@id, 'menu')] |
    //*[contains(@id, 'sidebar')] | //*[contains(@id, 'footer')] |
    //*[contains(@id, 'header')] | //*[contains(@id, 'ad')] |
    //*[@aria-hidden='true']
"""


class LightpandaExtractor:
    """
    Content extractor for web pages using lxml.
    
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
        
        # HTML cleaner for removing unwanted elements
        self.cleaner = Cleaner(
            scripts=True,
            javascript=True,
            comments=True,
            style=True,
            inline_style=True,
            links=False,
            meta=True,
            page_structure=False,
            processing_instructions=True,
            remove_unknown_tags=False,
            safe_attrs_only=False,
            forms=True,
            annoying_tags=True,
            remove_tags=None,
            kill_tags=['nav', 'header', 'footer', 'aside', 'noscript', 'iframe']
        )
    
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
            html_content = await self._fetch_page(url)
            return self._extract_content(html_content, url, include_structure)
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
        html_content: str,
        url: str,
        include_structure: bool
    ) -> Dict[str, Any]:
        """Parse HTML and extract main content."""
        # Parse HTML
        tree = html.fromstring(html_content)
        
        # Extract metadata first
        metadata = self._extract_metadata(tree, url)
        
        # Clean the HTML
        cleaned_tree = self.cleaner.clean_html(tree)
        
        # Remove additional unwanted elements
        self._remove_unwanted_elements(cleaned_tree)
        
        # Find main content area
        main_content = self._find_main_content(cleaned_tree)
        
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
    
    def _extract_metadata(self, tree, url: str) -> Dict:
        """Extract page metadata (title, description, author, etc.)."""
        metadata = {"url": url}
        
        # Title
        title_elems = tree.xpath('//title/text()')
        if title_elems:
            metadata["title"] = title_elems[0].strip()
        
        # Meta description
        desc_elems = tree.xpath('//meta[@name="description"]/@content')
        if desc_elems:
            metadata["description"] = desc_elems[0]
        
        # Author
        author_elems = tree.xpath('//meta[@name="author"]/@content')
        if author_elems:
            metadata["author"] = author_elems[0]
        
        # Published date
        date_elems = tree.xpath('//meta[@property="article:published_time"]/@content')
        if date_elems:
            metadata["published_date"] = date_elems[0]
        
        # OG tags
        og_title = tree.xpath('//meta[@property="og:title"]/@content')
        if og_title:
            metadata["og_title"] = og_title[0]
        
        og_desc = tree.xpath('//meta[@property="og:description"]/@content')
        if og_desc:
            metadata["og_description"] = og_desc[0]
        
        # Domain
        parsed = urlparse(url)
        metadata["domain"] = parsed.netloc
        
        return metadata
    
    def _remove_unwanted_elements(self, tree) -> None:
        """Remove unwanted elements from tree."""
        try:
            # Remove elements matching exclusion XPath
            for element in tree.xpath(EXCLUDE_XPATH):
                parent = element.getparent()
                if parent is not None:
                    parent.remove(element)
        except Exception as e:
            logger.warning(f"Error removing unwanted elements: {e}")
    
    def _find_main_content(self, tree):
        """Find the main content area of the page."""
        # Try semantic elements first
        selectors = [
            '//main',
            '//article',
            '//*[@role="main"]',
            '//*[@id="content"]',
            '//*[@id="main-content"]',
            '//*[@id="article"]',
            '//*[@id="post"]',
            '//*[@class="content"]',
            '//*[@class="main-content"]',
            '//*[@class="article"]',
            '//*[@class="post"]',
            '//body'
        ]
        
        for selector in selectors:
            elements = tree.xpath(selector)
            if elements:
                return elements[0]
        
        return tree
    
    def _extract_structured_content(self, element) -> Dict[str, List[str]]:
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
        
        if element is None:
            return sections
        
        # Extract headings
        for level in ["h1", "h2", "h3", "h4"]:
            for heading in element.xpath(f'.//{level}'):
                text = heading.text_content().strip()
                if text and len(text) > 2:
                    sections[level].append(text)
        
        # Extract paragraphs
        for p in element.xpath('.//p'):
            text = p.text_content().strip()
            if text and len(text) > 20:  # Filter out short paragraphs
                sections["paragraphs"].append(text)
        
        # Extract lists
        for ul in element.xpath('.//ul | .//ol'):
            items = []
            for li in ul.xpath('./li'):
                text = li.text_content().strip()
                if text:
                    items.append(text)
            if items:
                sections["lists"].append(items)
        
        # Extract blockquotes
        for quote in element.xpath('.//blockquote'):
            text = quote.text_content().strip()
            if text:
                sections["blockquotes"].append(text)
        
        # Extract code blocks
        for code in element.xpath('.//code | .//pre'):
            text = code.text_content().strip()
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
    
    def _extract_text_only(self, element) -> str:
        """Extract plain text without structure."""
        if element is None:
            return ""
        
        # Get all text
        text = element.text_content()
        
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
