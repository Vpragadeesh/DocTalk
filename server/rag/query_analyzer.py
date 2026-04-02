"""
Query Analyzer Module for Deep Search.

Analyzes user queries to determine:
- Query intent and type
- Complexity level (simple, moderate, complex)
- Entities and concepts mentioned
- Sub-questions for multi-hop reasoning
- Required search strategies
"""

import re
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class QueryComplexity(Enum):
    """Query complexity levels."""
    SIMPLE = "simple"      # Direct lookup, single concept
    MODERATE = "moderate"  # Relationship query, 2-3 concepts
    COMPLEX = "complex"    # Multi-hop reasoning, 4+ concepts


class QueryType(Enum):
    """Types of queries based on intent."""
    FACTUAL = "factual"           # What is X?
    COMPARATIVE = "comparative"   # Compare X vs Y
    CAUSAL = "causal"             # Why does X cause Y?
    PROCEDURAL = "procedural"     # How to do X?
    ANALYTICAL = "analytical"     # Analyze/evaluate X
    RELATIONAL = "relational"     # How does X relate to Y?
    EXPLORATORY = "exploratory"   # What about X? / Tell me about X
    AGGREGATIVE = "aggregative"   # Summary, all instances of X


@dataclass
class QueryEntity:
    """Represents an entity extracted from the query."""
    text: str
    entity_type: str  # concept, document, person, organization, etc.
    start_pos: int
    end_pos: int
    confidence: float = 1.0


@dataclass
class SubQuestion:
    """A sub-question derived from the main query."""
    question: str
    purpose: str  # Why this sub-question is needed
    dependencies: List[str] = field(default_factory=list)  # IDs of sub-questions this depends on
    order: int = 0


@dataclass
class AnalyzedQuery:
    """Complete analysis of a user query."""
    original_query: str
    normalized_query: str
    query_type: QueryType
    complexity: QueryComplexity
    entities: List[QueryEntity]
    concepts: List[str]
    sub_questions: List[SubQuestion]
    search_strategies: List[str]
    requires_cross_document: bool
    requires_reasoning: bool
    estimated_steps: int
    confidence: float
    metadata: Dict = field(default_factory=dict)


