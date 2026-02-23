# filepath: /home/susan/Desktop/DocTalk/server/storage/__init__.py
"""
Storage module for DocTalk.
Provides cloud storage and session management for FAISS indices.
"""

from storage.cloud_storage import CloudFAISSStorage
from storage.session_manager import (
    session_manager,
    get_user_vectorstore,
    save_user_vectorstore,
    refresh_user_session,
    cleanup_user_session,
    is_session_expired
)

__all__ = [
    "CloudFAISSStorage",
    "session_manager",
    "get_user_vectorstore",
    "save_user_vectorstore",
    "refresh_user_session",
    "cleanup_user_session",
    "is_session_expired"
]
