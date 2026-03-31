import React, { useState } from 'react';
import { ExternalLink, Check, X, Loader } from 'lucide-react';

/**
 * SearchResults component for displaying search results before LLM processing.
 * Allows users to preview and select which results to include in context.
 */
const SearchResults = ({
  results = [],
  isLoading = false,
  onResultsSelected = () => {},
  onDismiss = () => {},
  searchQuery = '',
  sourceType = 'hybrid' // hybrid, web, documents
}) => {
  const [selectedResults, setSelectedResults] = useState(
    results.map((_, idx) => idx)
  );

  const handleToggleResult = (index) => {
    setSelectedResults(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleSelectAll = () => {
    if (selectedResults.length === results.length) {
      setSelectedResults([]);
    } else {
      setSelectedResults(results.map((_, idx) => idx));
    }
  };

  const handleContinue = () => {
    const selected = selectedResults.map(idx => results[idx]);
    onResultsSelected(selected);
  };

  if (isLoading) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] p-6">
        <Loader className="animate-spin text-[var(--accent-primary)]" size={20} />
        <p className="text-[var(--text-secondary)]">Searching <span className="font-semibold">"{searchQuery}"</span>...</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  const webResults = results.filter(r => r.source === 'web');
  const docResults = results.filter(r => r.source === 'document');

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)]">
      {/* Header */}
      <div
        className="border-b border-[var(--border-light)] px-4 py-3"
        style={{
          background:
            'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 10%, transparent), color-mix(in srgb, var(--warning) 10%, transparent))',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent-primary)]"></span>
              Search Results
            </h3>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              Found {results.length} result{results.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="rounded p-1 transition-colors hover:bg-[var(--bg-hover)]"
            title="Dismiss results"
          >
            <X size={18} className="text-[var(--text-tertiary)]" />
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="divide-y">
        {/* Document Results Section */}
        {docResults.length > 0 && (
          <div>
            <div className="bg-[var(--bg-tertiary)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              📄 Uploaded Documents ({docResults.length})
            </div>
            {docResults.map((result, idx) => {
              const originalIdx = results.indexOf(result);
              const isSelected = selectedResults.includes(originalIdx);
              
              return (
                <ResultItem
                  key={originalIdx}
                  result={result}
                  isSelected={isSelected}
                  onToggle={() => handleToggleResult(originalIdx)}
                  isDocument={true}
                />
              );
            })}
          </div>
        )}

        {/* Web Results Section */}
        {webResults.length > 0 && (
          <div>
            <div className="bg-[var(--bg-tertiary)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              🌐 Web Results ({webResults.length})
            </div>
            {webResults.map((result, idx) => {
              const originalIdx = results.indexOf(result);
              const isSelected = selectedResults.includes(originalIdx);
              
              return (
                <ResultItem
                  key={originalIdx}
                  result={result}
                  isSelected={isSelected}
                  onToggle={() => handleToggleResult(originalIdx)}
                  isDocument={false}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--border-light)] bg-[var(--bg-tertiary)] px-4 py-3">
        <button
          onClick={handleSelectAll}
          className="text-sm font-medium text-[var(--accent-primary)] transition-colors hover:opacity-80"
        >
          {selectedResults.length === results.length ? 'Deselect All' : 'Select All'}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">
            {selectedResults.length} of {results.length} selected
          </span>
          <button
            onClick={handleContinue}
            disabled={selectedResults.length === 0}
            className={`
              px-4 py-1.5 rounded-lg font-medium text-sm transition-all
              ${selectedResults.length === 0
                ? 'cursor-not-allowed bg-[var(--bg-hover)] text-[var(--text-tertiary)]'
                : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]'
              }
            `}
          >
            Continue with Selected
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Individual result item component
 */
const ResultItem = ({ result, isSelected, onToggle, isDocument }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isDocument) {
    return (
      <div
        className={`border-l-4 px-4 py-3 transition-colors hover:bg-[var(--bg-hover)] ${
          isSelected ? 'border-[var(--accent-primary)]' : 'border-transparent'
        }`}
        style={
          isSelected
            ? { background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' }
            : undefined
        }
      >
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            className={`
              mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center
              transition-all
              ${isSelected
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]'
                : 'border-[var(--border-medium)] hover:border-[var(--accent-primary)]'
              }
            `}
          >
            {isSelected && <Check size={16} className="text-white" />}
          </button>
          
          <div className="flex-1 min-w-0">
            <p className="break-words font-medium text-[var(--text-primary)]">
              {result.filename || result.title || 'Document'}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
              Page {result.page || '?'} • Relevance: {Math.round((result.relevance_score || 0) * 100)}%
            </p>
            
            <div className="mt-2 max-h-24 overflow-y-auto rounded bg-[var(--bg-tertiary)] p-2">
              <p className="line-clamp-3 text-sm text-[var(--text-secondary)]">
                {result.full_text || result.text || result.snippet || 'No preview available'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-l-4 px-4 py-3 transition-colors hover:bg-[var(--bg-hover)] ${
        isSelected ? 'border-[var(--warning)]' : 'border-transparent'
      }`}
      style={
        isSelected
          ? { background: 'color-mix(in srgb, var(--warning) 12%, transparent)' }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`
            mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center
            transition-all
            ${isSelected
              ? 'border-[var(--warning)] bg-[var(--warning)]'
              : 'border-[var(--border-medium)] hover:border-[var(--warning)]'
            }
          `}
        >
          {isSelected && <Check size={16} className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 break-words pr-2 font-medium text-[var(--accent-primary)] hover:underline"
            >
              {result.title || 'Untitled'}
            </a>
            <ExternalLink size={14} className="mt-0.5 flex-shrink-0 text-[var(--accent-primary)]" />
          </div>

          <p className="mt-0.5 break-all text-xs text-[var(--text-tertiary)]">
            {result.url}
          </p>

          {result.snippet && (
            <div className="mt-2 max-h-24 overflow-y-auto rounded bg-[var(--bg-tertiary)] p-2">
              <p className="line-clamp-3 text-sm text-[var(--text-secondary)]">
                {result.snippet}
              </p>
            </div>
          )}

          {result.full_content && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-xs font-medium text-[var(--accent-primary)] hover:opacity-80"
            >
              {isExpanded ? '▼ Hide full content' : '▶ Show full content'}
            </button>
          )}

          {isExpanded && result.full_content && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-2">
              <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
                {result.full_content.substring(0, 500)}
                {result.full_content.length > 500 && '...'}
              </p>
            </div>
          )}

          {result.sections && Object.keys(result.sections).length > 0 && (
            <div className="mt-2 text-xs text-[var(--text-secondary)]">
              <p className="font-medium">Page Structure:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {result.sections.h1?.length > 0 && (
                  <li>
                    {result.sections.h1.length} main heading{result.sections.h1.length !== 1 ? 's' : ''}
                  </li>
                )}
                {result.sections.h2?.length > 0 && (
                  <li>
                    {result.sections.h2.length} section{result.sections.h2.length !== 1 ? 's' : ''}
                  </li>
                )}
                {result.sections.lists?.length > 0 && (
                  <li>
                    {result.sections.lists.length} list{result.sections.lists.length !== 1 ? 's' : ''}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
