import os
import shutil
import logging
from langchain_community.vectorstores import FAISS
from rag.vectorstore import get_embedding_model, save_user_vectorstore
from db.mongo import chunks_col, documents_col
from storage.session_manager import session_manager

logger = logging.getLogger(__name__)

def rebuild_user_faiss_index(user_id: str):
    """
    Rebuild FAISS index from MongoDB chunks (after deletion).
    Saves to cloud storage and invalidates in-memory cache.
    """
    chunks = list(chunks_col.find(
        {"user_id": user_id},
        {"_id": 0}
    ))

    # Build a file_id -> filename lookup from the documents collection
    docs = list(documents_col.find(
        {"user_id": user_id},
        {"_id": 0, "file_id": 1, "filename": 1}
    ))
    file_id_to_name = {d["file_id"]: d["filename"] for d in docs}

    if not chunks:
        # No chunks left — clear the vectorstore
        logger.info(f"No chunks remaining for user {user_id}, creating empty vectorstore")
        embeddings = get_embedding_model()
        vectorstore = FAISS.from_texts(["start"], embeddings)
        save_user_vectorstore(vectorstore, user_id)
        
        # Also clean up local storage if it exists
        shutil.rmtree(f"faiss_index/{user_id}", ignore_errors=True)
        return

    texts = [c["text_preview"] for c in chunks]
    metadatas = [
        {
            "file_id": c["file_id"],
            "filename": file_id_to_name.get(c["file_id"], "Unknown"),
            "page": c["page_number"]
        }
        for c in chunks
    ]

    embeddings = get_embedding_model()
    vectorstore = FAISS.from_texts(texts, embeddings, metadatas)

    # Save to cloud storage (MongoDB GridFS) — this is where the app reads from
    save_user_vectorstore(vectorstore, user_id)
    
    logger.info(f"Rebuilt FAISS index for user {user_id}: {vectorstore.index.ntotal} vectors from {len(set(m['file_id'] for m in metadatas))} documents")

    # Also clean up any stale local storage
    shutil.rmtree(f"faiss_index/{user_id}", ignore_errors=True)
