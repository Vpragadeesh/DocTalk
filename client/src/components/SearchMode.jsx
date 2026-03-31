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
      description: 'Search only uploaded documents',
      color: 'blue'
    },
    {
      id: 'hybrid',
      label: 'Hybrid',
      icon: Sparkles,
      description: 'Documents + Web search',
      color: 'purple'
    },
    {
      id: 'web_only',
      label: 'Web',
      icon: Globe,
      description: 'Search the web only',
      color: 'green'
    }
  ];

  const getColorClasses = (mode, isActive) => {
    const colors = {
      blue: isActive 
        ? 'bg-blue-600 text-white border-blue-600' 
        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600',
      purple: isActive 
        ? 'bg-purple-600 text-white border-purple-600' 
        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:text-purple-600',
      green: isActive 
        ? 'bg-green-600 text-white border-green-600' 
        : 'bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:text-green-600'
    };
    return colors[mode.color];
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
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
              transition-all duration-200 border
              ${getColorClasses(mode, isActive)}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
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
    docs_only: { label: 'Documents', icon: FileText, color: 'text-blue-600' },
    hybrid: { label: 'Hybrid', icon: Sparkles, color: 'text-purple-600' },
    web_only: { label: 'Web', icon: Globe, color: 'text-green-600' }
  };

  const config = modeConfig[searchMode] || modeConfig.docs_only;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1 text-xs ${config.color}`}>
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
    { id: 'docs_only', label: 'Documents Only', icon: FileText, color: 'text-blue-600' },
    { id: 'hybrid', label: 'Hybrid (Docs + Web)', icon: Sparkles, color: 'text-purple-600' },
    { id: 'web_only', label: 'Web Only', icon: Globe, color: 'text-green-600' }
  ];

  const currentMode = modes.find(m => m.id === searchMode) || modes[0];
  const Icon = currentMode.icon;

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300
          bg-white hover:bg-gray-50 transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${currentMode.color}
        `}
      >
        <Icon size={16} />
        <span className="text-sm font-medium">{currentMode.label}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
          <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
            {modes.map((mode) => {
              const ModeIcon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    onModeChange(mode.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                    hover:bg-gray-100 transition-colors
                    ${mode.id === searchMode ? 'bg-gray-50 font-medium' : ''}
                    ${mode.color}
                  `}
                >
                  <ModeIcon size={16} />
                  <span>{mode.label}</span>
                  {mode.id === searchMode && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
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
