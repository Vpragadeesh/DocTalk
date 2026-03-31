import { useState } from "react";
import { Filter, X, ChevronDown, FileText, Calendar } from "lucide-react";

export default function FilterPanel({ documents, onFiltersChange, activeFilters }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const accentSurfaceStyle = {
    background: "color-mix(in srgb, var(--accent-primary) 14%, transparent)",
    border: "1px solid color-mix(in srgb, var(--accent-primary) 28%, transparent)",
    color: "var(--accent-primary)",
  };

  const gradientButtonStyle = {
    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-hover))",
  };

  const handleApply = () => {
    if (selectedDocIds.length === 0 && !dateRange.from && !dateRange.to) {
      onFiltersChange(null);
    } else {
      onFiltersChange({
        document_ids: selectedDocIds.length > 0 ? selectedDocIds : null,
        date_from: dateRange.from || null,
        date_to: dateRange.to || null,
      });
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedDocIds([]);
    setDateRange({ from: "", to: "" });
    onFiltersChange(null);
  };

  const toggleDocument = (docId) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
        style={accentSurfaceStyle}
      >
        <Filter className="h-3.5 w-3.5" />
        <span>Filter</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Panel */}
          <div
            className="absolute left-0 bottom-full mb-2 w-72 rounded-xl shadow-xl z-50"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-light)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-light)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Filter Results
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
              {/* Documents */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                  <FileText className="h-3.5 w-3.5" />
                  Documents
                </label>
                {documents.length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    No documents uploaded
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {documents.map((doc) => (
                      <label
                        key={doc.file_id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-light)] p-2 transition-colors hover:bg-[var(--bg-hover)]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocIds.includes(doc.file_id)}
                          onChange={() => toggleDocument(doc.file_id)}
                          className="h-3.5 w-3.5 rounded border-[var(--border-medium)] bg-[var(--bg-secondary)] text-[var(--accent-primary)] focus:ring-[color:color-mix(in_srgb,var(--accent-primary)_25%,transparent)]"
                        />
                        <span className="flex-1 truncate text-xs text-[var(--text-primary)]">
                          {doc.filename}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Date Range */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                  <Calendar className="h-3.5 w-3.5" />
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                    className="flex-1 rounded-lg border border-[var(--border-light)] bg-[var(--bg-tertiary)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                  <span className="text-xs text-[var(--text-tertiary)]">
                    to
                  </span>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                    className="flex-1 rounded-lg border border-[var(--border-light)] bg-[var(--bg-tertiary)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[var(--border-light)] px-4 py-3">
              <button onClick={handleClear} className="text-xs text-[var(--error)]">
                Clear all
              </button>
              <button
                onClick={handleApply}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={gradientButtonStyle}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
