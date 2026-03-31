from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Dict, Optional, List
from pydantic import BaseModel
import uuid
import time

from rag.memory_chain import get_conversational_rag_chain
from rag.streaming_chain import get_streaming_rag_chain, stream_rag_response
from db.mongo import save_chat, get_chat_history
from auth.dependencies import get_current_user_id
from storage.chat_storage import chat_storage

# -------------------------------------------------
# Router
# -------------------------------------------------
router = APIRouter(prefix="/query", tags=["Query"])

# Request model
class QueryFilters(BaseModel):
    document_ids: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None

class QueryRequest(BaseModel):
    question: str
    filters: Optional[QueryFilters] = None
    conversation_id: Optional[str] = None

# -------------------------------------------------
# NORMAL QUERY (WITH MEMORY)
# -------------------------------------------------
@router.post("/")
def query_documents(
    request: QueryRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Stateless conversational RAG query.
    Conversation history is passed explicitly.
    """
    question = request.question
    conversation_id = request.conversation_id
    is_new_conversation = False
    start_time = time.time()

    # Create new conversation if not provided
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        is_new_conversation = True
        # Create conversation metadata
        chat_storage.create_conversation(user_id, question[:50])

    # Save user message
    chat_storage.save_message(
        user_id=user_id,
        conversation_id=conversation_id,
        message_type="user",
        content=question,
        conversation_title=question[:50] if is_new_conversation else None
    )

    # 1️⃣ Build stateless chain (NO MEMORY INSIDE)
    chain = get_conversational_rag_chain(user_id)

    # 2️⃣ Fetch previous chat history from MongoDB
    previous_chats = get_chat_history(user_id, limit=6)

    # 3️⃣ Convert DB records → LangChain format
    chat_history = []
    for chat in reversed(previous_chats):
        chat_history.append(("human", chat["question"]))
        chat_history.append(("ai", chat["answer"]))

    # 4️⃣ Call chain WITH chat_history
    try:
        response = chain({
            "question": question,
            "chat_history": chat_history
        })
    except Exception as e:
        import logging
        import traceback
        logging.error(f"Chain error: {e}")
        logging.error(traceback.format_exc())
        
        # Save error message
        chat_storage.save_message(
            user_id=user_id,
            conversation_id=conversation_id,
            message_type="assistant",
            content=f"Error: {str(e)}",
            response_metadata={
                "status": "error",
                "error_message": str(e)
            }
        )
        raise HTTPException(status_code=500, detail=str(e))

    answer = response["answer"]
    response_time = int((time.time() - start_time) * 1000)

    # Build sources with full text
    sources = []
    for doc in response.get("source_documents", []):
        sources.append({
            "filename": doc.metadata.get("filename"),
            "page": doc.metadata.get("page"),
            "full_text": doc.page_content[:500] if doc.page_content else None,
            "relevance_score": doc.metadata.get("score", 0.85),
            "chunk_index": doc.metadata.get("chunk_index")
        })

    # Save assistant message with sources
    chat_storage.save_message(
        user_id=user_id,
        conversation_id=conversation_id,
        message_type="assistant",
        content=answer,
        sources=sources,
        response_metadata={
            "model": "llama-3.3-70b-versatile",
            "response_time_ms": response_time,
            "status": "success",
            "source_count": len(sources)
        }
    )

    # 5️⃣ Persist this turn (for legacy compatibility)
    save_chat(
        user_id=user_id,
        question=question,
        answer=answer,
        sources=sources
    )

    return {
        "answer": answer,
        "sources": sources,
        "conversation_id": conversation_id,
        "is_new_conversation": is_new_conversation
    }

# -------------------------------------------------
# STREAMING QUERY (NO MEMORY)
# -------------------------------------------------
@router.post("/stream")
def query_documents_stream(
    request: QueryRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Streams answer token-by-token using Gemini.
    """
    return StreamingResponse(
        stream_rag_response(user_id, request.question),
        media_type="text/event-stream"
    )


# This file provides two endpoints:
# POST /query → normal RAG with memory
# POST /query/stream → streaming response (Gemini)