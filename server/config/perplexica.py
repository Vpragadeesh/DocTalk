"""
Perplexica AI Search Configuration.

Provides configuration for connecting to Perplexica API,
including focus modes, timeouts, and caching settings.
"""

import os
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()


class FocusMode(str, Enum):
    """Available Perplexica search focus modes."""
    ALL = "webSearch"
    ACADEMIC = "academicSearch"
    REDDIT = "redditSearch"
    YOUTUBE = "youtubeSearch"
    WOLFRAM = "wolframAlphaSearch"
    WRITING = "writingAssistant"


class PerplexicaConfig(BaseModel):
    """Perplexica service configuration."""
    api_url: str = Field(
        default_factory=lambda: os.getenv("PERPLEXICA_API_URL", "http://localhost:3001")
    )
    timeout: int = Field(
        default_factory=lambda: int(os.getenv("PERPLEXICA_TIMEOUT", "30"))
    )
    enabled: bool = Field(
        default_factory=lambda: os.getenv("PERPLEXICA_ENABLED", "true").lower() == "true"
    )
    auto_trigger_threshold: float = Field(
        default_factory=lambda: float(os.getenv("PERPLEXICA_AUTO_THRESHOLD", "0.6"))
    )
    cache_ttl: int = Field(
        default_factory=lambda: int(os.getenv("PERPLEXICA_CACHE_TTL", "1800"))  # 30 min
    )
    max_results: int = Field(
        default_factory=lambda: int(os.getenv("PERPLEXICA_MAX_RESULTS", "10"))
    )
    default_focus_mode: FocusMode = Field(
        default_factory=lambda: FocusMode(
            os.getenv("PERPLEXICA_DEFAULT_FOCUS", "webSearch")
        )
    )


# Global config instance
_config: Optional[PerplexicaConfig] = None


def get_perplexica_config() -> PerplexicaConfig:
    """Get the Perplexica configuration singleton."""
    global _config
    if _config is None:
        _config = PerplexicaConfig()
    return _config


def reset_config():
    """Reset config (for testing)."""
    global _config
    _config = None


# Focus mode descriptions for UI
FOCUS_MODE_INFO = {
    FocusMode.ALL: {
        "name": "Web Search",
        "description": "General web search across all sources",
        "icon": "globe"
    },
    FocusMode.ACADEMIC: {
        "name": "Academic",
        "description": "Search academic papers and research",
        "icon": "graduation-cap"
    },
    FocusMode.REDDIT: {
        "name": "Reddit",
        "description": "Search Reddit discussions and threads",
        "icon": "message-circle"
    },
    FocusMode.YOUTUBE: {
        "name": "YouTube",
        "description": "Search YouTube video content",
        "icon": "play-circle"
    },
    FocusMode.WOLFRAM: {
        "name": "Wolfram Alpha",
        "description": "Computational knowledge engine",
        "icon": "calculator"
    },
    FocusMode.WRITING: {
        "name": "Writing Assistant",
        "description": "Help with writing and composition",
        "icon": "pen-tool"
    }
}


# API endpoints
PERPLEXICA_ENDPOINTS = {
    "search": "/api/search",
    "config": "/api/config",
    "suggestions": "/api/suggestions"
}
