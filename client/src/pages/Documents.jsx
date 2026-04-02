import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { documentsAPI } from "../api";
import {
  Upload,
  File,
  Trash2,
  LogOut,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Plus,
  MessageSquare,
  ArrowLeft,
  Search,
  Filter,
  FolderOpen,
  Grid,
  List,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

export default function Documents() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [category, setCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'
  const [selectedCategory, setSelectedCategory] = useState("all");
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await documentsAPI.list();
      const docs = Array.isArray(response.data) ? response.data : response.data.documents || [];
      setDocuments(docs);
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError("Failed to load documents");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      await documentsAPI.upload(file, category || null, (progress) => setUploadProgress(progress));
      setSuccess(`Document uploaded${category ? ` with category "${category}"` : ''}!`);
      fetchDocuments();
      setUploadProgress(0);
      setCategory("");
      e.target.value = "";
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail ||
        (Array.isArray(err.response?.data) ? err.response.data[0]?.msg : null) ||
        err.message ||
        "Failed to upload document";
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (fileId) => {
    if (!window.confirm("Delete this document? This action cannot be undone.")) return;
    try {
      await documentsAPI.delete(fileId);
      setSuccess("Document deleted!");
      fetchDocuments();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete document");
    }
  };

  // Get unique categories
  const categories = ["all", ...new Set(documents.map(d => d.category).filter(Boolean))];

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const colors = {
      pdf: '#ef4444',
      doc: '#3b82f6',
      docx: '#3b82f6',
      txt: '#6b7280',
    };
    return colors[ext] || '#818cf8';
  };

  const accentSurfaceStyle = {
    background: "color-mix(in srgb, var(--accent-primary) 14%, transparent)",
    border: "1px solid color-mix(in srgb, var(--accent-primary) 28%, transparent)",
    color: "var(--accent-primary)",
  };

  const successSurfaceStyle = {
    background: "color-mix(in srgb, var(--success) 14%, transparent)",
    border: "1px solid color-mix(in srgb, var(--success) 28%, transparent)",
    color: "var(--success)",
  };

  const dangerSurfaceStyle = {
    background: "color-mix(in srgb, var(--error) 14%, transparent)",
    border: "1px solid color-mix(in srgb, var(--error) 28%, transparent)",
    color: "var(--error)",
  };

  const gradientButtonStyle = {
    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-hover))",
  };

  return (
    <div className="flex h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-lg p-2 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={gradientButtonStyle}
          >
            <FolderOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--text-primary)]">My Documents</h1>
            <p className="text-xs text-[var(--text-tertiary)]">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle variant="header" />

          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all"
            style={accentSurfaceStyle}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all"
            style={dangerSurfaceStyle}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-[var(--border-light)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-1 gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-placeholder)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--accent-primary)_30%,transparent)]"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="cursor-pointer rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="hidden items-center rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] p-1 sm:flex">
              <button
                onClick={() => setViewMode('list')}
                className={`rounded p-1.5 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded p-1.5 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="w-28 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={gradientButtonStyle}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>{uploading ? "Uploading..." : "Upload"}</span>
            </button>
            <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.txt" />
          </div>
        </div>

        {/* Alerts */}
        {(error || success || uploading) && (
          <div className="px-4 sm:px-6 py-2">
            {uploading && (
              <div className="mb-2 rounded-lg p-3" style={accentSurfaceStyle}>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--bg-tertiary)]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, ...gradientButtonStyle }} />
                </div>
              </div>
            )}
            {error && (
              <div className="mb-2 flex items-center gap-2 rounded-lg px-4 py-3" style={dangerSurfaceStyle}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-sm">{error}</span>
                <button onClick={() => setError("")}><X className="h-4 w-4" /></button>
              </div>
            )}
            {success && (
              <div className="mb-2 flex items-center gap-2 rounded-lg px-4 py-3" style={successSurfaceStyle}>
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-sm">{success}</span>
                <button onClick={() => setSuccess("")}><X className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        )}

        {/* Documents List/Grid */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div
                className="h-20 w-20 rounded-2xl flex items-center justify-center mb-4"
                style={accentSurfaceStyle}
              >
                <FolderOpen className="h-10 w-10 text-[var(--accent-primary)]" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                {searchQuery || selectedCategory !== "all" ? "No documents found" : "No documents yet"}
              </h3>
              <p className="mb-4 text-sm text-[var(--text-secondary)]">
                {searchQuery || selectedCategory !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "Upload your first document to get started"}
              </p>
              {!searchQuery && selectedCategory === "all" && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={gradientButtonStyle}
                >
                  <Plus className="h-4 w-4" />
                  Upload Document
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            // Grid View
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.file_id}
                  className="group p-4 rounded-xl transition-all hover:scale-[1.02]"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center"
                      style={{ background: `${getFileIcon(doc.filename)}15` }}
                    >
                      <FileText className="h-6 w-6" style={{ color: getFileIcon(doc.filename) }} />
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.file_id)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      style={{
                        color: 'var(--error)',
                        background: 'color-mix(in srgb, var(--error) 16%, transparent)',
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <h4 className="mb-1 truncate text-sm font-medium text-[var(--text-primary)]">{doc.filename}</h4>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                  </div>
                  {doc.category && (
                    <span
                      className="inline-block mt-2 px-2 py-0.5 rounded text-xs"
                      style={accentSurfaceStyle}
                    >
                      {doc.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // List View
            <div className="space-y-2">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.file_id}
                  className="group flex items-center gap-4 rounded-xl p-4 transition-all hover:bg-[var(--bg-hover)]"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${getFileIcon(doc.filename)}15` }}
                  >
                    <FileText className="h-5 w-5" style={{ color: getFileIcon(doc.filename) }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="truncate text-sm font-medium text-[var(--text-primary)]">{doc.filename}</h4>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                      {doc.category && (
                        <span
                          className="px-2 py-0.5 rounded"
                          style={accentSurfaceStyle}
                        >
                          {doc.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.file_id)}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    style={{
                      color: 'var(--error)',
                      background: 'color-mix(in srgb, var(--error) 16%, transparent)',
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
