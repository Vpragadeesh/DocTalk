import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ isOpen, onToggle }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([
    // Mock data - replace with actual API call
    { id: 1, title: 'Document Analysis', timestamp: new Date(), preview: 'Tell me about...' },
    { id: 2, title: 'Project Overview', timestamp: new Date(Date.now() - 86400000), preview: 'What are the key...' },
  ]);

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewChat = () => {
    // TODO: Implement new chat
    console.log('New chat');
  };

  const formatDate = (date) => {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onToggle} />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <button className="new-chat-button" onClick={handleNewChat}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>New Chat</span>
          </button>
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="search-icon">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Conversations */}
        <div className="conversations-list">
          {filteredConversations.length === 0 ? (
            <div className="no-conversations">
              <p>No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button key={conv.id} className="conversation-item">
                <div className="conversation-content">
                  <div className="conversation-title">{conv.title}</div>
                  <div className="conversation-preview">{conv.preview}</div>
                </div>
                <div className="conversation-meta">
                  <span className="conversation-date">{formatDate(conv.timestamp)}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-footer-button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
