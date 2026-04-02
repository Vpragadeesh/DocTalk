"""
Knowledge Graph Module for Deep Search.

Builds and queries a knowledge graph of documents, concepts, and relationships.
Stores data in MongoDB for persistence and cross-session access.
"""

import os
import logging
import hashlib
from typing import List, Dict, Optional, Set, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


@dataclass
class Concept:
    """A concept extracted from documents."""
    concept_id: str
    name: str
    normalized_name: str
    concept_type: str  # term, entity, topic, etc.
    document_ids: List[str] = field(default_factory=list)
    frequency: int = 1
    importance: float = 0.5
    related_concepts: List[str] = field(default_factory=list)
    metadata: Dict = field(default_factory=dict)


@dataclass
class ConceptRelationship:
    """A relationship between two concepts."""
    relationship_id: str
    source_concept: str
    target_concept: str
    relationship_type: str  # causes, supports, contradicts, similar-to, etc.
    strength: float  # 0.0 to 1.0
    evidence: List[str] = field(default_factory=list)
    document_ids: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class DocumentNode:
    """A document in the knowledge graph."""
    document_id: str
    filename: str
    concepts: List[str] = field(default_factory=list)
    related_documents: List[Tuple[str, float]] = field(default_factory=list)  # (doc_id, similarity)
    metadata: Dict = field(default_factory=dict)


@dataclass 
class GraphQuery:
    """Query against the knowledge graph."""
    concepts: List[str] = field(default_factory=list)
    relationship_types: List[str] = field(default_factory=list)
    document_ids: List[str] = field(default_factory=list)
    max_hops: int = 2
    min_strength: float = 0.3


@dataclass
class GraphResult:
    """Results from a knowledge graph query."""
    concepts: List[Concept]
    relationships: List[ConceptRelationship]
    documents: List[DocumentNode]
    paths: List[List[str]]  # Paths between concepts
    metadata: Dict = field(default_factory=dict)


