"""
Search Cache for DocTalk

Caches web search results in MongoDB to reduce API calls and improve performance.
"""

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from db.mongo import get_database

logger = logging.getLogger(__name__)

# Default cache TTL (24 hours)
DEFAULT_CACHE_TTL_HOURS = 24


class SearchCache:
    """
    Cache manager for web search results.
    
    Stores search results in MongoDB with TTL-based expiry.
    """
    
    def __init__(self, ttl_hours: int = DEFAULT_CACHE_TTL_HOURS):
        """
        Initialize search cache.
        
        Args:
            ttl_hours: Cache time-to-live in hours
        """
        self.ttl_hours = ttl_hours
        self.db = get_database()
        self.collection = self.db["search_cache"]
        
        # Create TTL index for automatic expiry
        self._ensure_indexes()
    
    def _ensure_indexes(self):
        """Create necessary indexes."""
        try:
            # TTL index for automatic deletion
            self.collection.create_index(
                "expires_at",
                expireAfterSeconds=0
            )
            
            # Index for query lookup
            self.collection.create_index([
                ("query_hash", 1),
                ("user_id", 1)
            ])
            
            logger.info("Search cache indexes created")
        except Exception as e:
            logger.warning(f"Could not create indexes: {e}")
    
    def _get_query_hash(self, query: str, search_type: str = "web") -> str:
        """Generate hash for cache key."""
        content = f"{query.lower().strip()}:{search_type}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def get(
        self,
        user_id: str,
        query: str,
        search_type: str = "web"
    ) -> Optional[Dict]:
        """
        Get cached search results.
        
        Args:
            user_id: User identifier
            query: Search query
            search_type: Type of search (web, hybrid)
            
        Returns:
            Cached results or None if not found/expired
        """
        query_hash = self._get_query_hash(query, search_type)
        
        cached = self.collection.find_one({
            "query_hash": query_hash,
            "user_id": user_id,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if cached:
            logger.info(f"Cache hit for query: {query[:50]}...")
            # Remove MongoDB _id from response
            cached.pop("_id", None)
            return cached
        
        return None
    
    def set(
        self,
        user_id: str,
        query: str,
        results: List[Dict],
        search_type: str = "web",
        processing_time_ms: int = 0,
        metadata: Optional[Dict] = None
    ) -> str:
        """
        Cache search results.
        
        Args:
            user_id: User identifier
            query: Search query
            results: Search results to cache
            search_type: Type of search
            processing_time_ms: Time taken to get results
            metadata: Additional metadata
            
        Returns:
            Cache entry ID
        """
        query_hash = self._get_query_hash(query, search_type)
        expires_at = datetime.utcnow() + timedelta(hours=self.ttl_hours)
        
        cache_entry = {
            "query_hash": query_hash,
            "user_id": user_id,
            "query": query,
            "search_type": search_type,
            "results": results,
            "total_results": len(results),
            "processing_time_ms": processing_time_ms,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
            "metadata": metadata or {}
        }
        
        # Upsert to avoid duplicates
        result = self.collection.update_one(
            {"query_hash": query_hash, "user_id": user_id},
            {"$set": cache_entry},
            upsert=True
        )
        
        logger.info(f"Cached results for query: {query[:50]}...")
        
        return query_hash
    
    def delete(self, user_id: str, query_hash: str) -> bool:
        """
        Delete a specific cache entry.
        
        Args:
            user_id: User identifier
            query_hash: Hash of the query to delete
            
        Returns:
            True if deleted, False otherwise
        """
        result = self.collection.delete_one({
            "query_hash": query_hash,
            "user_id": user_id
        })
        
        return result.deleted_count > 0
    
    def clear_user_cache(self, user_id: str) -> int:
        """
        Clear all cached results for a user.
        
        Args:
            user_id: User identifier
            
        Returns:
            Number of entries deleted
        """
        result = self.collection.delete_many({"user_id": user_id})
        logger.info(f"Cleared {result.deleted_count} cache entries for user {user_id}")
        return result.deleted_count
    
    def get_user_cache_stats(self, user_id: str) -> Dict:
        """
        Get cache statistics for a user.
        
        Args:
            user_id: User identifier
            
        Returns:
            Cache statistics
        """
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": "$search_type",
                "count": {"$sum": 1},
                "total_results": {"$sum": "$total_results"}
            }}
        ]
        
        stats = list(self.collection.aggregate(pipeline))
        
        total_entries = sum(s["count"] for s in stats)
        total_results = sum(s["total_results"] for s in stats)
        
        return {
            "user_id": user_id,
            "total_cached_queries": total_entries,
            "total_cached_results": total_results,
            "by_type": {s["_id"]: s["count"] for s in stats}
        }
    
    def search_cache(
        self,
        user_id: str,
        query: str,
        limit: int = 10
    ) -> List[Dict]:
        """
        Search cached queries by text.
        
        Args:
            user_id: User identifier
            query: Search text
            limit: Maximum results
            
        Returns:
            List of matching cached queries
        """
        # Simple text search in query field
        cursor = self.collection.find(
            {
                "user_id": user_id,
                "query": {"$regex": query, "$options": "i"},
                "expires_at": {"$gt": datetime.utcnow()}
            },
            {"_id": 0, "query": 1, "query_hash": 1, "search_type": 1, 
             "total_results": 1, "created_at": 1}
        ).sort("created_at", -1).limit(limit)
        
        return list(cursor)


# Singleton instance
_search_cache_instance: Optional[SearchCache] = None


def get_search_cache() -> SearchCache:
    """Get or create the search cache singleton instance."""
    global _search_cache_instance
    if _search_cache_instance is None:
        _search_cache_instance = SearchCache()
    return _search_cache_instance
