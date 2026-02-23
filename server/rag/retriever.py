"""
Retriever module for DocTalk.
Provides document retrieval with similarity search across ALL user documents.
Enhanced to handle personal queries like "tell me about myself".
"""

from typing import List
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from rag.vectorstore import get_user_vectorstore
import logging
import re

logger = logging.getLogger(__name__)


class EnhancedRetriever(BaseRetriever):
    """
    Enhanced retriever that handles personal queries better.
    When user asks about "myself/me/my", it searches with multiple queries
    to find resume/profile information.
    """
    
    vectorstore: object  # FAISS vectorstore
    k: int = 8
    
    class Config:
        arbitrary_types_allowed = True
    
    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        """
        Get relevant documents for a query.
        Enhanced to handle personal queries.
        """
        # Check if query is about the user themselves
        personal_patterns = [
            r'\b(myself|about me|my background|my resume|my profile|my skills|my experience|my education|my projects|who am i|tell me about me)\b',
            r'\b(my name|my qualifications|my achievements|my work)\b'
        ]
        
        is_personal_query = any(re.search(pattern, query.lower()) for pattern in personal_patterns)
        
        if is_personal_query:
            logger.info(f"Detected personal query: {query}")
            # Do multiple searches to find personal/resume content
            search_queries = [
                query,  # Original query
                "resume profile name education skills experience projects achievements",
                "personal background qualifications work history",
                "name contact email skills programming languages"
            ]
            
            all_docs = []
            seen_contents = set()
            
            for sq in search_queries:
                results = self.vectorstore.similarity_search(sq, k=self.k)
                for doc in results:
                    # Deduplicate by content
                    content_hash = hash(doc.page_content[:200])
                    if content_hash not in seen_contents:
                        seen_contents.add(content_hash)
                        all_docs.append(doc)
            
            # Sort by relevance to personal content (prioritize resume-like files)
            def score_doc(doc):
                filename = doc.metadata.get('filename', '').lower()
                content = doc.page_content.lower()
                score = 0
                
                # Prioritize resume/profile documents
                if 'resume' in filename or 'cv' in filename or 'profile' in filename:
                    score += 100
                if any(word in filename for word in ['stripe', 'sudharshan']):
                    score += 50
                    
                # Prioritize content with personal info keywords
                personal_keywords = ['skills', 'education', 'experience', 'projects', 
                                   'programming', 'languages', 'achievements', 'university',
                                   'leetcode', 'codechef', 'github']
                for kw in personal_keywords:
                    if kw in content:
                        score += 5
                        
                return -score  # Negative for descending sort
            
            all_docs.sort(key=score_doc)
            logger.info(f"Personal query returned {len(all_docs)} documents")
            return all_docs[:self.k]
        else:
            # Document-diversified similarity search
            # Fetch more candidates, then round-robin across source documents
            # to ensure results span ALL uploaded files
            candidates = self.vectorstore.similarity_search(query, k=self.k * 3)
            
            if not candidates:
                return []
            
            # Group candidates by source document filename
            doc_groups = {}
            for doc in candidates:
                fname = doc.metadata.get('filename', 'unknown')
                doc_groups.setdefault(fname, []).append(doc)
            
            logger.info(f"Query returned candidates from {len(doc_groups)} documents: {list(doc_groups.keys())}")
            
            # Round-robin pick from each document group to ensure diversity
            result = []
            while len(result) < self.k and doc_groups:
                empty_keys = []
                for key in list(doc_groups.keys()):
                    docs = doc_groups[key]
                    if docs and len(result) < self.k:
                        result.append(docs.pop(0))
                    if not docs:
                        empty_keys.append(key)
                for key in empty_keys:
                    del doc_groups[key]
            
            logger.info(f"Diversified retrieval returned {len(result)} docs from {len(set(d.metadata.get('filename', '') for d in result))} unique files")
            return result


def get_retriever(user_id: str, k: int = 8) -> EnhancedRetriever:
    """
    Get an enhanced retriever that searches across ALL user's uploaded documents.
    
    Args:
        user_id: User identifier
        k: Number of top results to return
        
    Returns:
        EnhancedRetriever configured for similarity search
    """
    vectorstore = get_user_vectorstore(user_id)
    
    # Log the number of documents in the vectorstore
    try:
        total_docs = vectorstore.index.ntotal
        logger.info(f"Retriever for user {user_id}: {total_docs} total vectors in index")
    except Exception as e:
        logger.warning(f"Could not get index count: {e}")
    
    return EnhancedRetriever(vectorstore=vectorstore, k=k)
