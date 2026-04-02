import React, { useState, useEffect } from 'react';
import { 
  Globe, GraduationCap, MessageCircle, PlayCircle, 
  Calculator, PenTool, ChevronDown, Loader2, AlertCircle
} from 'lucide-react';
import { perplexicaAPI } from '../api/index';

/**
 * Focus mode icons mapping.
 */
const FOCUS_ICONS = {
  'globe': Globe,
  'graduation-cap': GraduationCap,
  'message-circle': MessageCircle,
  'play-circle': PlayCircle,
  'calculator': Calculator,
  'pen-tool': PenTool
};

/**
 * PerplexicaFocusSelector component for selecting web search focus mode.
 */
const PerplexicaFocusSelector = ({ 
  focusMode, 
  onFocusModeChange, 
  disabled = false,
  compact = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modes, setModes] = useState([
    { mode: 'webSearch', name: 'Web Search', description: 'General web search', icon: 'globe' },
    { mode: 'academicSearch', name: 'Academic', description: 'Search academic papers', icon: 'graduation-cap' },
    { mode: 'redditSearch', name: 'Reddit', description: 'Search Reddit discussions', icon: 'message-circle' },
    { mode: 'youtubeSearch', name: 'YouTube', description: 'Search YouTube videos', icon: 'play-circle' },
  ]);
  const [loading, setLoading] = useState(false);

  // Load focus modes from API
  useEffect(() => {
    const loadModes = async () => {
      try {
        setLoading(true);
        const response = await perplexicaAPI.getFocusModes();
        if (response.data && Array.isArray(response.data)) {
          setModes(response.data);
        }
      } catch (err) {
        console.warn('Could not load focus modes from API, using defaults');
      } finally {
        setLoading(false);
      }
    };
    loadModes();
  }, []);

  const currentMode = modes.find(m => m.mode === focusMode) || modes[0];
  const IconComponent = FOCUS_ICONS[currentMode?.icon] || Globe;

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
        <IconComponent size={12} />
        <span>{currentMode?.name || 'Web'}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 rounded-lg border border-[var(--border-light)]
          bg-[var(--bg-secondary)] px-3 py-2 text-sm font-medium
          text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] 
          hover:text-[var(--text-primary)] transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <IconComponent size={16} />
        )}
        <span className="hidden sm:inline">{currentMode?.name || 'Web Search'}</span>
        <ChevronDown 
          size={14} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] py-1 shadow-lg">
            {modes.map((mode) => {
              const ModeIcon = FOCUS_ICONS[mode.icon] || Globe;
              const isSelected = mode.mode === focusMode;
              
              return (
                <button
                  key={mode.mode}
                  onClick={() => {
                    onFocusModeChange(mode.mode);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-start gap-3 px-4 py-3 text-left
                    transition-colors
                    ${isSelected 
                      ? 'border-l-2 border-l-[var(--accent-primary)] bg-[var(--accent-primary)]/10' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }
                  `}
                >
                  <ModeIcon 
                    size={18} 
                    className={isSelected ? 'text-[var(--accent-primary)]' : ''} 
                  />
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                      {mode.name}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {mode.description}
                    </div>
                  </div>
                  {isSelected && (
                    <svg className="h-4 w-4 text-[var(--accent-primary)] mt-0.5" fill="currentColor" viewBox="0 0 20 20">
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

/**
 * PerplexicaToggle - Simple on/off toggle for web search.
 */
const PerplexicaToggle = ({ 
  enabled, 
  onToggle, 
  disabled = false,
  showLabel = true 
}) => {
  return (
    <button
      onClick={() => !disabled && onToggle(!enabled)}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium
        transition-all duration-200
        ${enabled 
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' 
          : 'border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <Globe size={16} />
      {showLabel && <span className="hidden sm:inline">Web Search</span>}
      <div 
        className={`
          w-8 h-4 rounded-full relative transition-colors
          ${enabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--text-tertiary)]/30'}
        `}
      >
        <div 
          className={`
            absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform
            ${enabled ? 'translate-x-4' : 'translate-x-0.5'}
          `}
        />
      </div>
    </button>
  );
};

/**
 * PerplexicaStatus - Shows connection status.
 */
const PerplexicaStatus = ({ className = '' }) => {
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await perplexicaAPI.getHealth();
        const data = response.data;
        if (data.status === 'healthy') {
          setStatus('connected');
        } else if (data.status === 'unavailable') {
          setStatus('unavailable');
          setError(data.error);
        } else {
          setStatus('error');
          setError(data.error);
        }
      } catch (err) {
        setStatus('unavailable');
        setError('Could not connect to Perplexica');
      }
    };
    
    checkHealth();
  }, []);

  if (status === 'checking') {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] ${className}`}>
        <Loader2 size={12} className="animate-spin" />
        <span>Checking Perplexica...</span>
      </div>
    );
  }

  if (status === 'connected') {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-green-500 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span>Perplexica Connected</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs text-amber-500 ${className}`} title={error}>
      <AlertCircle size={12} />
      <span>Perplexica Unavailable</span>
    </div>
  );
};

/**
 * Combined search controls with Perplexica integration.
 */
const PerplexicaSearchControls = ({
  webSearchEnabled,
  onWebSearchToggle,
  focusMode,
  onFocusModeChange,
  disabled = false,
  showStatus = true
}) => {
  return (
    <div className="flex items-center gap-3">
      <PerplexicaToggle 
        enabled={webSearchEnabled}
        onToggle={onWebSearchToggle}
        disabled={disabled}
      />
      
      {webSearchEnabled && (
        <PerplexicaFocusSelector
          focusMode={focusMode}
          onFocusModeChange={onFocusModeChange}
          disabled={disabled}
        />
      )}
      
      {showStatus && webSearchEnabled && (
        <PerplexicaStatus />
      )}
    </div>
  );
};

export { 
  PerplexicaFocusSelector,
  PerplexicaToggle, 
  PerplexicaStatus,
  PerplexicaSearchControls 
};

export default PerplexicaSearchControls;
