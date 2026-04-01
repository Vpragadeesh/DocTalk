"""
Result Synthesizer Module for Deep Search.

Ranks results intelligently, combines sources, and generates
comprehensive answers with citations and reasoning explanations.
"""

import logging
import re
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict

logger = logging.getLogger(__name__)


@dataclass
class RankedResult:
    """A search result with ranking scores."""
    content: str
    source: str  # filename or URL
    page: Optional[int] = None
    chunk_index: Optional[int] = None
    
    # Scores
    relevance_score: float = 0.0
    reasoning_quality: float = 0.0
    completeness_score: float = 0.0
    recency_score: float = 0.0
    overall_score: float = 0.0
    
    # Additional info
    matched_concepts: List[str] = field(default_factory=list)
    source_type: str = "document"  # document, web, reasoning
    metadata: Dict = field(default_factory=dict)


@dataclass
class Citation:
    """A citation for a piece of information."""
    citation_id: str
    source: str
    page: Optional[int] = None
    quote: Optional[str] = None
    relevance: float = 1.0


@dataclass
class SynthesizedAnswer:
    """A fully synthesized answer with citations and metadata."""
    answer: str
    summary: str
    citations: List[Citation]
    confidence: float
    completeness: float
    sources_used: int
    reasoning_quality: str  # low, medium, high
    key_concepts: List[str]
    suggestions: List[str]  # Suggested follow-up questions
    metadata: Dict = field(default_factory=dict)