class QueryAnalyzer:
    """
    Analyzes queries to determine search strategy and reasoning requirements.
    """
    
    # Patterns for query type detection
    COMPARATIVE_PATTERNS = [
        r'\b(compare|comparison|versus|vs\.?|differ|difference|better|worse)\b',
        r'\b(similarities?|differences?|pros?\s+and\s+cons?)\b',
        r'\b(which\s+is|what\'s\s+the\s+difference)\b',
    ]
    
    CAUSAL_PATTERNS = [
        r'\b(why|because|cause|effect|result|impact|consequence|lead\s+to)\b',
        r'\b(how\s+does.*affect|what\s+happens\s+if|what\s+would\s+happen)\b',
        r'\b(due\s+to|as\s+a\s+result|therefore|hence)\b',
    ]
    
    PROCEDURAL_PATTERNS = [
        r'\b(how\s+to|how\s+do\s+I|how\s+can\s+I|steps?\s+to|process\s+for)\b',
        r'\b(implement|create|build|setup|configure|install)\b',
        r'\b(guide|tutorial|instructions?|procedure)\b',
    ]
    
    ANALYTICAL_PATTERNS = [
        r'\b(analyze|analysis|evaluate|evaluation|assess|assessment)\b',
        r'\b(implications?|considerations?|factors?)\b',
        r'\b(strengths?|weaknesses?|opportunities?|threats?)\b',
    ]
    
    RELATIONAL_PATTERNS = [
        r'\b(relate|relationship|connection|link|associated|related)\b',
        r'\b(how\s+does.*connect|what\'s\s+the\s+connection)\b',
        r'\b(between|among|across)\b',
    ]
    
    AGGREGATIVE_PATTERNS = [
        r'\b(all|every|list|summarize|summary|overview|complete)\b',
        r'\b(throughout|across\s+all|in\s+all)\b',
        r'\b(instances?\s+of|occurrences?\s+of|mentions?\s+of)\b',
    ]
    
    MULTI_HOP_INDICATORS = [
        r'\b(given\s+that|assuming|if.*then|based\s+on)\b',
        r'\b(apply|application\s+of|according\s+to)\b',
        r'\b(chapter|section|document)\s+\d+\s+(and|to|through)\s+(chapter|section|document)\s+\d+',
        r'\b(from.*to|between.*and)\b',
    ]
    
    CROSS_DOCUMENT_INDICATORS = [
        r'\b(across\s+documents?|multiple\s+documents?|all\s+documents?)\b',
        r'\b(which\s+documents?|in\s+which\s+files?)\b',
        r'\b(compare.*documents?|documents?.*compare)\b',
        r'\b(contradictions?|conflicts?|inconsistencies?)\b',
    ]

    def __init__(self):
        """Initialize the query analyzer."""
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Compile regex patterns for efficiency."""
        self._comparative_re = [re.compile(p, re.IGNORECASE) for p in self.COMPARATIVE_PATTERNS]
        self._causal_re = [re.compile(p, re.IGNORECASE) for p in self.CAUSAL_PATTERNS]
        self._procedural_re = [re.compile(p, re.IGNORECASE) for p in self.PROCEDURAL_PATTERNS]
        self._analytical_re = [re.compile(p, re.IGNORECASE) for p in self.ANALYTICAL_PATTERNS]
        self._relational_re = [re.compile(p, re.IGNORECASE) for p in self.RELATIONAL_PATTERNS]
        self._aggregative_re = [re.compile(p, re.IGNORECASE) for p in self.AGGREGATIVE_PATTERNS]
        self._multi_hop_re = [re.compile(p, re.IGNORECASE) for p in self.MULTI_HOP_INDICATORS]
        self._cross_doc_re = [re.compile(p, re.IGNORECASE) for p in self.CROSS_DOCUMENT_INDICATORS]
    
    def analyze(self, query: str, context: Optional[Dict] = None) -> AnalyzedQuery:
        """
        Analyze a query to determine search strategy.
        
        Args:
            query: The user's query string
            context: Optional context (conversation history, user info)
            
        Returns:
            AnalyzedQuery with complete analysis
        """
        normalized = self._normalize_query(query)
        query_type = self._detect_query_type(normalized)
        entities = self._extract_entities(normalized)
        concepts = self._extract_concepts(normalized, entities)
        complexity = self._assess_complexity(normalized, entities, concepts, query_type)
        requires_cross_doc = self._check_cross_document(normalized)
        requires_reasoning = self._check_reasoning_required(normalized, complexity, query_type)
        sub_questions = self._generate_sub_questions(normalized, query_type, complexity, concepts)
        search_strategies = self._determine_search_strategies(query_type, complexity, requires_cross_doc)
        
        return AnalyzedQuery(
            original_query=query,
            normalized_query=normalized,
            query_type=query_type,
            complexity=complexity,
            entities=entities,
            concepts=concepts,
            sub_questions=sub_questions,
            search_strategies=search_strategies,
            requires_cross_document=requires_cross_doc,
            requires_reasoning=requires_reasoning,
            estimated_steps=len(sub_questions) if sub_questions else 1,
            confidence=self._calculate_confidence(entities, concepts, query_type),
            metadata={
                "has_context": context is not None,
                "entity_count": len(entities),
                "concept_count": len(concepts),
            }
        )
    
    def _normalize_query(self, query: str) -> str:
        """Normalize query text."""
        # Remove extra whitespace
        normalized = ' '.join(query.split())
        # Remove trailing punctuation for analysis
        normalized = normalized.strip('?!.')
        return normalized
    
    def _detect_query_type(self, query: str) -> QueryType:
        """Detect the type of query based on patterns."""
        query_lower = query.lower()
        
        # Check patterns in order of specificity
        if any(p.search(query_lower) for p in self._comparative_re):
            return QueryType.COMPARATIVE
        if any(p.search(query_lower) for p in self._causal_re):
            return QueryType.CAUSAL
        if any(p.search(query_lower) for p in self._procedural_re):
            return QueryType.PROCEDURAL
        if any(p.search(query_lower) for p in self._analytical_re):
            return QueryType.ANALYTICAL
        if any(p.search(query_lower) for p in self._relational_re):
            return QueryType.RELATIONAL
        if any(p.search(query_lower) for p in self._aggregative_re):
            return QueryType.AGGREGATIVE
        
        # Default based on question words
        if query_lower.startswith(('what is', 'what are', 'who is', 'when', 'where')):
            return QueryType.FACTUAL
        if query_lower.startswith(('tell me about', 'explain', 'describe')):
            return QueryType.EXPLORATORY
        
        return QueryType.FACTUAL
    
    def _extract_entities(self, query: str) -> List[QueryEntity]:
        """Extract entities from the query using pattern matching."""
        entities = []
        
        # Document references (chapter X, section Y, document Z)
        doc_pattern = re.compile(
            r'\b(chapter|section|document|file|page)\s*(\d+|[a-z])\b',
            re.IGNORECASE
        )
        for match in doc_pattern.finditer(query):
            entities.append(QueryEntity(
                text=match.group(),
                entity_type="document_reference",
                start_pos=match.start(),
                end_pos=match.end()
            ))
        
        # Strategy/approach references
        strategy_pattern = re.compile(
            r'\b(strategy|approach|method|solution|option|plan)\s+([A-Z]|\d+|[a-z]+)\b',
            re.IGNORECASE
        )
        for match in strategy_pattern.finditer(query):
            entities.append(QueryEntity(
                text=match.group(),
                entity_type="strategy",
                start_pos=match.start(),
                end_pos=match.end()
            ))
        
        # Quoted terms (explicit concepts)
        quote_pattern = re.compile(r'"([^"]+)"')
        for match in quote_pattern.finditer(query):
            entities.append(QueryEntity(
                text=match.group(1),
                entity_type="explicit_concept",
                start_pos=match.start(),
                end_pos=match.end(),
                confidence=1.0
            ))
        
        # Technical terms (capitalized multi-word phrases)
        technical_pattern = re.compile(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b')
        for match in technical_pattern.finditer(query):
            entities.append(QueryEntity(
                text=match.group(),
                entity_type="technical_term",
                start_pos=match.start(),
                end_pos=match.end(),
                confidence=0.8
            ))
        
        return entities
    
    def _extract_concepts(self, query: str, entities: List[QueryEntity]) -> List[str]:
        """Extract key concepts from the query."""
        concepts = []
        
        # Add entity texts as concepts
        for entity in entities:
            concepts.append(entity.text.lower())
        
        # Extract noun phrases (simplified approach)
        # Remove common words and extract remaining key terms
        stopwords = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
            'of', 'in', 'to', 'for', 'with', 'on', 'at', 'from', 'by', 'about',
            'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
            'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'why', 'how',
            'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
            'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
            'very', 'just', 'what', 'which', 'who', 'this', 'that', 'these', 'those',
            'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'him',
            'she', 'her', 'it', 'its', 'they', 'them', 'their'
        }
        
        # Split and filter
        words = re.findall(r'\b[a-zA-Z]{3,}\b', query.lower())
        for word in words:
            if word not in stopwords and word not in concepts:
                concepts.append(word)
        
        return list(set(concepts))
    
    def _assess_complexity(
        self,
        query: str,
        entities: List[QueryEntity],
        concepts: List[str],
        query_type: QueryType
    ) -> QueryComplexity:
        """Assess query complexity based on multiple factors."""
        score = 0
        
        # Factor 1: Number of entities
        entity_count = len(entities)
        if entity_count >= 4:
            score += 3
        elif entity_count >= 2:
            score += 2
        elif entity_count >= 1:
            score += 1
        
        # Factor 2: Number of concepts
        concept_count = len(concepts)
        if concept_count >= 6:
            score += 3
        elif concept_count >= 3:
            score += 2
        elif concept_count >= 1:
            score += 1
        
        # Factor 3: Query type complexity
        complex_types = {QueryType.COMPARATIVE, QueryType.CAUSAL, QueryType.ANALYTICAL}
        if query_type in complex_types:
            score += 2
        elif query_type in {QueryType.RELATIONAL, QueryType.AGGREGATIVE}:
            score += 1
        
        # Factor 4: Multi-hop indicators
        if any(p.search(query) for p in self._multi_hop_re):
            score += 3
        
        # Factor 5: Query length
        word_count = len(query.split())
        if word_count >= 20:
            score += 2
        elif word_count >= 10:
            score += 1
        
        # Map score to complexity
        if score >= 8:
            return QueryComplexity.COMPLEX
        elif score >= 4:
            return QueryComplexity.MODERATE
        else:
            return QueryComplexity.SIMPLE
    
    def _check_cross_document(self, query: str) -> bool:
        """Check if query requires cross-document analysis."""
        return any(p.search(query) for p in self._cross_doc_re)
    
    def _check_reasoning_required(
        self,
        query: str,
        complexity: QueryComplexity,
        query_type: QueryType
    ) -> bool:
        """Determine if reasoning (vs simple retrieval) is required."""
        # Complex queries always need reasoning
        if complexity == QueryComplexity.COMPLEX:
            return True
        
        # Certain query types always need reasoning
        reasoning_types = {
            QueryType.COMPARATIVE,
            QueryType.CAUSAL,
            QueryType.ANALYTICAL
        }
        if query_type in reasoning_types:
            return True
        
        # Multi-hop indicators
        if any(p.search(query) for p in self._multi_hop_re):
            return True
        
        return False
    
    def _generate_sub_questions(
        self,
        query: str,
        query_type: QueryType,
        complexity: QueryComplexity,
        concepts: List[str]
    ) -> List[SubQuestion]:
        """Generate sub-questions for multi-hop reasoning."""
        sub_questions = []
        
        if complexity == QueryComplexity.SIMPLE:
            # No sub-questions needed for simple queries
            return sub_questions
        
        if query_type == QueryType.COMPARATIVE:
            # For comparisons, extract items being compared
            items = self._extract_comparison_items(query)
            if len(items) >= 2:
                for i, item in enumerate(items[:3]):  # Max 3 items
                    sub_questions.append(SubQuestion(
                        question=f"What are the key characteristics of {item}?",
                        purpose=f"Understand {item} for comparison",
                        order=i + 1
                    ))
                sub_questions.append(SubQuestion(
                    question=f"What are the key differences and similarities between {' and '.join(items[:3])}?",
                    purpose="Synthesize comparison",
                    dependencies=[f"sq_{i}" for i in range(len(items[:3]))],
                    order=len(items[:3]) + 1
                ))
        
        elif query_type == QueryType.CAUSAL:
            # For causal queries, break into cause and effect
            sub_questions.append(SubQuestion(
                question="What is the subject/cause mentioned in the query?",
                purpose="Identify the cause or condition",
                order=1
            ))
            sub_questions.append(SubQuestion(
                question="What effects or outcomes are discussed?",
                purpose="Identify effects and impacts",
                order=2
            ))
            sub_questions.append(SubQuestion(
                question="What is the mechanism or relationship between cause and effect?",
                purpose="Understand the causal relationship",
                dependencies=["sq_0", "sq_1"],
                order=3
            ))
        
        elif query_type == QueryType.RELATIONAL:
            # For relational queries, identify entities and find connections
            if len(concepts) >= 2:
                sub_questions.append(SubQuestion(
                    question=f"What is {concepts[0]}?",
                    purpose=f"Understand first concept",
                    order=1
                ))
                sub_questions.append(SubQuestion(
                    question=f"What is {concepts[1]}?",
                    purpose="Understand second concept",
                    order=2
                ))
                sub_questions.append(SubQuestion(
                    question=f"How are {concepts[0]} and {concepts[1]} connected or related?",
                    purpose="Find relationships",
                    dependencies=["sq_0", "sq_1"],
                    order=3
                ))
        
        elif complexity == QueryComplexity.COMPLEX:
            # For complex queries, create generic reasoning steps
            sub_questions.append(SubQuestion(
                question="What are the main components or aspects of this query?",
                purpose="Decompose the query",
                order=1
            ))
            sub_questions.append(SubQuestion(
                question="What information from the documents is relevant to each component?",
                purpose="Gather relevant information",
                dependencies=["sq_0"],
                order=2
            ))
            sub_questions.append(SubQuestion(
                question="How do these pieces of information connect to answer the full query?",
                purpose="Synthesize the answer",
                dependencies=["sq_1"],
                order=3
            ))
        
        return sub_questions
    
    def _extract_comparison_items(self, query: str) -> List[str]:
        """Extract items being compared in a comparison query."""
        items = []
        
        # Pattern: X vs Y, X versus Y
        vs_pattern = re.compile(r'(\w+(?:\s+\w+)*)\s+(?:vs\.?|versus)\s+(\w+(?:\s+\w+)*)', re.IGNORECASE)
        match = vs_pattern.search(query)
        if match:
            items.extend([match.group(1).strip(), match.group(2).strip()])
        
        # Pattern: compare X and Y
        compare_pattern = re.compile(r'compare\s+(\w+(?:\s+\w+)*)\s+(?:and|with|to)\s+(\w+(?:\s+\w+)*)', re.IGNORECASE)
        match = compare_pattern.search(query)
        if match:
            items.extend([match.group(1).strip(), match.group(2).strip()])
        
        # Pattern: X or Y
        or_pattern = re.compile(r'(\w+(?:\s+\w+)*)\s+or\s+(\w+(?:\s+\w+)*)', re.IGNORECASE)
        match = or_pattern.search(query)
        if match:
            items.extend([match.group(1).strip(), match.group(2).strip()])
        
        # Remove duplicates while preserving order
        seen = set()
        unique_items = []
        for item in items:
            item_lower = item.lower()
            if item_lower not in seen:
                seen.add(item_lower)
                unique_items.append(item)
        
        return unique_items
    
    def _determine_search_strategies(
        self,
        query_type: QueryType,
        complexity: QueryComplexity,
        requires_cross_doc: bool
    ) -> List[str]:
        """Determine which search strategies to use."""
        strategies = ["vector_search"]  # Always use vector search
        
        # Add keyword search for factual and procedural queries
        if query_type in {QueryType.FACTUAL, QueryType.PROCEDURAL}:
            strategies.append("keyword_search")
        
        # Add semantic search for complex queries
        if complexity in {QueryComplexity.MODERATE, QueryComplexity.COMPLEX}:
            strategies.append("semantic_search")
        
        # Add cross-document search if needed
        if requires_cross_doc:
            strategies.append("cross_document_search")
        
        # Add relationship search for relational queries
        if query_type == QueryType.RELATIONAL:
            strategies.append("relationship_search")
        
        return strategies
    
    def _calculate_confidence(
        self,
        entities: List[QueryEntity],
        concepts: List[str],
        query_type: QueryType
    ) -> float:
        """Calculate confidence score for the analysis."""
        confidence = 0.7  # Base confidence
        
        # Increase confidence if we found entities
        if entities:
            confidence += 0.1
        
        # Increase confidence if we found concepts
        if concepts:
            confidence += 0.1
        
        # Increase confidence for clear query types (not exploratory)
        if query_type != QueryType.EXPLORATORY:
            confidence += 0.1
        
        return min(confidence, 1.0)


# Global instance for reuse
_analyzer = None


def get_query_analyzer() -> QueryAnalyzer:
    """Get the global query analyzer instance."""
    global _analyzer
    if _analyzer is None:
        _analyzer = QueryAnalyzer()
    return _analyzer


def analyze_query(query: str, context: Optional[Dict] = None) -> AnalyzedQuery:
    """
    Convenience function to analyze a query.
    
    Args:
        query: The user's query string
        context: Optional context (conversation history, etc.)
        
    Returns:
        AnalyzedQuery with complete analysis
    """
    analyzer = get_query_analyzer()
    return analyzer.analyze(query, context)
