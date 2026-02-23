# Cloud Storage Architecture for DocTalk

## Overview

DocTalk now stores all FAISS indices in **MongoDB Atlas (cloud)** instead of local filesystem. This provides:

1. **No local storage** - FAISS indices are stored in MongoDB GridFS
2. **Automatic cleanup** - Expired sessions are automatically deleted
3. **Scalability** - Works across multiple server instances
4. **Persistence** - Data survives server restarts

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Request                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Session Manager                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              In-Memory Cache (Fast Access)                │   │
│  │    user_id → {vectorstore, last_accessed, created_at}    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         │                                        │
│         ┌───────────────┼───────────────┐                       │
│         ▼               ▼               ▼                       │
│    Load from       Save to        Background                    │
│      Cloud          Cloud          Cleanup                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MongoDB Atlas (Cloud)                         │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │   GridFS         │  │   Collections                        │ │
│  │   (FAISS files)  │  │   - users                            │ │
│  │   - index.faiss  │  │   - documents                        │ │
│  │   - index.pkl    │  │   - chunks                           │ │
│  └──────────────────┘  │   - chat_history                     │ │
│                        │   - faiss_metadata                   │ │
│                        └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Cloud Storage (`storage/cloud_storage.py`)

Uses MongoDB GridFS to store FAISS index files:

```python
from storage.cloud_storage import CloudFAISSStorage

# Save index to cloud
CloudFAISSStorage.save_index_to_cloud(user_id, index_bytes, pkl_bytes)

# Load index from cloud
data = CloudFAISSStorage.load_index_from_cloud(user_id)  # Returns (index_bytes, pkl_bytes)

# Delete from cloud
CloudFAISSStorage.delete_from_cloud(user_id)

# Check existence
exists = CloudFAISSStorage.exists_in_cloud(user_id)
```

### 2. Session Manager (`storage/session_manager.py`)

Manages sessions with automatic cleanup:

```python
from storage.session_manager import (
    get_user_vectorstore,
    save_user_vectorstore,
    refresh_user_session,
    cleanup_user_session,
    is_session_expired
)

# Get vectorstore (loads from cloud if not in cache)
vectorstore = get_user_vectorstore(user_id)

# Save vectorstore (saves to cache AND cloud)
save_user_vectorstore(vectorstore, user_id)

# Refresh session (extends expiry time)
refresh_user_session(user_id)

# Check if session expired
if is_session_expired(user_id):
    print("Session expired!")

# Manual cleanup (deletes everything)
cleanup_user_session(user_id)
```

### 3. Background Cleanup Thread

Runs automatically every 5 minutes to:
- Check all sessions for expiry
- Delete expired sessions from memory cache
- Delete expired FAISS indices from cloud
- Delete expired documents, chunks, chat history from database

## Session Lifecycle

### 1. User Logs In
- JWT token created with 24-hour expiry
- Session timestamp initialized

### 2. User Uploads Document
- FAISS index created in memory
- Synced to MongoDB GridFS (cloud)
- Metadata stored in `faiss_metadata` collection

### 3. User Queries Documents
- Vectorstore loaded from cache (fast) or cloud (if not cached)
- Session timestamp refreshed on each activity
- Query processed and response returned

### 4. User Logs Out
- Backend `/auth/logout` endpoint called
- All user data deleted:
  - FAISS index from GridFS (cloud)
  - Documents from `documents` collection
  - Chunks from `chunks` collection
  - Chat history from `chat_history` collection
  - Local uploaded files (if any)

### 5. Session Expires (Auto-cleanup)
- Background thread detects expiry (default: 24 hours of inactivity)
- Same cleanup as logout performed automatically

## Configuration

Environment variables in `.env`:

```env
# MongoDB connection
MONGODB_URI = mongodb+srv://...
MONGODB_DB_NAME = doctalk

# Session timeout (hours)
SESSION_TIMEOUT_HOURS = 24
```

## API Endpoints

### Logout with Cleanup
```bash
POST /auth/logout
Authorization: Bearer <token>

Response:
{
  "message": "Logged out successfully. All session data has been cleaned up."
}
```

## Data Stored in Cloud

### GridFS Collections
- `faiss_indices.files` - File metadata
- `faiss_indices.chunks` - File binary data

### FAISS Metadata Collection
```json
{
  "user_id": "uuid",
  "index_file_id": "ObjectId",
  "pkl_file_id": "ObjectId",
  "updated_at": "datetime",
  "last_accessed": "datetime"
}
```

## Benefits

1. **No Local Disk Usage** - Everything stored in cloud
2. **Horizontal Scaling** - Multiple server instances can share data
3. **Automatic Cleanup** - No manual maintenance required
4. **Data Privacy** - User data deleted on logout/expiry
5. **Disaster Recovery** - MongoDB Atlas provides backups
6. **Cost Effective** - Only pay for storage used

## Migration from Local Storage

If you have existing local FAISS indices:

1. Stop the server
2. Delete the `faiss_index/` directory
3. Start the server
4. Users will need to re-upload documents

The new system will automatically create cloud-based indices.

## Monitoring

Check session stats:
```python
from storage.session_manager import session_manager

stats = session_manager.get_cache_stats()
print(f"Cached sessions: {stats['cached_sessions']}")
print(f"User IDs: {stats['user_ids']}")
```

## Troubleshooting

### Session Not Persisting
- Check MongoDB connection
- Verify `MONGODB_URI` is correct
- Check GridFS collections exist

### Slow Loading
- First load may be slow (downloading from cloud)
- Subsequent loads use memory cache

### Cleanup Not Running
- Check if cleanup thread is alive
- Review logs for errors
- Verify `SESSION_TIMEOUT_HOURS` setting