class ResultRanker:
    """
    Ranks search results using multiple criteria.
    """
    
    def __init__(
        self,
        relevance_weight: float = 0.4,
        reasoning_weight: float = 0.25,
        completeness_weight: float = 0.2,
        diversity_weight: float = 0.15
    ):
        """
        Initialize the ranker with weight configuration.
        
        Args:
            relevance_weight: Weight for relevance score
            reasoning_weight: Weight for reasoning quality
            completeness_weight: Weight for information completeness
            diversity_weight: Weight for source diversity
        """
        self.relevance_weight = relevance_weight
        self.reasoning_weight = reasoning_weight
        self.completeness_weight = completeness_weight
        self.diversity_weight = diversity_weight
    
    def rank_results(
        self,
        results: List[Dict],
        query: str,
        query_concepts: List[str],
        reasoning_context: Optional[Dict] = None
    ) -> List[RankedResult]:
        """
        Rank search results based on multiple criteria.
        
        Args:
            results: Raw search results (documents/chunks)
            query: The original query
            query_concepts: Concepts extracted from query
            reasoning_context: Optional context from reasoning steps
            
        Returns:
            List of RankedResult objects sorted by overall score
        """
        ranked = []
        
        for result in results:
            # Extract content and metadata
            if hasattr(result, 'page_content'):
                # LangChain Document
                content = result.page_content
                metadata = getattr(result, 'metadata', {})
            elif isinstance(result, dict):
                content = result.get('page_content', result.get('content', ''))
                metadata = result.get('metadata', {})
            else:
                content = str(result)
                metadata = {}
            
            # Calculate individual scores
            relevance = self._calculate_relevance(content, query, query_concepts)
            reasoning_quality = self._calculate_reasoning_quality(
                content, reasoning_context
            )
            completeness = self._calculate_completeness(content, query_concepts)
            
            # Find matched concepts
            matched = self._find_matched_concepts(content, query_concepts)
            
            # Calculate overall score
            overall = (
                self.relevance_weight * relevance +
                self.reasoning_weight * reasoning_quality +
                self.completeness_weight * completeness
            )
            
            # Get filename - check multiple possible keys
            filename = (
                metadata.get('filename') or 
                metadata.get('source') or 
                metadata.get('file_name') or
                metadata.get('name') or
                'Unknown Document'
            )
            
            # Log metadata for debugging
            if filename == 'Unknown Document':
                logger.warning(f"Unknown source - metadata keys: {list(metadata.keys())}, values: {metadata}")
            else:
                logger.debug(f"Source identified: {filename}")
            
            ranked.append(RankedResult(
                content=content,
                source=filename,
                page=metadata.get('page'),
                chunk_index=metadata.get('chunk_index') or metadata.get('faiss_index_id'),
                relevance_score=relevance,
                reasoning_quality=reasoning_quality,
                completeness_score=completeness,
                overall_score=overall,
                matched_concepts=matched,
                metadata=metadata
            ))
        
        # Apply diversity bonus
        ranked = self._apply_diversity_bonus(ranked)
        
        # Sort by overall score
        ranked.sort(key=lambda x: x.overall_score, reverse=True)
        
        return ranked
    
    def _calculate_relevance(
        self,
        content: str,
        query: str,
        concepts: List[str]
    ) -> float:
        """Calculate relevance score based on concept overlap and keyword matching."""
        content_lower = content.lower()
        query_lower = query.lower()
        
        score = 0.0
        
        # Keyword matching
        query_words = set(query_lower.split())
        content_words = set(content_lower.split())
        word_overlap = len(query_words & content_words) / max(len(query_words), 1)
        score += word_overlap * 0.3
        
        # Concept matching
        if concepts:
            matched = sum(1 for c in concepts if c.lower() in content_lower)
            concept_score = matched / len(concepts)
            score += concept_score * 0.5
        
        # Phrase matching (query fragments in content)
        query_phrases = self._extract_phrases(query_lower)
        phrase_matches = sum(1 for p in query_phrases if p in content_lower)
        if query_phrases:
            score += (phrase_matches / len(query_phrases)) * 0.2
        
        return min(score, 1.0)
    
    def _calculate_reasoning_quality(
        self,
        content: str,
        reasoning_context: Optional[Dict]
    ) -> float:
        """Calculate how well content supports reasoning."""
        if not reasoning_context:
            return 0.5  # Neutral score
        
        content_lower = content.lower()
        score = 0.5
        
        # Check if content addresses sub-questions
        sub_questions = reasoning_context.get('sub_questions', [])
        for sq in sub_questions:
            question = sq.get('question', '') if isinstance(sq, dict) else str(sq)
            question_concepts = self._extract_phrases(question.lower())
            if any(c in content_lower for c in question_concepts):
                score += 0.1
        
        # Check for evidence markers
        evidence_markers = [
            'because', 'therefore', 'shows that', 'indicates',
            'demonstrates', 'proves', 'evidence', 'according to'
        ]
        marker_count = sum(1 for m in evidence_markers if m in content_lower)
        score += min(marker_count * 0.05, 0.2)
        
        return min(score, 1.0)
    
    def _calculate_completeness(
        self,
        content: str,
        concepts: List[str]
    ) -> float:
        """Calculate information completeness score."""
        if not concepts:
            return 0.5
        
        content_lower = content.lower()
        
        # Check concept coverage
        covered = sum(1 for c in concepts if c.lower() in content_lower)
        coverage_score = covered / len(concepts)
        
        # Content length bonus (longer content tends to be more complete)
        length_score = min(len(content) / 2000, 1.0) * 0.3
        
        # Structure score (lists, sections indicate organized info)
        structure_markers = ['\n-', '\n•', '\n1.', '\n2.', '##', '**']
        structure_score = min(
            sum(1 for m in structure_markers if m in content) * 0.1,
            0.2
        )
        
        return min(coverage_score * 0.5 + length_score + structure_score, 1.0)
    
    def _find_matched_concepts(
        self,
        content: str,
        concepts: List[str]
    ) -> List[str]:
        """Find which concepts are present in the content."""
        content_lower = content.lower()
        return [c for c in concepts if c.lower() in content_lower]
    
    def _extract_phrases(self, text: str) -> List[str]:
        """Extract meaningful phrases from text."""
        # Remove common words and extract 2-3 word phrases
        words = text.split()
        phrases = []
        
        # Single important words
        stopwords = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
                    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
                    'could', 'should', 'may', 'might', 'must', 'shall', 'can',
                    'of', 'in', 'to', 'for', 'with', 'on', 'at', 'from', 'by',
                    'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where',
                    'how', 'what', 'which', 'who', 'this', 'that', 'these', 'those'}
        
        important_words = [w for w in words if w not in stopwords and len(w) > 2]
        phrases.extend(important_words)
        
        # 2-word phrases
        for i in range(len(words) - 1):
            if words[i] not in stopwords or words[i+1] not in stopwords:
                phrases.append(f"{words[i]} {words[i+1]}")
        
        return phrases
    
    def _apply_diversity_bonus(
        self,
        results: List[RankedResult]
    ) -> List[RankedResult]:
        """Apply diversity bonus to promote variety of sources."""
        if not results:
            return results
        
        # Track seen sources
        seen_sources = defaultdict(int)
        
        for result in results:
            source = result.source
            count = seen_sources[source]
            
            # Apply diminishing bonus for repeated sources
            if count == 0:
                diversity_bonus = self.diversity_weight
            else:
                diversity_bonus = self.diversity_weight / (count + 1)
            
            result.overall_score += diversity_bonus
            seen_sources[source] += 1
        
        return results


