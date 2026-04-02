"""
Perplexica AI Search API Endpoints.

Provides endpoints for:
- POST /perplexica/search - Web search with focus modes
- POST /perplexica/hybrid - Combined document + web search
- GET /perplexica/health - Service health check
- GET /perplexica/focus-modes - Available focus modes
- DELETE /perplexica/cache - Clear search cache
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import time

from auth.dependencies import get_current_user_id
from config.perplexica import (
    FocusMode, get_perplexica_config, FOCUS_MODE_INFO
)
from services.perplexica_service import (
    get_perplexica_service, PerplexicaResult, PerplexicaSource
)
from rag.retriever import get_retriever

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/perplexica", tags=["Perplexica Search"])


# ==================== Request/Response Models ====================

class PerplexicaSearchRequest(BaseModel):
    """Request for Perplexica web search."""
    query: str = Field(..., min_length=1, max_length=1000)
    focus_mode: str = Field(default="webSearch", description="Search focus mode")
    use_cache: bool = Field(default=True, description="Use cached results")
    history: List[Dict] = Field(default_factory=list, description="Chat history")
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "Latest advances in machine learning",
                "focus_mode": "webSearch",
                "use_cache": True
            }
        }


class HybridSearchRequest(BaseModel):
    """Request for hybrid document + web search."""
    query: str = Field(..., min_length=1, max_length=1000)
    search_documents: bool = Field(default=True, description="Search uploaded documents")
    search_web: bool = Field(default=True, description="Search web via Perplexica")
    focus_mode: str = Field(default="webSearch", description="Web search focus mode")
    doc_top_k: int = Field(default=5, ge=1, le=20, description="Max document results")
    web_top_k: int = Field(default=5, ge=1, le=20, description="Max web results")
    auto_web_threshold: float = Field(
        default=0.6, ge=0, le=1,
        description="Auto-trigger web search if doc relevance below this"
    )
    use_cache: bool = Field(default=True)


class SourceResponse(BaseModel):
    """A search source."""
    title: str
    url: str
    snippet: str
    relevance: float
    source_type: str  # "document" or "web"
    metadata: Dict = {}


class SearchResponse(BaseModel):
    """Response from Perplexica search."""
    answer: str
    sources: List[SourceResponse]
    query: str
    focus_mode: str
    follow_up_questions: List[str] = []
    search_time_ms: int
    from_cache: bool
    error: Optional[str] = None


class HybridSearchResponse(BaseModel):
    """Response from hybrid search."""
    query: str
    document_results: List[SourceResponse]
    web_results: List[SourceResponse]
    web_answer: str
    focus_mode: str
    search_time_ms: int
    web_searched: bool
    auto_triggered: bool = False
    metadata: Dict = {}


class FocusModeResponse(BaseModel):
    """Information about a focus mode."""
    mode: str
    name: str
    description: str
    icon: str


# ==================== Endpoints ====================

@router.post("/search", response_model=SearchResponse)
async def perplexica_search(
    request: PerplexicaSearchRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Perform a web search using Perplexica.
    
    Focus modes:
    - webSearch: General web search
    - academicSearch: Academic papers
    - redditSearch: Reddit discussions
    - youtubeSearch: YouTube videos
    - wolframAlphaSearch: Computational queries
    - writingAssistant: Writing help
    """
    start_time = time.time()
    
    try:
        # Validate focus mode
        try:
            focus_mode = FocusMode(request.focus_mode)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid focus mode: {request.focus_mode}"
            )
        
        service = get_perplexica_service()
        result = await service.search(
            query=request.query,
            focus_mode=focus_mode,
            use_cache=request.use_cache,
            history=request.history
        )
        
        # Convert to response format
        sources = [
            SourceResponse(
                title=s.title,
                url=s.url,
                snippet=s.snippet,
                relevance=s.relevance,
                source_type="web",
                metadata=s.metadata
            )
            for s in result.sources
        ]
        
        return SearchResponse(
            answer=result.answer,
            sources=sources,
            query=result.query,
            focus_mode=result.focus_mode.value,
            follow_up_questions=result.follow_up_questions,
            search_time_ms=result.search_time_ms,
            from_cache=result.from_cache,
            error=result.error
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Perplexica search error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )


