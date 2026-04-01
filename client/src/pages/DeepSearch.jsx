import React, { useState, useCallback, useEffect } from 'react';
import { 
  Search, Brain, FileText, Zap, Clock, ChevronDown, 
  ChevronRight, Sparkles, Network, AlertCircle, RefreshCw,
  ArrowLeft, Home, History, Trash2, X, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { deepSearchAPI } from '../api/index';
import ReasoningViewer from '../components/ReasoningViewer';
import DocumentGraph from '../components/DocumentGraph';
import ThemeToggle from '../components/ThemeToggle';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const DeepSearch = () => {
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState('moderate');
  const [includeReasoning, setIncludeReasoning] = useState(true);
  const [crossDocument, setCrossDocument] = useState(true);
  
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const [showReasoning, setShowReasoning] = useState(false);
  const [showRelationships, setShowRelationships] = useState(false);
  const [activeTab, setActiveTab] = useState('answer'); // answer, reasoning, graph
  
  // History state
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  
  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await deepSearchAPI.getHistory(20);
      setHistory(response.data.history || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const clearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all search history?')) return;
    
    try {
      await deepSearchAPI.clearHistory();
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const loadFromHistory = (item) => {
    setResult({
      answer: item.answer,
      confidence: item.confidence,
      sources: item.sources,
      reasoning_chain: item.reasoning_chain,
      document_relationships: item.relationships,
      processing_time_ms: item.processing_time_ms,
      completeness: 0.8,
      reasoning_quality: 'medium',
      related_concepts: [],
      follow_up_suggestions: []
    });
    setQuery(item.query);
    setActiveTab('answer');
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await deepSearchAPI.search(query, {
        depth,
        includeReasoning,
        crossDocument,
      });
      
      setResult(response.data);
      setActiveTab('answer');
      
      // Reload history to include the new search
      loadHistory();
    } catch (err) {
      console.error('Deep search error:', err);
      setError(err.response?.data?.detail || err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
  };

  const getDepthIcon = () => {
    switch (depth) {
      case 'simple': return <Zap className="w-4 h-4" />;
      case 'moderate': return <Brain className="w-4 h-4" />;
      case 'deep': return <Sparkles className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getDepthDescription = () => {
    switch (depth) {
      case 'simple': return 'Fast search with minimal reasoning (~1s)';
      case 'moderate': return 'Balanced search with reasoning (~3-5s)';
      case 'deep': return 'Thorough analysis with full reasoning (~5-15s)';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      {/* History Sidebar */}
      {showHistory && (
        <aside className="w-72 border-r border-[var(--border-light)] bg-[var(--bg-secondary)] flex flex-col h-screen">
          <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[var(--accent-primary)]" />
              <h2 className="font-semibold">Search History</h2>
            </div>
            <div className="flex items-center gap-1">
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="p-1.5 text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Brain className="w-10 h-10 mx-auto text-[var(--text-tertiary)] mb-2" />
                <p className="text-sm text-[var(--text-tertiary)]">No search history yet</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Your deep searches will appear here</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {history.map((item) => (
                  <button
                    key={item.search_id}
                    onClick={() => loadFromHistory(item)}
                    className="w-full text-left p-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group"
                  >
                    <p className="text-sm font-medium line-clamp-2 group-hover:text-[var(--accent-primary)]">
                      {item.query}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        item.depth === 'deep' ? 'bg-purple-500/10 text-purple-500' :
                        item.depth === 'moderate' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-green-500/10 text-green-500'
                      }`}>
                        {item.depth}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {Math.round(item.confidence * 100)}% confidence
                      </span>
                      {item.sources?.length > 0 && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          • {item.sources.length} sources
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-[var(--border-light)]">
            <button
              onClick={loadHistory}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="border-b border-[var(--border-light)] bg-[var(--bg-secondary)]">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!showHistory && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                  title="Show history"
                >
                  <PanelLeft className="w-5 h-5" />
                </button>
              )}
              <Link 
                to="/dashboard" 
                className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </Link>
              <div className="h-6 w-px bg-[var(--border-light)]" />
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-[var(--accent-primary)]" />
                <h1 className="text-xl font-semibold">Deep Search</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                to="/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Link>
              <ThemeToggle variant="header" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Search Section */}
            <div className="mb-8">
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] p-6">
                {/* Search Input */}
                <div className="mb-4">
                  <div className="relative">
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask complex questions that require reasoning across your documents..."
                      className="w-full h-24 px-4 py-3 pr-12 bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent placeholder:text-[var(--text-tertiary)]"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={isSearching || !query.trim()}
                      className="absolute right-3 bottom-3 p-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                      {isSearching ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Depth Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-secondary)]">Depth:</span>
                <div className="flex bg-[var(--bg-primary)] rounded-lg border border-[var(--border-light)] p-1">
                  {['simple', 'moderate', 'deep'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDepth(d)}
                      className={`px-3 py-1 text-sm rounded-md capitalize transition-colors ${
                        depth === d
                          ? 'bg-[var(--accent-primary)] text-white'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeReasoning}
                  onChange={(e) => setIncludeReasoning(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border-light)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">Show Reasoning</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crossDocument}
                  onChange={(e) => setCrossDocument(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border-light)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">Cross-Document</span>
              </label>

              {/* Depth Description */}
              <div className="flex items-center gap-2 ml-auto text-sm text-[var(--text-tertiary)]">
                {getDepthIcon()}
                <span>{getDepthDescription()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <Brain className="w-16 h-16 text-[var(--accent-primary)] animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <p className="mt-4 text-[var(--text-secondary)]">
              Analyzing documents and reasoning...
            </p>
            <p className="text-sm text-[var(--text-tertiary)]">
              This may take a few seconds for {depth} depth
            </p>
          </div>
        )}

        {/* Results */}
        {result && !isSearching && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-[var(--border-light)]">
              <button
                onClick={() => setActiveTab('answer')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'answer'
                    ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Answer
                </span>
              </button>
              {result.reasoning_chain && result.reasoning_chain.length > 0 && (
                <button
                  onClick={() => setActiveTab('reasoning')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'reasoning'
                      ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Reasoning ({result.reasoning_chain.length} steps)
                  </span>
                </button>
              )}
              {result.document_relationships && result.document_relationships.length > 0 && (
                <button
                  onClick={() => setActiveTab('graph')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'graph'
                      ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    Relationships
                  </span>
                </button>
              )}
            </div>

            {/* Tab Content */}
            {activeTab === 'answer' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Answer */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Answer</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--text-secondary)]">Confidence:</span>
                        <span className={`text-sm font-medium ${
                          result.confidence >= 0.7 ? 'text-green-500' :
                          result.confidence >= 0.4 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {Math.round(result.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result.answer}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Sources */}
                  {result.sources && result.sources.length > 0 && (
                    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] p-6">
                      <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Sources ({result.sources.length})
                      </h3>
                      <div className="space-y-3">
                        {result.sources.map((source, idx) => (
                          <div 
                            key={idx}
                            className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-light)]"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">
                                {source.filename && source.filename !== 'Unknown' && source.filename !== 'Unknown Document' 
                                  ? source.filename 
                                  : `Document ${idx + 1}`}
                              </span>
                              <div className="flex items-center gap-2">
                                {source.relevance_score > 0 && (
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    {Math.round(source.relevance_score * 100)}% match
                                  </span>
                                )}
                                {source.page && (
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    Page {source.page}
                                  </span>
                                )}
                              </div>
                            </div>
                            {source.full_text && (
                              <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-2">
                                {source.full_text}
                              </p>
                            )}
                            {source.matched_concepts && source.matched_concepts.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {source.matched_concepts.map((concept, i) => (
                                  <span 
                                    key={i}
                                    className="px-2 py-0.5 text-xs bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded"
                                  >
                                    {concept}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Metrics */}
                  <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] p-6">
                    <h3 className="text-md font-semibold mb-4">Search Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--text-secondary)]">Processing Time</span>
                        <span className="text-sm font-medium">{result.processing_time_ms}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--text-secondary)]">Completeness</span>
                        <span className="text-sm font-medium">{Math.round(result.completeness * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--text-secondary)]">Reasoning Quality</span>
                        <span className={`text-sm font-medium capitalize ${
                          result.reasoning_quality === 'high' ? 'text-green-500' :
                          result.reasoning_quality === 'medium' ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {result.reasoning_quality}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--text-secondary)]">Sources Used</span>
                        <span className="text-sm font-medium">{result.sources?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Related Concepts */}
                  {result.related_concepts && result.related_concepts.length > 0 && (
                    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] p-6">
                      <h3 className="text-md font-semibold mb-4">Related Concepts</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.related_concepts.map((concept, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-1 text-sm bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-lg"
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Suggestions */}
                  {result.follow_up_suggestions && result.follow_up_suggestions.length > 0 && (
                    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] p-6">
                      <h3 className="text-md font-semibold mb-4">Suggested Follow-ups</h3>
                      <div className="space-y-2">
                        {result.follow_up_suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full text-left p-3 text-sm bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-lg hover:border-[var(--accent-primary)] transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reasoning' && result.reasoning_chain && (
              <ReasoningViewer steps={result.reasoning_chain} />
            )}

            {activeTab === 'graph' && result.document_relationships && (
              <DocumentGraph 
                relationships={result.document_relationships}
                concepts={result.related_concepts || []}
              />
            )}
          </div>
        )}

        {/* Empty State */}
        {!result && !isSearching && !error && (
          <div className="text-center py-16">
            <Brain className="w-16 h-16 mx-auto text-[var(--text-tertiary)] mb-4" />
            <h2 className="text-xl font-semibold mb-2">Ask Complex Questions</h2>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto mb-8">
              Deep Search uses multi-hop reasoning to answer questions that require 
              understanding relationships across your documents.
            </p>
            
            <div className="max-w-lg mx-auto">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Example queries:</h3>
              <div className="space-y-2">
                {[
                  "How do the principles in chapter 2 apply to the case study in chapter 5?",
                  "What are the risks if we follow approach A instead of B?",
                  "Compare the cost implications of strategy X vs Y",
                  "Which documents discuss similar concepts?"
                ].map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuery(example)}
                    className="w-full text-left p-3 text-sm bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg hover:border-[var(--accent-primary)] transition-colors"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DeepSearch;