class ResultSynthesizer:
    """
    Synthesizes ranked results into comprehensive answers.
    """
    
    def __init__(self, ranker: Optional[ResultRanker] = None):
        """
        Initialize the synthesizer.
        
        Args:
            ranker: Optional ResultRanker instance
        """
        self.ranker = ranker or ResultRanker()
    
    def synthesize(
        self,
        query: str,
        ranked_results: List[RankedResult],
        reasoning_chain: Optional[Dict] = None,
        max_sources: int = 8,
        include_suggestions: bool = True
    ) -> SynthesizedAnswer:
        """
        Synthesize results into a comprehensive answer.
        
        Args:
            query: Original query
            ranked_results: Ranked search results
            reasoning_chain: Optional reasoning chain from SemanticReasoner
            max_sources: Maximum sources to include
            include_suggestions: Whether to generate follow-up suggestions
            
        Returns:
            SynthesizedAnswer with citations and metadata
        """
        # Select top results
        top_results = ranked_results[:max_sources]
        
        # Build answer from reasoning chain if available
        if reasoning_chain:
            answer = self._build_answer_from_reasoning(reasoning_chain, top_results)
            confidence = reasoning_chain.get('total_confidence', 0.7)
        else:
            answer = self._build_answer_from_results(query, top_results)
            confidence = self._estimate_confidence(top_results)
        
        # Generate citations
        citations = self._generate_citations(top_results)
        
        # Generate summary
        summary = self._generate_summary(answer)
        
        # Extract key concepts
        key_concepts = self._extract_key_concepts(top_results)
        
        # Calculate completeness
        completeness = self._calculate_answer_completeness(top_results)
        
        # Determine reasoning quality
        reasoning_quality = self._assess_reasoning_quality(reasoning_chain, top_results)
        
        # Generate suggestions
        suggestions = []
        if include_suggestions:
            suggestions = self._generate_suggestions(query, key_concepts, top_results)
        
        return SynthesizedAnswer(
            answer=answer,
            summary=summary,
            citations=citations,
            confidence=confidence,
            completeness=completeness,
            sources_used=len(top_results),
            reasoning_quality=reasoning_quality,
            key_concepts=key_concepts,
            suggestions=suggestions,
            metadata={
                "had_reasoning_chain": reasoning_chain is not None,
                "max_sources": max_sources,
                "avg_relevance": sum(r.relevance_score for r in top_results) / max(len(top_results), 1)
            }
        )
    
    def _build_answer_from_reasoning(
        self,
        reasoning_chain: Dict,
        results: List[RankedResult]
    ) -> str:
        """Build answer from reasoning chain."""
        # If reasoning chain has final_answer, use it
        if 'final_answer' in reasoning_chain:
            return reasoning_chain['final_answer']
        
        # Otherwise, build from steps
        steps = reasoning_chain.get('steps', [])
        if steps:
            last_step = steps[-1]
            if hasattr(last_step, 'answer'):
                return last_step.answer
            elif isinstance(last_step, dict):
                return last_step.get('answer', '')
        
        return self._build_answer_from_results("", results)
    
    def _build_answer_from_results(
        self,
        query: str,
        results: List[RankedResult]
    ) -> str:
        """Build answer by combining top results."""
        if not results:
            return "No relevant information found in the uploaded documents."
        
        # Group by source for organized answer
        by_source = defaultdict(list)
        for result in results:
            by_source[result.source].append(result)
        
        parts = []
        parts.append(f"Based on the uploaded documents:\n")
        
        for source, source_results in by_source.items():
            # Get best result from each source
            best = max(source_results, key=lambda x: x.relevance_score)
            
            # Truncate content for answer
            content = best.content[:800]
            if len(best.content) > 800:
                content += "..."
            
            page_info = f" (Page {best.page})" if best.page else ""
            parts.append(f"\n**From {source}{page_info}:**\n{content}")
        
        return "\n".join(parts)
    
    def _generate_citations(self, results: List[RankedResult]) -> List[Citation]:
        """Generate citations for results."""
        citations = []
        
        for i, result in enumerate(results):
            # Extract a quote from the content
            quote = result.content[:200] if result.content else None
            
            citations.append(Citation(
                citation_id=f"cite_{i+1}",
                source=result.source,
                page=result.page,
                quote=quote,
                relevance=result.relevance_score
            ))
        
        return citations
    
    def _generate_summary(self, answer: str) -> str:
        """Generate a brief summary of the answer."""
        # Take first 200 chars or first paragraph
        if '\n\n' in answer:
            first_para = answer.split('\n\n')[0]
            if len(first_para) <= 300:
                return first_para
        
        if len(answer) <= 200:
            return answer
        
        # Find a good break point
        summary = answer[:200]
        last_period = summary.rfind('.')
        if last_period > 100:
            summary = summary[:last_period + 1]
        else:
            summary = summary + "..."
        
        return summary
    
    def _extract_key_concepts(self, results: List[RankedResult]) -> List[str]:
        """Extract key concepts from results."""
        all_concepts = []
        for result in results:
            all_concepts.extend(result.matched_concepts)
        
        # Count occurrences
        concept_counts = defaultdict(int)
        for c in all_concepts:
            concept_counts[c.lower()] += 1
        
        # Return top concepts
        sorted_concepts = sorted(
            concept_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [c[0] for c in sorted_concepts[:10]]
    
    def _calculate_answer_completeness(self, results: List[RankedResult]) -> float:
        """Calculate how complete the answer is."""
        if not results:
            return 0.0
        
        # Average completeness of results
        avg_completeness = sum(r.completeness_score for r in results) / len(results)
        
        # Bonus for multiple sources
        unique_sources = len(set(r.source for r in results))
        source_bonus = min(unique_sources * 0.1, 0.3)
        
        return min(avg_completeness + source_bonus, 1.0)
    
    def _assess_reasoning_quality(
        self,
        reasoning_chain: Optional[Dict],
        results: List[RankedResult]
    ) -> str:
        """Assess the quality of reasoning in the answer."""
        if reasoning_chain:
            confidence = reasoning_chain.get('total_confidence', 0.5)
            num_steps = len(reasoning_chain.get('steps', []))
            
            if confidence >= 0.8 and num_steps >= 2:
                return "high"
            elif confidence >= 0.5:
                return "medium"
            else:
                return "low"
        else:
            # Assess based on results
            avg_relevance = sum(r.relevance_score for r in results) / max(len(results), 1)
            
            if avg_relevance >= 0.7:
                return "medium"
            else:
                return "low"
    
    def _estimate_confidence(self, results: List[RankedResult]) -> float:
        """Estimate confidence when no reasoning chain is available."""
        if not results:
            return 0.0
        
        # Average of relevance and completeness
        avg_relevance = sum(r.relevance_score for r in results) / len(results)
        avg_completeness = sum(r.completeness_score for r in results) / len(results)
        
        return (avg_relevance + avg_completeness) / 2
    
    def _generate_suggestions(
        self,
        query: str,
        concepts: List[str],
        results: List[RankedResult]
    ) -> List[str]:
        """Generate follow-up question suggestions."""
        suggestions = []
        
        # Suggestion based on concepts
        if concepts:
            suggestions.append(f"Tell me more about {concepts[0]}")
            if len(concepts) > 1:
                suggestions.append(f"How does {concepts[0]} relate to {concepts[1]}?")
        
        # Suggestion for comparison if multiple sources
        unique_sources = list(set(r.source for r in results))
        if len(unique_sources) > 1:
            suggestions.append(
                f"Compare the information between {unique_sources[0]} and {unique_sources[1]}"
            )
        
        # Generic follow-ups based on query type
        query_lower = query.lower()
        if 'how' in query_lower:
            suggestions.append("What are the prerequisites for this?")
        elif 'why' in query_lower:
            suggestions.append("What are the consequences of this?")
        elif 'what' in query_lower:
            suggestions.append("How does this work in practice?")
        
        return suggestions[:4]  # Max 4 suggestions


# Convenience functions

def rank_results(
    results: List[Dict],
    query: str,
    concepts: List[str],
    reasoning_context: Optional[Dict] = None
) -> List[RankedResult]:
    """Convenience function to rank results."""
    ranker = ResultRanker()
    return ranker.rank_results(results, query, concepts, reasoning_context)


def synthesize_answer(
    query: str,
    results: List[Dict],
    concepts: List[str],
    reasoning_chain: Optional[Dict] = None
) -> SynthesizedAnswer:
    """Convenience function to synthesize an answer."""
    ranker = ResultRanker()
    synthesizer = ResultSynthesizer(ranker)
    
    # Rank results first
    ranked = ranker.rank_results(results, query, concepts)
    
    return synthesizer.synthesize(
        query=query,
        ranked_results=ranked,
        reasoning_chain=reasoning_chain
    )
