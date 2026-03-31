import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import './ChatMessages.css';

const ChatMessages = ({ messages, isStreaming }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-messages">
      {messages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message}
          isStreaming={isStreaming && message.role === 'assistant'}
        />
      ))}
      
      {isStreaming && messages[messages.length - 1]?.role === 'user' && (
        <div className="thinking-indicator">
          <div className="message-avatar assistant-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
