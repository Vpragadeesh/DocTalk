"""Chat storage module for managing chat history in MongoDB."""

from datetime import datetime
from typing import List, Dict, Any, Optional
from bson import ObjectId
import uuid
import logging

from db.mongo import get_database

logger = logging.getLogger(__name__)


class ChatStorage:
    """Handles chat history CRUD operations in MongoDB."""

    def __init__(self):
        self.collection_name = "chat_history"

    def _get_collection(self):
        """Get the chat_history collection."""
        db = get_database()
        return db[self.collection_name]

    async def ensure_indexes(self):
        """Create necessary indexes for chat_history collection."""
        try:
            collection = self._get_collection()
            collection.create_index([("user_id", 1), ("conversation_id", 1), ("timestamp", -1)])
            collection.create_index([("user_id", 1), ("timestamp", -1)])
            collection.create_index([("content", "text")])
            logger.info("Chat history indexes created")
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")

    def save_message(
        self,
        user_id: str,
        conversation_id: str,
        message_type: str,
        content: str,
        sources: Optional[List[Dict]] = None,
        response_metadata: Optional[Dict] = None,
        conversation_title: Optional[str] = None,
    ) -> str:
        """Save a message to chat history."""
        collection = self._get_collection()
        
        message = {
            "user_id": user_id,
            "conversation_id": conversation_id,
            "message_type": message_type,
            "content": content,
            "timestamp": datetime.utcnow(),
        }

        if message_type == "assistant":
            message["sources"] = sources or []
            message["response_metadata"] = response_metadata or {}

        # Update conversation title if provided
        if conversation_title and message_type == "user":
            collection.update_one(
                {"user_id": user_id, "conversation_id": conversation_id, "message_type": "_metadata"},
                {
                    "$set": {
                        "conversation_title": conversation_title,
                        "updated_at": datetime.utcnow()
                    },
                    "$setOnInsert": {
                        "user_id": user_id,
                        "conversation_id": conversation_id,
                        "message_type": "_metadata",
                        "created_at": datetime.utcnow()
                    }
                },
                upsert=True
            )

        result = collection.insert_one(message)
        return str(result.inserted_id)

    def get_conversations(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
        sort_by: str = "newest"
    ) -> Dict[str, Any]:
        """Get list of conversations for a user."""
        collection = self._get_collection()
        
        # Aggregation to get conversations with latest message
        pipeline = [
            {"$match": {"user_id": user_id, "message_type": {"$ne": "_metadata"}}},
            {"$sort": {"timestamp": -1}},
            {
                "$group": {
                    "_id": "$conversation_id",
                    "last_message": {"$first": "$content"},
                    "last_updated": {"$first": "$timestamp"},
                    "message_count": {"$sum": 1},
                }
            },
            {"$sort": {"last_updated": -1}},
            {"$skip": offset},
            {"$limit": limit},
        ]

        conversations = list(collection.aggregate(pipeline))
        
        # Get conversation titles
        for conv in conversations:
            meta = collection.find_one({
                "user_id": user_id,
                "conversation_id": conv["_id"],
                "message_type": "_metadata"
            })
            conv["conversation_id"] = conv["_id"]
            conv["title"] = meta.get("conversation_title", "Untitled") if meta else "Untitled"
            del conv["_id"]

        # Get total count
        total_pipeline = [
            {"$match": {"user_id": user_id, "message_type": {"$ne": "_metadata"}}},
            {"$group": {"_id": "$conversation_id"}},
            {"$count": "total"}
        ]
        total_result = list(collection.aggregate(total_pipeline))
        total_count = total_result[0]["total"] if total_result else 0

        return {
            "conversations": conversations,
            "total_count": total_count,
            "page": offset // limit
        }

    def get_conversation_messages(
        self,
        user_id: str,
        conversation_id: str
    ) -> Dict[str, Any]:
        """Get all messages in a conversation."""
        collection = self._get_collection()
        
        # Get metadata
        meta = collection.find_one({
            "user_id": user_id,
            "conversation_id": conversation_id,
            "message_type": "_metadata"
        })
        
        # Get messages
        messages = list(collection.find(
            {
                "user_id": user_id,
                "conversation_id": conversation_id,
                "message_type": {"$in": ["user", "assistant"]}
            },
            {"_id": 1, "message_type": 1, "content": 1, "timestamp": 1, "sources": 1, "response_metadata": 1}
        ).sort("timestamp", 1))

        formatted = []
        for msg in messages:
            formatted.append({
                "message_id": str(msg["_id"]),
                "type": msg["message_type"],
                "content": msg["content"],
                "timestamp": msg["timestamp"].isoformat() if msg.get("timestamp") else None,
                "sources": msg.get("sources", []),
                "response_metadata": msg.get("response_metadata")
            })

        return {
            "conversation_id": conversation_id,
            "title": meta.get("conversation_title", "Untitled") if meta else "Untitled",
            "created_at": meta.get("created_at").isoformat() if meta and meta.get("created_at") else None,
            "messages": formatted
        }

    def create_conversation(self, user_id: str, title: Optional[str] = None) -> str:
        """Create a new conversation and return its ID."""
        collection = self._get_collection()
        conversation_id = str(uuid.uuid4())
        
        collection.insert_one({
            "user_id": user_id,
            "conversation_id": conversation_id,
            "message_type": "_metadata",
            "conversation_title": title or "New Chat",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        return conversation_id

    def rename_conversation(
        self,
        user_id: str,
        conversation_id: str,
        new_title: str
    ) -> bool:
        """Rename a conversation."""
        collection = self._get_collection()
        
        result = collection.update_one(
            {
                "user_id": user_id,
                "conversation_id": conversation_id,
                "message_type": "_metadata"
            },
            {
                "$set": {
                    "conversation_title": new_title,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0

    def delete_conversation(self, user_id: str, conversation_id: str) -> int:
        """Delete a conversation and all its messages."""
        collection = self._get_collection()
        
        result = collection.delete_many({
            "user_id": user_id,
            "conversation_id": conversation_id
        })
        
        return result.deleted_count

    def delete_message(
        self,
        user_id: str,
        conversation_id: str,
        message_id: str
    ) -> bool:
        """Delete a single message."""
        collection = self._get_collection()
        
        result = collection.delete_one({
            "_id": ObjectId(message_id),
            "user_id": user_id,
            "conversation_id": conversation_id,
            "message_type": {"$in": ["user", "assistant"]}
        })
        
        return result.deleted_count > 0

    def delete_all_conversations(self, user_id: str) -> int:
        """Delete all conversations for a user."""
        collection = self._get_collection()
        
        result = collection.delete_many({"user_id": user_id})
        return result.deleted_count

    def search_history(
        self,
        user_id: str,
        query: str,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Search chat history by keyword."""
        collection = self._get_collection()
        
        try:
            # Try text search first
            results = list(collection.find(
                {
                    "user_id": user_id,
                    "message_type": {"$in": ["user", "assistant"]},
                    "$text": {"$search": query}
                },
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit))
        except Exception:
            # Fallback to regex search
            results = list(collection.find(
                {
                    "user_id": user_id,
                    "message_type": {"$in": ["user", "assistant"]},
                    "content": {"$regex": query, "$options": "i"}
                }
            ).sort("timestamp", -1).limit(limit))

        # Group by conversation
        conv_ids = list(set(r["conversation_id"] for r in results))
        
        conversations = []
        for conv_id in conv_ids[:limit]:
            meta = collection.find_one({
                "user_id": user_id,
                "conversation_id": conv_id,
                "message_type": "_metadata"
            })
            
            # Get latest message
            latest = collection.find_one(
                {"user_id": user_id, "conversation_id": conv_id, "message_type": {"$ne": "_metadata"}},
                sort=[("timestamp", -1)]
            )
            
            conversations.append({
                "conversation_id": conv_id,
                "title": meta.get("conversation_title", "Untitled") if meta else "Untitled",
                "last_message": latest.get("content", "")[:100] if latest else "",
                "last_updated": latest.get("timestamp").isoformat() if latest and latest.get("timestamp") else None
            })

        return {
            "conversations": conversations,
            "total_count": len(conversations)
        }

    def conversation_exists(self, user_id: str, conversation_id: str) -> bool:
        """Check if a conversation exists and belongs to user."""
        collection = self._get_collection()
        
        return collection.count_documents({
            "user_id": user_id,
            "conversation_id": conversation_id
        }) > 0


# Global instance
chat_storage = ChatStorage()
