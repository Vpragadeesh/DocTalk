import React, { useState } from 'react';
import { 
  FileText, Globe, ChevronDown, ChevronRight, ExternalLink,
  Clock, Sparkles, AlertCircle
} from 'lucide-react';

/**
 * HybridResults component for displaying combined document + web search results.
 */
const HybridResults = ({ 
  documentResults = [], 
  webResults = [], 
  webAnswer = '',
  metadata = {},
  onSourceClick = null,
  compact = false
}) => {
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [expandedWeb, setExpandedWeb] = useState(null);
  const [showDocs, setShowDocs] = useState(true);
  const [showWeb, setShowWeb] = useState(true);

  const hasDocResults = documentResults.length > 0;
  const hasWebResults = webResults.length > 0;
  const totalResults = documentResults.length + webResults.length;

  if (totalResults === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-secondary)]">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No results found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} />
            {totalResults} results
          </span>
          {metadata.search_time_ms && (
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {metadata.search_time_ms}ms
            </span>
          )}
        </div>
        {metadata.auto_triggered && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
            Auto web search
          </span>
        )}
      </div>

      {/* Web Answer (if available) */}
      {webAnswer && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--accent-primary)]/5 to-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
          <div className="flex items-center gap-2 mb-2 text-[var(--accent-primary)]">
            <Globe size={16} />
            <span className="text-sm font-medium">Web Summary</span>
          </div>
          <p className="text-sm text-[var(--text-primary)] leading-relaxed">
            {webAnswer}
          </p>
        </div>
      )}

      {/* Document Results Section */}
      {hasDocResults && (
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] overflow-hidden">
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-blue-500" />
              <span className="font-medium text-[var(--text-primary)]">
                Documents
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                {documentResults.length}
              </span>
            </div>
            {showDocs ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          
          {showDocs && (
            <div className="border-t border-[var(--border-light)]">
              {documentResults.map((result, idx) => (
                <SourceItem
                  key={`doc-${idx}`}
                  source={result}
                  type="document"
                  isExpanded={expandedDoc === idx}
                  onToggle={() => setExpandedDoc(expandedDoc === idx ? null : idx)}
                  onClick={onSourceClick}
                  compact={compact}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Web Results Section */}
      {hasWebResults && (
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] overflow-hidden">
          <button
            onClick={() => setShowWeb(!showWeb)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-green-500" />
              <span className="font-medium text-[var(--text-primary)]">
                Web Results
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500">
                {webResults.length}
              </span>
            </div>
            {showWeb ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          
          {showWeb && (
            <div className="border-t border-[var(--border-light)]">
              {webResults.map((result, idx) => (
                <SourceItem
                  key={`web-${idx}`}
                  source={result}
                  type="web"
                  isExpanded={expandedWeb === idx}
                  onToggle={() => setExpandedWeb(expandedWeb === idx ? null : idx)}
                  onClick={onSourceClick}
                  compact={compact}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Individual source item component.
 */
const SourceItem = ({ 
  source, 
  type, 
  isExpanded, 
  onToggle, 
  onClick,
  compact = false
}) => {
  const isDocument = type === 'document';
  const Icon = isDocument ? FileText : Globe;
  const colorClass = isDocument ? 'text-blue-500' : 'text-green-500';
  
  const handleClick = () => {
    if (onClick) {
      onClick(source);
    } else if (source.url) {
      window.open(source.url, '_blank', 'noopener,noreferrer');
    }
  };

  const relevancePercent = Math.round((source.relevance || 0.8) * 100);

  return (
    <div className="border-b border-[var(--border-light)] last:border-b-0">
      <div 
        className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <Icon size={16} className={`mt-0.5 flex-shrink-0 ${colorClass}`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-[var(--text-primary)] truncate">
              {source.title || 'Untitled'}
            </span>
            {source.url && (
              <a 
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 text-[var(--text-tertiary)] hover:text-[var(--accent-primary)]"
              >
                <ExternalLink size={12} />
              </a>
            )}
          </div>
          
          {!compact && (
            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
              {source.snippet || 'No preview available'}
            </p>
          )}
          
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-[var(--text-tertiary)]">
              {relevancePercent}% match
            </span>
            {isDocument && source.metadata?.page && (
              <span className="text-xs text-[var(--text-tertiary)]">
                Page {source.metadata.page}
              </span>
            )}
            {!isDocument && source.metadata?.engine && (
              <span className="text-xs text-[var(--text-tertiary)]">
                via {source.metadata.engine}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex-shrink-0">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-3 pt-0 ml-7">
          <div className="p-3 rounded-lg bg-[var(--bg-primary)] text-sm text-[var(--text-secondary)]">
            {source.snippet || source.content || 'No content available'}
          </div>
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs text-[var(--accent-primary)] hover:underline"
            >
              <ExternalLink size={12} />
              Open source
            </a>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Compact inline result preview.
 */
export const HybridResultsPreview = ({ 
  documentCount = 0, 
  webCount = 0,
  webSearched = false 
}) => {
  return (
    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
      {documentCount > 0 && (
        <span className="flex items-center gap-1">
          <FileText size={12} className="text-blue-500" />
          {documentCount} docs
        </span>
      )}
      {webSearched && webCount > 0 && (
        <span className="flex items-center gap-1">
          <Globe size={12} className="text-green-500" />
          {webCount} web
        </span>
      )}
    </div>
  );
};

export default HybridResults;