@router.post("/hybrid", response_model=HybridSearchResponse)
async def hybrid_search(
    request: HybridSearchRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Perform hybrid search combining documents and web.
    
    1. Search user's uploaded documents
    2. If relevance low OR search_web=true, also search Perplexica
    3. Return combined results with source attribution
    """
    start_time = time.time()
    
    document_results: List[SourceResponse] = []
    web_results: List[SourceResponse] = []
    web_answer = ""
    web_searched = False
    auto_triggered = False
    avg_doc_relevance = 0.0
    
    try:
        # Step 1: Search documents
        if request.search_documents:
            retriever = get_retriever(user_id, k=request.doc_top_k)
            docs = retriever.invoke(request.query)
            
            for i, doc in enumerate(docs):
                relevance = 1.0 - (i * 0.1)  # Decay by position
                document_results.append(SourceResponse(
                    title=doc.metadata.get("filename", f"Document {i+1}"),
                    url="",
                    snippet=doc.page_content[:300],
                    relevance=relevance,
                    source_type="document",
                    metadata={
                        "page": doc.metadata.get("page"),
                        "file_id": doc.metadata.get("file_id"),
                        "chunk_index": doc.metadata.get("chunk_index")
                    }
                ))
            
            # Calculate average relevance
            if document_results:
                avg_doc_relevance = sum(r.relevance for r in document_results) / len(document_results)
        
        # Step 2: Decide whether to search web
        should_search_web = request.search_web
        
        if not should_search_web and request.search_documents:
            # Auto-trigger if doc relevance is low
            if avg_doc_relevance < request.auto_web_threshold:
                should_search_web = True
                auto_triggered = True
                logger.info(f"Auto-triggering web search (relevance: {avg_doc_relevance:.2f})")
        
        # Step 3: Search web if needed
        if should_search_web:
            web_searched = True
            
            try:
                focus_mode = FocusMode(request.focus_mode)
            except ValueError:
                focus_mode = FocusMode.ALL
            
            service = get_perplexica_service()
            perplexica_result = await service.search(
                query=request.query,
                focus_mode=focus_mode,
                use_cache=request.use_cache
            )
            
            if not perplexica_result.error:
                web_answer = perplexica_result.answer
                
                for src in perplexica_result.sources[:request.web_top_k]:
                    web_results.append(SourceResponse(
                        title=src.title,
                        url=src.url,
                        snippet=src.snippet,
                        relevance=src.relevance,
                        source_type="web",
                        metadata=src.metadata
                    ))
        
        elapsed = int((time.time() - start_time) * 1000)
        
        return HybridSearchResponse(
            query=request.query,
            document_results=document_results,
            web_results=web_results,
            web_answer=web_answer,
            focus_mode=request.focus_mode,
            search_time_ms=elapsed,
            web_searched=web_searched,
            auto_triggered=auto_triggered,
            metadata={
                "doc_count": len(document_results),
                "web_count": len(web_results),
                "avg_doc_relevance": round(avg_doc_relevance, 2)
            }
        )
        
    except Exception as e:
        logger.error(f"Hybrid search error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Hybrid search failed: {str(e)}"
        )


@router.get("/health")
async def check_health():
    """Check Perplexica service health."""
    service = get_perplexica_service()
    health = await service.check_health()
    
    config = get_perplexica_config()
    health["config"] = {
        "enabled": config.enabled,
        "timeout": config.timeout,
        "cache_ttl": config.cache_ttl,
        "default_focus_mode": config.default_focus_mode.value
    }
    
    return health


@router.get("/focus-modes", response_model=List[FocusModeResponse])
async def get_focus_modes():
    """Get available focus modes for Perplexica search."""
    modes = []
    for mode, info in FOCUS_MODE_INFO.items():
        modes.append(FocusModeResponse(
            mode=mode.value,
            name=info["name"],
            description=info["description"],
            icon=info["icon"]
        ))
    return modes


@router.delete("/cache")
async def clear_cache(
    user_id: str = Depends(get_current_user_id)
):
    """Clear the Perplexica result cache."""
    service = get_perplexica_service()
    service.clear_cache()
    return {"message": "Cache cleared"}
