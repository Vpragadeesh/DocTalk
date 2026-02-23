# filepath: /home/susan/Desktop/DocTalk/server/storage/cloud_storage.py
"""
Cloud Storage for FAISS Indices using MongoDB GridFS.
Stores FAISS index files in MongoDB Atlas (cloud) instead of local filesystem.
"""

import os
import io
import pickle
import tempfile
import shutil
from datetime import datetime
from typing import Optional, Tuple
from gridfs import GridFS
from pymongo import MongoClient
import certifi
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "doctalk")

# MongoDB Connection for GridFS
client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
db = client[DB_NAME]
fs = GridFS(db, collection="faiss_indices")

# Collection for tracking FAISS metadata
faiss_metadata_col = db["faiss_metadata"]


class CloudFAISSStorage:
    """
    Manages FAISS index storage in MongoDB GridFS (cloud).
    No local storage - everything in the cloud.
    """
    
    @staticmethod
    def save_index_to_cloud(user_id: str, index_bytes: bytes, pkl_bytes: bytes) -> bool:
        """
        Save FAISS index files to MongoDB GridFS.
        
        Args:
            user_id: User identifier
            index_bytes: The index.faiss file content
            pkl_bytes: The index.pkl file content
            
        Returns:
            bool: Success status
        """
        try:
            # Delete existing files for this user first
            CloudFAISSStorage.delete_from_cloud(user_id)
            
            # Store index.faiss
            index_file_id = fs.put(
                index_bytes,
                filename=f"{user_id}/index.faiss",
                user_id=user_id,
                file_type="faiss_index",
                uploaded_at=datetime.utcnow()
            )
            
            # Store index.pkl
            pkl_file_id = fs.put(
                pkl_bytes,
                filename=f"{user_id}/index.pkl",
                user_id=user_id,
                file_type="faiss_pkl",
                uploaded_at=datetime.utcnow()
            )
            
            # Update metadata
            faiss_metadata_col.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "user_id": user_id,
                        "index_file_id": index_file_id,
                        "pkl_file_id": pkl_file_id,
                        "updated_at": datetime.utcnow(),
                        "last_accessed": datetime.utcnow()
                    }
                },
                upsert=True
            )
            
            logger.info(f"Saved FAISS index to cloud for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving FAISS index to cloud: {e}")
            return False
    
    @staticmethod
    def load_index_from_cloud(user_id: str) -> Optional[Tuple[bytes, bytes]]:
        """
        Load FAISS index files from MongoDB GridFS.
        
        Args:
            user_id: User identifier
            
        Returns:
            Tuple of (index_bytes, pkl_bytes) or None if not found
        """
        try:
            # Find index.faiss
            index_file = fs.find_one({
                "user_id": user_id,
                "file_type": "faiss_index"
            })
            
            # Find index.pkl
            pkl_file = fs.find_one({
                "user_id": user_id,
                "file_type": "faiss_pkl"
            })
            
            if not index_file or not pkl_file:
                logger.info(f"No FAISS index found in cloud for user: {user_id}")
                return None
            
            # Read file contents
            index_bytes = index_file.read()
            pkl_bytes = pkl_file.read()
            
            # Update last accessed time
            faiss_metadata_col.update_one(
                {"user_id": user_id},
                {"$set": {"last_accessed": datetime.utcnow()}}
            )
            
            logger.info(f"Loaded FAISS index from cloud for user: {user_id}")
            return (index_bytes, pkl_bytes)
            
        except Exception as e:
            logger.error(f"Error loading FAISS index from cloud: {e}")
            return None
    
    @staticmethod
    def delete_from_cloud(user_id: str) -> bool:
        """
        Delete FAISS index files from MongoDB GridFS.
        
        Args:
            user_id: User identifier
            
        Returns:
            bool: Success status
        """
        try:
            # Find and delete all files for this user
            for grid_file in fs.find({"user_id": user_id}):
                fs.delete(grid_file._id)
            
            # Delete metadata
            faiss_metadata_col.delete_one({"user_id": user_id})
            
            logger.info(f"Deleted FAISS index from cloud for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting FAISS index from cloud: {e}")
            return False
    
    @staticmethod
    def exists_in_cloud(user_id: str) -> bool:
        """
        Check if FAISS index exists in cloud for user.
        
        Args:
            user_id: User identifier
            
        Returns:
            bool: True if exists
        """
        return fs.exists({"user_id": user_id, "file_type": "faiss_index"})
    
    @staticmethod
    def get_all_user_ids() -> list:
        """
        Get all user IDs that have FAISS indices stored.
        
        Returns:
            List of user IDs
        """
        return faiss_metadata_col.distinct("user_id")
    
    @staticmethod
    def get_metadata(user_id: str) -> Optional[dict]:
        """
        Get FAISS index metadata for a user.
        
        Args:
            user_id: User identifier
            
        Returns:
            Metadata dict or None
        """
        return faiss_metadata_col.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
