import React, { useState } from 'react';
import ThemeToggle from './ThemeToggle';

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
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onToggle} />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-[var(--border-light)] bg-[var(--bg-secondary)] transition-transform duration-200 md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="border-b border-[var(--border-light)] p-4">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:bg-[var(--accent-hover)]"
            onClick={handleNewChat}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>New Chat</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative border-b border-[var(--border-light)] p-4">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          >
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-[var(--border-light)] bg-[var(--bg-tertiary)] py-2 pl-9 pr-2 text-sm text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent-primary)] focus:bg-[var(--bg-secondary)]"
          />
        </div>

        {/* Conversations */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">
              <p>No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                className="mb-1 flex w-full items-start justify-between gap-2 rounded-md px-4 py-2 text-left transition-colors duration-200 hover:bg-[var(--bg-hover)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[var(--text-primary)]">{conv.title}</div>
                  <div className="truncate text-xs text-[var(--text-tertiary)]">{conv.preview}</div>
                </div>
                <div className="shrink-0">
                  <span className="text-xs text-[var(--text-tertiary)]">{formatDate(conv.timestamp)}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border-light)] p-4">
          <ThemeToggle />
          <button className="flex min-w-[140px] flex-1 items-center gap-2 rounded-md px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors duration-200 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
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
