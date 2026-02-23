"""
Vectorstore module - now uses cloud storage via SessionManager.
No local storage - all FAISS indices stored in MongoDB GridFS (cloud).
"""

import os
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from dotenv import load_dotenv

# Import from session manager for cloud-based storage
from storage.session_manager import (
    get_user_vectorstore as cloud_get_vectorstore,
    save_user_vectorstore as cloud_save_vectorstore,
    refresh_user_session,
    session_manager
)

load_dotenv()
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


def get_embedding_model():
    """Get the embedding model."""
    return HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)


def get_user_vectorstore(user_id: str) -> FAISS:
    """
    Get vectorstore for user from cloud storage.
    Loads from MongoDB GridFS, with in-memory caching.
    
    Args:
        user_id: User identifier
        
    Returns:
        FAISS vectorstore
    """
    # Refresh session on access
    refresh_user_session(user_id)
    return cloud_get_vectorstore(user_id)


def save_user_vectorstore(vectorstore: FAISS, user_id: str) -> bool:
    """
    Save vectorstore to cloud storage.
    Stores in MongoDB GridFS (no local files).
    
    Args:
        vectorstore: FAISS vectorstore to save
        user_id: User identifier
        
    Returns:
        bool: Success status
    """
    return cloud_save_vectorstore(vectorstore, user_id)
