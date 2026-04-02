import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

const ChatMessages = ({ messages, isStreaming }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col">
      {messages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message}
          isStreaming={isStreaming && message.role === 'assistant'}
        />
      ))}
      
      {isStreaming && messages[messages.length - 1]?.role === 'user' && (
        <div className="mb-8 flex animate-fade-in items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex gap-1.5 px-3 py-2">
            <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-tertiary)]" style={{ animationDelay: '-0.32s' }}></span>
            <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-tertiary)]" style={{ animationDelay: '-0.16s' }}></span>
            <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-tertiary)]"></span>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
