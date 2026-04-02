"""Chat history API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging

from auth.dependencies import get_current_user_id
from storage.chat_storage import chat_storage

logger = logging.getLogger(__name__)

router = APIRouter()


class NewConversationRequest(BaseModel):
    title: Optional[str] = None


class RenameConversationRequest(BaseModel):
    title: str


class MessageRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    auto_generate_title: bool = True


@router.get("/history")
def get_conversations(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("newest", pattern="^(newest|oldest|alphabetical)$"),
    user_id: str = Depends(get_current_user_id)
):
    """Get all conversations for the current user."""
    try:
        result = chat_storage.get_conversations(user_id, limit, offset, sort_by)
        return result
    except Exception as e:
        logger.error(f"Failed to get conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve conversations")


@router.get("/history/search")
def search_history(
    query: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user_id)
):
    """Search chat history by keyword."""
    try:
        result = chat_storage.search_history(user_id, query, limit)
        return result
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail="Search failed")


@router.get("/history/{conversation_id}")
def get_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get all messages in a conversation."""
    # Verify ownership
    if not chat_storage.conversation_exists(user_id, conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    try:
        result = chat_storage.get_conversation_messages(user_id, conversation_id)
        return result
    except Exception as e:
        logger.error(f"Failed to get conversation: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve conversation")


@router.post("/new-conversation")
def create_conversation(
    request: NewConversationRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new conversation."""
    try:
        conversation_id = chat_storage.create_conversation(user_id, request.title)
        return {"conversation_id": conversation_id}
    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        raise HTTPException(status_code=500, detail="Failed to create conversation")


@router.put("/history/{conversation_id}")
def rename_conversation(
    conversation_id: str,
    request: RenameConversationRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Rename a conversation."""
    # Verify ownership
    if not chat_storage.conversation_exists(user_id, conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    try:
        success = chat_storage.rename_conversation(user_id, conversation_id, request.title)
        return {"success": success}
    except Exception as e:
        logger.error(f"Failed to rename conversation: {e}")
        raise HTTPException(status_code=500, detail="Failed to rename conversation")


@router.delete("/history/{conversation_id}/{message_id}")
def delete_message(
    conversation_id: str,
    message_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a single message from a conversation."""
    # Verify ownership
    if not chat_storage.conversation_exists(user_id, conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    try:
        success = chat_storage.delete_message(user_id, conversation_id, message_id)
        return {"success": success}
    except Exception as e:
        logger.error(f"Failed to delete message: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete message")


@router.delete("/history/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete an entire conversation."""
    # Verify ownership
    if not chat_storage.conversation_exists(user_id, conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    try:
        deleted_count = chat_storage.delete_conversation(user_id, conversation_id)
        return {"success": True, "deleted_count": deleted_count}
    except Exception as e:
        logger.error(f"Failed to delete conversation: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete conversation")


@router.delete("/history")
def clear_all_history(
    confirm: bool = Query(False),
    user_id: str = Depends(get_current_user_id)
):
    """Delete all conversations for the current user."""
    if not confirm:
        raise HTTPException(status_code=400, detail="Confirmation required. Set confirm=true")
    
    try:
        deleted_count = chat_storage.delete_all_conversations(user_id)
        return {"success": True, "deleted_conversations": deleted_count}
    except Exception as e:
        logger.error(f"Failed to clear history: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear history")
