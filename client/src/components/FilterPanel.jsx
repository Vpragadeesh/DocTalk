import { useState } from "react";
import { Filter, X, ChevronDown, FileText, Calendar } from "lucide-react";

export default function FilterPanel({ documents, onFiltersChange, activeFilters }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

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
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          activeFilters ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : ""
        }`}
        style={
          activeFilters
            ? {}
            : { background: "rgba(99, 102, 241, 0.08)", color: "#818cf8", border: "1px solid rgba(99, 102, 241, 0.15)" }
        }
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
            style={{ background: "#111833", border: "1px solid rgba(99, 102, 241, 0.2)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid rgba(99, 102, 241, 0.1)" }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
                Filter Results
              </h3>
              <button onClick={() => setIsOpen(false)} style={{ color: "#64748b" }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
              {/* Documents */}
              <div>
                <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: "#94a3b8" }}>
                  <FileText className="h-3.5 w-3.5" />
                  Documents
                </label>
                {documents.length === 0 ? (
                  <p className="text-xs" style={{ color: "#475569" }}>
                    No documents uploaded
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {documents.map((doc) => (
                      <label
                        key={doc.file_id}
                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-800/30"
                        style={{ border: "1px solid rgba(99, 102, 241, 0.08)" }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocIds.includes(doc.file_id)}
                          onChange={() => toggleDocument(doc.file_id)}
                          className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500/20"
                        />
                        <span className="text-xs truncate flex-1" style={{ color: "#cbd5e1" }}>
                          {doc.filename}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Date Range */}
              <div>
                <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: "#94a3b8" }}>
                  <Calendar className="h-3.5 w-3.5" />
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
                    style={{ background: "#0d1224", border: "1px solid rgba(99, 102, 241, 0.1)", color: "#94a3b8" }}
                  />
                  <span className="text-xs" style={{ color: "#475569" }}>
                    to
                  </span>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
                    style={{ background: "#0d1224", border: "1px solid rgba(99, 102, 241, 0.1)", color: "#94a3b8" }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "1px solid rgba(99, 102, 241, 0.1)" }}
            >
              <button onClick={handleClear} className="text-xs" style={{ color: "#f87171" }}>
                Clear all
              </button>
              <button
                onClick={handleApply}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}
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
