import { X, FileText, Percent, ExternalLink, Globe, Link } from "lucide-react";

export default function SourceViewer({ sources, isOpen, onClose }) {
  if (!isOpen) return null;

  // Separate document and web sources
  const docSources = sources.filter(s => s.source !== 'web');
  const webSources = sources.filter(s => s.source === 'web');

  const docSurfaceStyle = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-light)",
  };

  const webSurfaceStyle = {
    background: "color-mix(in srgb, var(--bg-secondary) 90%, var(--warning) 10%)",
    border: "1px solid color-mix(in srgb, var(--warning) 28%, transparent)",
  };

  const accentBadgeStyle = {
    background: "color-mix(in srgb, var(--accent-primary) 14%, transparent)",
    border: "1px solid color-mix(in srgb, var(--accent-primary) 28%, transparent)",
    color: "var(--accent-primary)",
  };

  const renderDocumentSource = (source, index) => (
    <div
      key={`doc-${index}`}
      className="rounded-lg overflow-hidden"
      style={docSurfaceStyle}
    >
      {/* Source Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-light)] px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "color-mix(in srgb, var(--accent-primary) 14%, transparent)" }}
          >
            <FileText className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[var(--text-primary)]">
              {source.filename || source.file_name || `Document ${index + 1}`}
            </p>
            {source.page && (
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Page {source.page}
              </p>
            )}
          </div>
        </div>

        {/* Relevance Score */}
        <div className="flex items-center gap-1.5">
          <Percent className="h-3 w-3 text-[var(--success)]" />
          <span className="text-xs font-medium text-[var(--success)]">
            {Math.round((source.relevance_score || source.score || 0) * 100)}%
          </span>
        </div>
      </div>

      {/* Source Content */}
      <div className="px-4 py-3">
        <p
          className="text-xs leading-relaxed whitespace-pre-wrap"
          style={{ color: "var(--text-secondary)" }}
        >
          {source.full_text || source.text || source.content || "No content available"}
        </p>
      </div>

      {/* Source Footer */}
      {(source.chunk_index !== undefined || source.start_char !== undefined) && (
        <div className="flex items-center gap-4 border-t border-[var(--border-light)] bg-[var(--bg-hover)] px-4 py-2">
          {source.chunk_index !== undefined && (
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Chunk #{source.chunk_index}
            </span>
          )}
          {source.start_char !== undefined && source.end_char !== undefined && (
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Characters: {source.start_char}-{source.end_char}
            </span>
          )}
        </div>
      )}
    </div>
  );

  const renderWebSource = (source, index) => (
    <div
      key={`web-${index}`}
      className="rounded-lg overflow-hidden"
      style={webSurfaceStyle}
    >
      {/* Web Source Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--warning) 22%, transparent)" }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "color-mix(in srgb, var(--warning) 14%, transparent)" }}
          >
            <Globe className="h-3.5 w-3.5 text-[var(--warning)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--text-primary)]">
              {source.title || "Web Result"}
            </p>
            {source.url && (
              <p className="truncate text-[10px] text-[var(--text-tertiary)]">
                {new URL(source.url).hostname}
              </p>
            )}
          </div>
        </div>

        {/* External Link */}
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
            style={{
              color: "var(--warning)",
              border: "1px solid color-mix(in srgb, var(--warning) 28%, transparent)",
              background: "color-mix(in srgb, var(--warning) 10%, transparent)",
            }}
          >
            <ExternalLink className="h-3 w-3" />
            <span>Open</span>
          </a>
        )}
      </div>

      {/* Web Source Content */}
      <div className="px-4 py-3">
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {source.snippet || source.full_content?.substring(0, 300) || "No preview available"}
          {source.full_content && source.full_content.length > 300 && "..."}
        </p>
      </div>

      {/* Web Source Footer */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          borderTop: "1px solid color-mix(in srgb, var(--warning) 22%, transparent)",
          background: "color-mix(in srgb, var(--warning) 8%, transparent)",
        }}
      >
        <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--warning)" }}>
          <Link className="h-3 w-3" />
          Web source
        </span>
        {source.relevance_score && (
          <div className="flex items-center gap-1">
            <Percent className="h-3 w-3" style={{ color: "var(--warning)" }} />
            <span className="text-[10px]" style={{ color: "var(--warning)" }}>
              {Math.round(source.relevance_score * 100)}% relevance
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[80vh] rounded-xl overflow-hidden flex flex-col"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-light)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--accent-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Sources ({sources.length})
              </h2>
            </div>
            {webSources.length > 0 && (
              <div
                className="flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{
                  background: "color-mix(in srgb, var(--warning) 14%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--warning) 28%, transparent)",
                }}
              >
                <Globe className="h-3 w-3 text-[var(--warning)]" />
                <span className="text-[10px] font-medium text-[var(--warning)]">
                  {webSources.length} web
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sources List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
          {/* Document Sources Section */}
          {docSources.length > 0 && (
            <div>
              {webSources.length > 0 && (
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--accent-primary)]">
                  <FileText className="h-3.5 w-3.5" />
                  Document Sources ({docSources.length})
                </h3>
              )}
              <div className="space-y-3">
                {docSources.map((source, index) => renderDocumentSource(source, index))}
              </div>
            </div>
          )}

          {/* Web Sources Section */}
          {webSources.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--warning)]">
                <Globe className="h-3.5 w-3.5" />
                Web Sources ({webSources.length})
              </h3>
              <div className="space-y-3">
                {webSources.map((source, index) => renderWebSource(source, index))}
              </div>
            </div>
          )}

          {sources.length === 0 && (
            <div className="text-center py-8">
              <FileText className="mx-auto mb-2 h-10 w-10 text-[var(--text-tertiary)]" />
              <p className="text-sm text-[var(--text-tertiary)]">
                No sources available
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-light)] px-5 py-3">
          <p className="text-[10px] text-[var(--text-tertiary)]">
            {webSources.length > 0 
              ? "Sources from documents and web search" 
              : "These sources were used to generate the response"}
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={accentBadgeStyle}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
