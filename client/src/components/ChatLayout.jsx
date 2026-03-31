import React, { useState } from 'react';
import './ChatLayout.css';
import Sidebar from './Sidebar';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

const ChatLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSendMessage = async (message, files) => {
    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      files: files
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    // TODO: Connect to your API
    // For now, mock response
    setTimeout(() => {
      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'This is a placeholder response. Connect to your backend API.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsStreaming(false);
    }, 1000);
  };

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Chat Area */}
      <div className={`chat-main ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Header */}
        <div className="chat-header">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <h1 className="chat-title">DocTalk</h1>
        </div>

        {/* Messages Container */}
        <div className="chat-container">
          <div className="chat-content">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>Start a conversation</h2>
                <p>Upload documents and ask questions about them</p>
              </div>
            ) : (
              <ChatMessages messages={messages} isStreaming={isStreaming} />
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="chat-input-wrapper">
          <div className="chat-input-container">
            <ChatInput 
              onSend={handleSendMessage}
              disabled={isStreaming}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatLayout;