class KnowledgeGraph:
    """
    Manages the document knowledge graph.
    Uses MongoDB for persistence.
    """
    
    def __init__(self, db=None):
        """
        Initialize the knowledge graph.
        
        Args:
            db: MongoDB database instance (uses default if not provided)
        """
        self.db = db
        self._concepts_cache: Dict[str, Dict[str, Concept]] = {}  # user_id -> concept_id -> Concept
        self._relationships_cache: Dict[str, List[ConceptRelationship]] = {}  # user_id -> relationships
        
    def _get_db(self):
        """Get database instance lazily."""
        if self.db is None:
            from db.mongo import get_database
            self.db = get_database()
        return self.db
    
    def _get_concepts_collection(self):
        """Get concepts collection."""
        return self._get_db()["document_concepts"]
    
    def _get_relationships_collection(self):
        """Get relationships collection."""
        return self._get_db()["concept_relationships"]
    
    def _generate_concept_id(self, name: str, user_id: str) -> str:
        """Generate a unique concept ID."""
        normalized = name.lower().strip()
        hash_input = f"{user_id}:{normalized}"
        return hashlib.md5(hash_input.encode()).hexdigest()[:12]
    
    def _normalize_concept(self, name: str) -> str:
        """Normalize a concept name."""
        return name.lower().strip()
    
    # ==================== Concept Operations ====================
    
    def add_concept(
        self,
        user_id: str,
        name: str,
        concept_type: str = "term",
        document_id: Optional[str] = None,
        importance: float = 0.5
    ) -> Concept:
        """
        Add a concept to the graph.
        
        Args:
            user_id: User identifier
            name: Concept name
            concept_type: Type of concept
            document_id: Source document ID
            importance: Importance score
            
        Returns:
            Created or updated Concept
        """
        normalized = self._normalize_concept(name)
        concept_id = self._generate_concept_id(name, user_id)
        
        collection = self._get_concepts_collection()
        
        # Check if concept exists
        existing = collection.find_one({
            "user_id": user_id,
            "concept_id": concept_id
        })
        
        if existing:
            # Update existing concept
            update = {
                "$inc": {"frequency": 1},
                "$set": {"importance": max(existing.get("importance", 0), importance)}
            }
            if document_id:
                update["$addToSet"] = {"document_ids": document_id}
            
            collection.update_one(
                {"user_id": user_id, "concept_id": concept_id},
                update
            )
            
            # Return updated concept
            updated = collection.find_one({"user_id": user_id, "concept_id": concept_id})
            return Concept(
                concept_id=concept_id,
                name=name,
                normalized_name=normalized,
                concept_type=concept_type,
                document_ids=updated.get("document_ids", []),
                frequency=updated.get("frequency", 1),
                importance=updated.get("importance", importance),
                related_concepts=updated.get("related_concepts", [])
            )
        else:
            # Create new concept
            doc_ids = [document_id] if document_id else []
            concept_doc = {
                "user_id": user_id,
                "concept_id": concept_id,
                "name": name,
                "normalized_name": normalized,
                "concept_type": concept_type,
                "document_ids": doc_ids,
                "frequency": 1,
                "importance": importance,
                "related_concepts": [],
                "created_at": datetime.utcnow()
            }
            collection.insert_one(concept_doc)
            
            return Concept(
                concept_id=concept_id,
                name=name,
                normalized_name=normalized,
                concept_type=concept_type,
                document_ids=doc_ids,
                frequency=1,
                importance=importance
            )
    
    def get_concept(self, user_id: str, name: str) -> Optional[Concept]:
        """Get a concept by name."""
        normalized = self._normalize_concept(name)
        concept_id = self._generate_concept_id(name, user_id)
        
        doc = self._get_concepts_collection().find_one({
            "user_id": user_id,
            "concept_id": concept_id
        })
        
        if doc:
            return Concept(
                concept_id=doc["concept_id"],
                name=doc["name"],
                normalized_name=doc["normalized_name"],
                concept_type=doc.get("concept_type", "term"),
                document_ids=doc.get("document_ids", []),
                frequency=doc.get("frequency", 1),
                importance=doc.get("importance", 0.5),
                related_concepts=doc.get("related_concepts", [])
            )
        return None
    
    def get_user_concepts(
        self,
        user_id: str,
        min_frequency: int = 1,
        min_importance: float = 0.0,
        limit: int = 100
    ) -> List[Concept]:
        """Get all concepts for a user."""
        collection = self._get_concepts_collection()
        
        query = {
            "user_id": user_id,
            "frequency": {"$gte": min_frequency},
            "importance": {"$gte": min_importance}
        }
        
        docs = collection.find(query).sort("importance", -1).limit(limit)
        
        concepts = []
        for doc in docs:
            concepts.append(Concept(
                concept_id=doc["concept_id"],
                name=doc["name"],
                normalized_name=doc["normalized_name"],
                concept_type=doc.get("concept_type", "term"),
                document_ids=doc.get("document_ids", []),
                frequency=doc.get("frequency", 1),
                importance=doc.get("importance", 0.5),
                related_concepts=doc.get("related_concepts", [])
            ))
        
        return concepts
    
    def search_concepts(
        self,
        user_id: str,
        query: str,
        limit: int = 10
    ) -> List[Concept]:
        """Search for concepts matching a query."""
        collection = self._get_concepts_collection()
        
        # Simple text search on normalized name
        regex_pattern = query.lower().replace(" ", ".*")
        
        docs = collection.find({
            "user_id": user_id,
            "normalized_name": {"$regex": regex_pattern, "$options": "i"}
        }).sort("importance", -1).limit(limit)
        
        return [
            Concept(
                concept_id=doc["concept_id"],
                name=doc["name"],
                normalized_name=doc["normalized_name"],
                concept_type=doc.get("concept_type", "term"),
                document_ids=doc.get("document_ids", []),
                frequency=doc.get("frequency", 1),
                importance=doc.get("importance", 0.5),
                related_concepts=doc.get("related_concepts", [])
            )
            for doc in docs
        ]
    
    # ==================== Relationship Operations ====================
    
    def add_relationship(
        self,
        user_id: str,
        source_concept: str,
        target_concept: str,
        relationship_type: str,
        strength: float = 0.5,
        evidence: Optional[str] = None,
        document_id: Optional[str] = None
    ) -> ConceptRelationship:
        """
        Add a relationship between concepts.
        
        Args:
            user_id: User identifier
            source_concept: Source concept name
            target_concept: Target concept name
            relationship_type: Type of relationship
            strength: Relationship strength (0-1)
            evidence: Supporting evidence text
            document_id: Source document ID
            
        Returns:
            Created or updated relationship
        """
        collection = self._get_relationships_collection()
        
        source_id = self._generate_concept_id(source_concept, user_id)
        target_id = self._generate_concept_id(target_concept, user_id)
        
        # Generate relationship ID
        rel_hash = f"{user_id}:{source_id}:{target_id}:{relationship_type}"
        relationship_id = hashlib.md5(rel_hash.encode()).hexdigest()[:16]
        
        # Check if relationship exists
        existing = collection.find_one({
            "user_id": user_id,
            "relationship_id": relationship_id
        })
        
        if existing:
            # Update existing relationship
            update = {
                "$set": {"strength": max(existing.get("strength", 0), strength)}
            }
            if evidence:
                update["$addToSet"] = {"evidence": evidence}
            if document_id:
                update.setdefault("$addToSet", {})["document_ids"] = document_id
            
            collection.update_one(
                {"user_id": user_id, "relationship_id": relationship_id},
                update
            )
            
            updated = collection.find_one({"user_id": user_id, "relationship_id": relationship_id})
            return ConceptRelationship(
                relationship_id=relationship_id,
                source_concept=source_concept,
                target_concept=target_concept,
                relationship_type=relationship_type,
                strength=updated.get("strength", strength),
                evidence=updated.get("evidence", []),
                document_ids=updated.get("document_ids", [])
            )
        else:
            # Create new relationship
            rel_doc = {
                "user_id": user_id,
                "relationship_id": relationship_id,
                "source_concept": source_concept,
                "source_concept_id": source_id,
                "target_concept": target_concept,
                "target_concept_id": target_id,
                "relationship_type": relationship_type,
                "strength": strength,
                "evidence": [evidence] if evidence else [],
                "document_ids": [document_id] if document_id else [],
                "created_at": datetime.utcnow()
            }
            collection.insert_one(rel_doc)
            
            # Update related_concepts on both concept documents
            concepts_col = self._get_concepts_collection()
            concepts_col.update_one(
                {"user_id": user_id, "concept_id": source_id},
                {"$addToSet": {"related_concepts": target_id}}
            )
            concepts_col.update_one(
                {"user_id": user_id, "concept_id": target_id},
                {"$addToSet": {"related_concepts": source_id}}
            )
            
            return ConceptRelationship(
                relationship_id=relationship_id,
                source_concept=source_concept,
                target_concept=target_concept,
                relationship_type=relationship_type,
                strength=strength,
                evidence=[evidence] if evidence else [],
                document_ids=[document_id] if document_id else []
            )
    
    def get_relationships(
        self,
        user_id: str,
        concept: Optional[str] = None,
        relationship_type: Optional[str] = None,
        min_strength: float = 0.0,
        limit: int = 50
    ) -> List[ConceptRelationship]:
        """Get relationships, optionally filtered."""
        collection = self._get_relationships_collection()
        
        query = {"user_id": user_id, "strength": {"$gte": min_strength}}
        
        if concept:
            concept_id = self._generate_concept_id(concept, user_id)
            query["$or"] = [
                {"source_concept_id": concept_id},
                {"target_concept_id": concept_id}
            ]
        
        if relationship_type:
            query["relationship_type"] = relationship_type
        
        docs = collection.find(query).sort("strength", -1).limit(limit)
        
        return [
            ConceptRelationship(
                relationship_id=doc["relationship_id"],
                source_concept=doc["source_concept"],
                target_concept=doc["target_concept"],
                relationship_type=doc["relationship_type"],
                strength=doc.get("strength", 0.5),
                evidence=doc.get("evidence", []),
                document_ids=doc.get("document_ids", [])
            )
            for doc in docs
        ]
    
    # ==================== Document Operations ====================
    
    def add_document_concepts(
        self,
        user_id: str,
        document_id: str,
        filename: str,
        concepts: List[Dict]
    ) -> None:
        """
        Add concepts extracted from a document.
        
        Args:
            user_id: User identifier
            document_id: Document ID
            filename: Document filename
            concepts: List of concept dicts with name, type, importance
        """
        for concept_data in concepts:
            name = concept_data.get("name", "")
            if not name:
                continue
            
            self.add_concept(
                user_id=user_id,
                name=name,
                concept_type=concept_data.get("type", "term"),
                document_id=document_id,
                importance=concept_data.get("importance", 0.5)
            )
    
    def get_document_concepts(
        self,
        user_id: str,
        document_id: str
    ) -> List[Concept]:
        """Get all concepts for a specific document."""
        collection = self._get_concepts_collection()
        
        docs = collection.find({
            "user_id": user_id,
            "document_ids": document_id
        }).sort("importance", -1)
        
        return [
            Concept(
                concept_id=doc["concept_id"],
                name=doc["name"],
                normalized_name=doc["normalized_name"],
                concept_type=doc.get("concept_type", "term"),
                document_ids=doc.get("document_ids", []),
                frequency=doc.get("frequency", 1),
                importance=doc.get("importance", 0.5),
                related_concepts=doc.get("related_concepts", [])
            )
            for doc in docs
        ]
    
    def find_similar_documents(
        self,
        user_id: str,
        document_id: str,
        limit: int = 5
    ) -> List[Tuple[str, float]]:
        """
        Find documents similar to a given document based on shared concepts.
        
        Returns:
            List of (document_id, similarity_score) tuples
        """
        # Get concepts for the target document
        target_concepts = set(
            c.concept_id for c in self.get_document_concepts(user_id, document_id)
        )
        
        if not target_concepts:
            return []
        
        # Get all concepts for user
        all_concepts = self.get_user_concepts(user_id, limit=1000)
        
        # Build document -> concepts mapping
        doc_concepts: Dict[str, Set[str]] = defaultdict(set)
        for concept in all_concepts:
            for doc_id in concept.document_ids:
                if doc_id != document_id:
                    doc_concepts[doc_id].add(concept.concept_id)
        
        # Calculate Jaccard similarity
        similarities = []
        for doc_id, concepts in doc_concepts.items():
            intersection = len(target_concepts & concepts)
            union = len(target_concepts | concepts)
            if union > 0:
                similarity = intersection / union
                similarities.append((doc_id, similarity))
        
        # Sort by similarity and return top results
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:limit]
    
    # ==================== Graph Queries ====================
    
    def query_graph(
        self,
        user_id: str,
        query: GraphQuery
    ) -> GraphResult:
        """
        Query the knowledge graph.
        
        Args:
            user_id: User identifier
            query: Graph query parameters
            
        Returns:
            GraphResult with matching concepts, relationships, and paths
        """
        concepts = []
        relationships = []
        documents = []
        paths = []
        
        # Get concepts matching query
        if query.concepts:
            for concept_name in query.concepts:
                concept = self.get_concept(user_id, concept_name)
                if concept:
                    concepts.append(concept)
                else:
                    # Try search
                    found = self.search_concepts(user_id, concept_name, limit=3)
                    concepts.extend(found)
        
        # Get relationships
        for concept in concepts:
            rels = self.get_relationships(
                user_id=user_id,
                concept=concept.name,
                min_strength=query.min_strength
            )
            if query.relationship_types:
                rels = [r for r in rels if r.relationship_type in query.relationship_types]
            relationships.extend(rels)
        
        # Find paths between concepts (simple BFS)
        if len(concepts) >= 2:
            for i in range(len(concepts) - 1):
                for j in range(i + 1, len(concepts)):
                    path = self._find_path(
                        user_id,
                        concepts[i].concept_id,
                        concepts[j].concept_id,
                        max_hops=query.max_hops
                    )
                    if path:
                        paths.append(path)
        
        # Deduplicate
        seen_concepts = set()
        unique_concepts = []
        for c in concepts:
            if c.concept_id not in seen_concepts:
                seen_concepts.add(c.concept_id)
                unique_concepts.append(c)
        
        seen_rels = set()
        unique_rels = []
        for r in relationships:
            if r.relationship_id not in seen_rels:
                seen_rels.add(r.relationship_id)
                unique_rels.append(r)
        
        return GraphResult(
            concepts=unique_concepts,
            relationships=unique_rels,
            documents=documents,
            paths=paths,
            metadata={
                "query_concepts": query.concepts,
                "max_hops": query.max_hops
            }
        )
    
    def _find_path(
        self,
        user_id: str,
        source_id: str,
        target_id: str,
        max_hops: int = 3
    ) -> Optional[List[str]]:
        """Find a path between two concepts using BFS."""
        if source_id == target_id:
            return [source_id]
        
        # Get all relationships for user
        all_rels = self.get_relationships(user_id, limit=1000)
        
        # Build adjacency list
        graph: Dict[str, Set[str]] = defaultdict(set)
        for rel in all_rels:
            source = rel.source_concept
            target = rel.target_concept
            source_cid = self._generate_concept_id(source, user_id)
            target_cid = self._generate_concept_id(target, user_id)
            graph[source_cid].add(target_cid)
            graph[target_cid].add(source_cid)
        
        # BFS
        from collections import deque
        queue = deque([(source_id, [source_id])])
        visited = {source_id}
        
        while queue:
            current, path = queue.popleft()
            
            if len(path) > max_hops + 1:
                continue
            
            for neighbor in graph.get(current, []):
                if neighbor == target_id:
                    return path + [neighbor]
                
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))
        
        return None
    
    # ==================== Cleanup ====================
    
    def delete_document_concepts(self, user_id: str, document_id: str) -> None:
        """Remove a document from all concepts."""
        collection = self._get_concepts_collection()
        
        # Remove document from document_ids arrays
        collection.update_many(
            {"user_id": user_id, "document_ids": document_id},
            {"$pull": {"document_ids": document_id}}
        )
        
        # Delete concepts with no documents
        collection.delete_many({
            "user_id": user_id,
            "document_ids": {"$size": 0}
        })
    
    def delete_user_graph(self, user_id: str) -> None:
        """Delete all graph data for a user."""
        self._get_concepts_collection().delete_many({"user_id": user_id})
        self._get_relationships_collection().delete_many({"user_id": user_id})


# Global instance
_knowledge_graph = None


def get_knowledge_graph() -> KnowledgeGraph:
    """Get the global knowledge graph instance."""
    global _knowledge_graph
    if _knowledge_graph is None:
        _knowledge_graph = KnowledgeGraph()
    return _knowledge_graph
