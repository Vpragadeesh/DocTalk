import { X, FileText, Percent, ExternalLink, Globe, Link } from "lucide-react";

export default function SourceViewer({ sources, isOpen, onClose }) {
  if (!isOpen) return null;

  // Separate document and web sources
  const docSources = sources.filter(s => s.source !== 'web');
  const webSources = sources.filter(s => s.source === 'web');

  const renderDocumentSource = (source, index) => (
    <div
      key={`doc-${index}`}
      className="rounded-lg overflow-hidden"
      style={{ background: "#111833", border: "1px solid rgba(99, 102, 241, 0.1)" }}
    >
      {/* Source Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid rgba(99, 102, 241, 0.08)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(99, 102, 241, 0.1)" }}
          >
            <FileText className="h-3.5 w-3.5" style={{ color: "#818cf8" }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "#e2e8f0" }}>
              {source.filename || source.file_name || `Document ${index + 1}`}
            </p>
            {source.page && (
              <p className="text-[10px]" style={{ color: "#64748b" }}>
                Page {source.page}
              </p>
            )}
          </div>
        </div>

        {/* Relevance Score */}
        <div className="flex items-center gap-1.5">
          <Percent className="h-3 w-3" style={{ color: "#34d399" }} />
          <span className="text-xs font-medium" style={{ color: "#34d399" }}>
            {Math.round((source.relevance_score || source.score || 0) * 100)}%
          </span>
        </div>
      </div>

      {/* Source Content */}
      <div className="px-4 py-3">
        <p
          className="text-xs leading-relaxed whitespace-pre-wrap"
          style={{ color: "#94a3b8" }}
        >
          {source.full_text || source.text || source.content || "No content available"}
        </p>
      </div>

      {/* Source Footer */}
      {(source.chunk_index !== undefined || source.start_char !== undefined) && (
        <div
          className="flex items-center gap-4 px-4 py-2"
          style={{ borderTop: "1px solid rgba(99, 102, 241, 0.08)", background: "rgba(99, 102, 241, 0.02)" }}
        >
          {source.chunk_index !== undefined && (
            <span className="text-[10px]" style={{ color: "#475569" }}>
              Chunk #{source.chunk_index}
            </span>
          )}
          {source.start_char !== undefined && source.end_char !== undefined && (
            <span className="text-[10px]" style={{ color: "#475569" }}>
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
      style={{ background: "#0f1a2e", border: "1px solid rgba(6, 182, 212, 0.15)" }}
    >
      {/* Web Source Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid rgba(6, 182, 212, 0.1)" }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(6, 182, 212, 0.1)" }}
          >
            <Globe className="h-3.5 w-3.5" style={{ color: "#22d3ee" }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate" style={{ color: "#e2e8f0" }}>
              {source.title || "Web Result"}
            </p>
            {source.url && (
              <p className="text-[10px] truncate" style={{ color: "#64748b" }}>
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
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors hover:bg-cyan-500/20"
            style={{ color: "#22d3ee", border: "1px solid rgba(6, 182, 212, 0.2)" }}
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
          style={{ color: "#94a3b8" }}
        >
          {source.snippet || source.full_content?.substring(0, 300) || "No preview available"}
          {source.full_content && source.full_content.length > 300 && "..."}
        </p>
      </div>

      {/* Web Source Footer */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderTop: "1px solid rgba(6, 182, 212, 0.08)", background: "rgba(6, 182, 212, 0.02)" }}
      >
        <span className="text-[10px] flex items-center gap-1" style={{ color: "#22d3ee" }}>
          <Link className="h-3 w-3" />
          Web source
        </span>
        {source.relevance_score && (
          <div className="flex items-center gap-1">
            <Percent className="h-3 w-3" style={{ color: "#22d3ee" }} />
            <span className="text-[10px]" style={{ color: "#22d3ee" }}>
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
        style={{ background: "#0d1224", border: "1px solid rgba(99, 102, 241, 0.2)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid rgba(99, 102, 241, 0.1)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: "#818cf8" }} />
              <h2 className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
                Sources ({sources.length})
              </h2>
            </div>
            {webSources.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.2)" }}>
                <Globe className="h-3 w-3" style={{ color: "#22d3ee" }} />
                <span className="text-[10px] font-medium" style={{ color: "#22d3ee" }}>
                  {webSources.length} web
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-gray-800/50"
            style={{ color: "#64748b" }}
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
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: "#818cf8" }}>
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
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: "#22d3ee" }}>
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
              <FileText className="h-10 w-10 mx-auto mb-2" style={{ color: "#334155" }} />
              <p className="text-sm" style={{ color: "#64748b" }}>
                No sources available
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: "1px solid rgba(99, 102, 241, 0.1)" }}
        >
          <p className="text-[10px]" style={{ color: "#475569" }}>
            {webSources.length > 0 
              ? "Sources from documents and web search" 
              : "These sources were used to generate the response"}
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "rgba(99, 102, 241, 0.1)", color: "#818cf8", border: "1px solid rgba(99, 102, 241, 0.2)" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
