import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: (email, password) => api.post('/auth/register', { email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),  // New: calls backend to cleanup session
};

// Documents APIs
export const documentsAPI = {
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress && onProgress(percentCompleted);
      },
    });
  },
  
  list: () => api.get('/documents/'),
  delete: (fileId) => api.delete(`/documents/${fileId}`),
  getById: (fileId) => api.get(`/documents/${fileId}`),
};

// Query APIs
export const queryAPI = {
  query: (question, filters = null, conversationId = null) => 
    api.post('/query/', { 
      question, 
      filters, 
      conversation_id: conversationId 
    }),
  queryStream: async (question, onChunk, onComplete, onError) => {
    try {
      const response = await fetch(`${API_BASE_URL}/query/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete && onComplete();
            } else {
              try {
                const parsed = JSON.parse(data);
                onChunk && onChunk(parsed);
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      onError && onError(error);
    }
  },
};

// Chat History APIs
export const chatAPI = {
  getConversations: (limit = 20, offset = 0) =>
    api.get(`/chat/history?limit=${limit}&offset=${offset}`),
  
  getConversation: (conversationId) =>
    api.get(`/chat/history/${conversationId}`),
  
  newConversation: (title = null) =>
    api.post('/chat/new-conversation', { title }),
  
  renameConversation: (conversationId, title) =>
    api.put(`/chat/history/${conversationId}`, { title }),
  
  deleteConversation: (conversationId) =>
    api.delete(`/chat/history/${conversationId}`),
  
  deleteMessage: (conversationId, messageId) =>
    api.delete(`/chat/history/${conversationId}/${messageId}`),
  
  clearAllHistory: () =>
    api.delete('/chat/history?confirm=true'),
  
  searchHistory: (query, limit = 20) =>
    api.get(`/chat/history/search?query=${encodeURIComponent(query)}&limit=${limit}`),
};

export default api;
