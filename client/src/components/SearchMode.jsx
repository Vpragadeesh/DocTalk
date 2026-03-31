import React from 'react';
import { FileText, Globe, Sparkles } from 'lucide-react';

/**
 * SearchMode component for toggling between document-only, web search, and hybrid modes.
 */
const SearchMode = ({ searchMode, onModeChange, disabled = false }) => {
  const modes = [
    {
      id: 'docs_only',
      label: 'Documents',
      icon: FileText,
      description: 'Search only uploaded documents'
    },
    {
      id: 'hybrid',
      label: 'Hybrid',
      icon: Sparkles,
      description: 'Documents + Web search'
    },
    {
      id: 'web_only',
      label: 'Web',
      icon: Globe,
      description: 'Search the web only'
    }
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] p-1.5 shadow-sm transition-shadow hover:shadow-md">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = searchMode === mode.id;
        
        return (
          <button
            key={mode.id}
            onClick={() => !disabled && onModeChange(mode.id)}
            disabled={disabled}
            title={mode.description}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
              transition-all duration-200
              ${isActive 
                ? 'border shadow-sm'
                : 'border border-transparent bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={
              isActive
                ? {
                    background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                    color: 'var(--accent-primary)',
                    borderColor: 'color-mix(in srgb, var(--accent-primary) 28%, transparent)',
                  }
                : undefined
            }
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Compact inline search mode indicator for chat input area.
 */
export const SearchModeIndicator = ({ searchMode }) => {
  const modeConfig = {
    docs_only: { label: 'Documents', icon: FileText },
    hybrid: { label: 'Hybrid', icon: Sparkles },
    web_only: { label: 'Web', icon: Globe }
  };

  const config = modeConfig[searchMode] || modeConfig.docs_only;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)]">
      <Icon size={12} />
      <span>{config.label}</span>
    </div>
  );
};

/**
 * SearchModeDropdown for compact mode selection.
 */
export const SearchModeDropdown = ({ searchMode, onModeChange, disabled = false }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const modes = [
    { id: 'docs_only', label: 'Documents Only', icon: FileText },
    { id: 'hybrid', label: 'Hybrid (Docs + Web)', icon: Sparkles },
    { id: 'web_only', label: 'Web Only', icon: Globe }
  ];

  const currentMode = modes.find(m => m.id === searchMode) || modes[0];
  const Icon = currentMode.icon;

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 rounded-lg border border-[var(--border-light)]
          bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-secondary)]
          hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]
          transition-colors font-medium text-sm
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <Icon size={16} />
        <span className="hidden sm:inline">{currentMode.label}</span>
        <svg 
          className={`w-4 h-4 transition-transform ml-auto ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] py-1 shadow-lg">
            {modes.map((mode) => {
              const ModeIcon = mode.icon;
              const isSelected = mode.id === searchMode;
              
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    onModeChange(mode.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-medium
                    transition-colors
                    ${isSelected 
                      ? 'border-l-2' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }
                  `}
                  style={
                    isSelected
                      ? {
                          background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                          color: 'var(--accent-primary)',
                          borderLeftColor: 'color-mix(in srgb, var(--accent-primary) 28%, transparent)',
                        }
                      : undefined
                  }
                >
                  <ModeIcon size={16} className={isSelected ? 'text-[var(--accent-primary)]' : ''} />
                  <span>{mode.label}</span>
                  {isSelected && (
                    <svg className="ml-auto h-4 w-4 text-[var(--accent-primary)]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default SearchMode;
