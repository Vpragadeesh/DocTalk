import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MessageBubble = ({ message, isStreaming }) => {
  const { role, content, timestamp, files } = message;
  const isUser = role === 'user';

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="mb-8 animate-fade-in">
      <div className="mb-4 flex items-center gap-2">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isUser
              ? 'bg-[var(--accent-primary)] text-white'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
          }`}
        >
          {isUser ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{isUser ? 'You' : 'DocTalk AI'}</span>
          <span className="text-xs text-[var(--text-tertiary)]">{formatTime(timestamp)}</span>
        </div>
      </div>

      {files && files.length > 0 && (
        <div className="mb-4 ml-10 flex flex-wrap gap-2 max-md:ml-0">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center gap-1 rounded-md border border-[var(--border-light)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm text-[var(--text-secondary)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 2v7h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{file.name}</span>
            </div>
          ))}
        </div>
      )}

      <div
        className={`ml-10 text-base leading-7 text-[var(--text-primary)] max-md:ml-0 ${
          isUser ? '' : 'markdown-content'
        }`}
      >
        {isUser ? (
          <p className="m-0 whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <ReactMarkdown
            components={{
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneLight}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {content}
          </ReactMarkdown>
        )}
        
        {isStreaming && !isUser && (
          <span className="ml-0.5 animate-pulse text-[var(--accent-primary)]">▊</span>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
