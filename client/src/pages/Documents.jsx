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

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0a0e1a' }}>
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3"
        style={{
          background: 'linear-gradient(90deg, #0d1224, #111833)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.12)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg transition-colors hover:bg-gray-800"
            style={{ color: '#94a3b8' }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
          >
            <FolderOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: '#c7d2fe' }}>My Documents</h1>
            <p className="text-xs" style={{ color: '#64748b' }}>{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.2)' }}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.15)' }}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between" style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.08)' }}>
          <div className="flex flex-1 gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#64748b' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm outline-none transition-all"
                style={{ background: '#0d1224', border: '1px solid rgba(99, 102, 241, 0.15)', color: '#e2e8f0' }}
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
              style={{ background: '#0d1224', border: '1px solid rgba(99, 102, 241, 0.15)', color: '#e2e8f0' }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="hidden sm:flex items-center rounded-lg p-1" style={{ background: '#0d1224', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-indigo-600' : ''}`}
                style={{ color: viewMode === 'list' ? '#fff' : '#64748b' }}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-indigo-600' : ''}`}
                style={{ color: viewMode === 'grid' ? '#fff' : '#64748b' }}
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
              className="w-28 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#0d1224', border: '1px solid rgba(99, 102, 241, 0.15)', color: '#e2e8f0' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
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
              <div className="mb-2 p-3 rounded-lg" style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                <div className="flex justify-between text-sm mb-2" style={{ color: '#818cf8' }}>
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: '#1e293b' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #6366f1, #06b6d4)' }} />
                </div>
              </div>
            )}
            {error && (
              <div className="mb-2 px-4 py-3 rounded-lg flex items-center gap-2" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.12)', color: '#fca5a5' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-sm">{error}</span>
                <button onClick={() => setError("")}><X className="h-4 w-4" /></button>
              </div>
            )}
            {success && (
              <div className="mb-2 px-4 py-3 rounded-lg flex items-center gap-2" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.12)', color: '#6ee7b7' }}>
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
                style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.12)' }}
              >
                <FolderOpen className="h-10 w-10" style={{ color: '#4f46e5' }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#e2e8f0' }}>
                {searchQuery || selectedCategory !== "all" ? "No documents found" : "No documents yet"}
              </h3>
              <p className="text-sm mb-4" style={{ color: '#64748b' }}>
                {searchQuery || selectedCategory !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "Upload your first document to get started"}
              </p>
              {!searchQuery && selectedCategory === "all" && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
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
                  style={{ background: '#0d1224', border: '1px solid rgba(99, 102, 241, 0.1)' }}
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
                      style={{ color: '#f87171', background: 'rgba(248, 113, 113, 0.1)' }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <h4 className="text-sm font-medium truncate mb-1" style={{ color: '#e2e8f0' }}>{doc.filename}</h4>
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                    <Clock className="h-3 w-3" />
                    <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                  </div>
                  {doc.category && (
                    <span
                      className="inline-block mt-2 px-2 py-0.5 rounded text-xs"
                      style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}
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
                  className="group flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-opacity-50"
                  style={{ background: '#0d1224', border: '1px solid rgba(99, 102, 241, 0.1)' }}
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${getFileIcon(doc.filename)}15` }}
                  >
                    <FileText className="h-5 w-5" style={{ color: getFileIcon(doc.filename) }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>{doc.filename}</h4>
                    <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: '#64748b' }}>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                      {doc.category && (
                        <span
                          className="px-2 py-0.5 rounded"
                          style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}
                        >
                          {doc.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.file_id)}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    style={{ color: '#f87171', background: 'rgba(248, 113, 113, 0.1)' }}
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
