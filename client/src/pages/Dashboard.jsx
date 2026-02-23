import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { documentsAPI, queryAPI } from "../api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Upload,
  File,
  Trash2,
  LogOut,
  Send,
  FileText,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle,
  Bot,
  User,
  Sparkles,
  Clock,
  X,
  ChevronDown,
  Zap,
  Menu,
  Plus,
} from "lucide-react";

export default function Dashboard() {
  const { logout } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedSources, setExpandedSources] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchDocuments(); }, []);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
      await documentsAPI.upload(file, (progress) => setUploadProgress(progress));
      setSuccess("Document uploaded!");
      fetchDocuments();
      setUploadProgress(0);
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
    if (!window.confirm("Delete this document?")) return;
    try {
      await documentsAPI.delete(fileId);
      setSuccess("Document deleted!");
      fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete document");
    }
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    const userMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    const currentQuestion = question;
    setQuestion("");
    setLoading(true);
    setError("");
    try {
      const response = await queryAPI.query(currentQuestion);
      const { answer, sources } = response.data;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: answer || "No response received.", sources: sources || [] },
      ]);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Failed to get response.";
      setError(errorMsg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${errorMsg}`, sources: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSources = (index) => {
    setExpandedSources((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="h-screen flex flex-col overflow-x-hidden" style={{ background: '#0a0e1a' }}>
      {/* ═══ Header ═══ */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-2 sm:px-5 py-2.5 z-50"
        style={{
          background: 'linear-gradient(90deg, #0d1224, #111833)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.12)',
        }}
      >
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg transition-colors lg:hidden"
            style={{ color: '#94a3b8' }}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div
            className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
          >
            <FileText className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-bold truncate" style={{ color: '#c7d2fe' }}>DocTalk</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Stats — hidden on small screens */}
          <div className="hidden lg:flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" style={{ color: '#818cf8' }} />
              <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>{documents.length} docs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" style={{ color: '#22d3ee' }} />
              <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>{messages.length} msgs</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={{ color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.15)' }}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* ═══ Main Area ═══ */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ─── Mobile Overlay Backdrop ─── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ─── Sidebar (Documents) ─── */}
        <aside
          className={`
            fixed lg:relative top-0 left-0 h-full z-40 lg:z-auto
            flex flex-col transition-transform duration-300 ease-in-out
            w-64 sm:w-72 lg:w-64 xl:w-72
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{
            background: '#0d1224',
            borderRight: '1px solid rgba(99, 102, 241, 0.1)',
          }}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.08)' }}>
            <div className="flex items-center gap-2">
              <File className="h-4 w-4" style={{ color: '#818cf8' }} />
              <span className="text-sm font-semibold" style={{ color: '#c7d2fe' }}>My Documents</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8' }}
              >
                {documents.length}
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 rounded"
                style={{ color: '#64748b' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Upload */}
          <div className="px-4 py-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>{uploading ? "Processing..." : "Upload"}</span>
            </button>
            <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.txt" />
            <p className="text-[10px] text-center mt-1.5" style={{ color: '#475569' }}>PDF, DOC, DOCX, TXT</p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="mx-4 mb-3 p-3 rounded-lg" style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
              <div className="flex justify-between text-[11px] mb-1.5" style={{ color: '#818cf8' }}>
                <span>Uploading...</span><span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1 rounded-full" style={{ background: '#1e293b' }}>
                <div className="h-1 rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #6366f1, #06b6d4)' }} />
              </div>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="mx-4 mb-2 px-3 py-2 rounded-lg text-[11px] flex items-start gap-2" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.12)', color: '#fca5a5' }}>
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span className="flex-1 break-words">{error}</span>
              <button onClick={() => setError("")}><X className="h-3 w-3" /></button>
            </div>
          )}
          {success && (
            <div className="mx-4 mb-2 px-3 py-2 rounded-lg text-[11px] flex items-start gap-2" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.12)', color: '#6ee7b7' }}>
              <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span className="flex-1 break-words">{success}</span>
              <button onClick={() => setSuccess("")}><X className="h-3 w-3" /></button>
            </div>
          )}

          {/* Document List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar">
            {documents.length === 0 ? (
              <div className="text-center py-10">
                <div className="h-12 w-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99, 102, 241, 0.06)' }}>
                  <File className="h-5 w-5" style={{ color: '#4f46e5' }} />
                </div>
                <p className="text-xs font-medium" style={{ color: '#64748b' }}>No documents yet</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#334155' }}>Upload a file to get started</p>
              </div>
            ) : (
              <div className="space-y-1">
                {documents.map((doc) => (
                  <div
                    key={doc.file_id}
                    className="group flex items-center gap-2.5 p-2.5 rounded-lg transition-all duration-200 cursor-default hover:bg-[rgba(99,102,241,0.06)]"
                    style={{ border: '1px solid transparent' }}
                  >
                    <div className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
                      <FileText className="h-3.5 w-3.5" style={{ color: '#818cf8' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: '#cbd5e1' }}>{doc.filename}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-2.5 w-2.5 flex-shrink-0" style={{ color: '#334155' }} />
                        <span className="text-[10px]" style={{ color: '#475569' }}>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.file_id)}
                      className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      style={{ color: '#f87171' }}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ─── Chat Area ─── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ background: '#080c16' }}>
          {/* Chat Header */}
          <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2" style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.08)' }}>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
              <Bot className="h-4 w-4" style={{ color: '#22d3ee' }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-semibold" style={{ color: '#e2e8f0' }}>AI Assistant</h2>
              <p className="text-[9px] sm:text-[10px] truncate" style={{ color: '#475569' }}>Ask about your documents</p>
            </div>
            {documents.length > 0 && (
              <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.12)' }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34d399' }} />
                <span className="text-[9px] sm:text-[10px] font-medium" style={{ color: '#34d399' }}>Ready</span>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 sm:py-4 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm px-4">
                  <div
                    className="h-14 w-14 sm:h-16 sm:w-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.12)' }}
                  >
                    <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: '#818cf8' }} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mb-1.5" style={{ color: '#e2e8f0' }}>Start a Conversation</h3>
                  <p className="text-xs sm:text-sm mb-5" style={{ color: '#64748b' }}>
                    Ask questions about your documents and get AI-powered answers.
                  </p>
                  <div className="space-y-2">
                    {["Summarize the key findings", "Compare across documents", "What topics are covered?"].map(
                      (hint, i) => (
                        <button
                          key={i}
                          onClick={() => setQuestion(hint)}
                          className="w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs transition-all duration-200"
                          style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)' }}
                        >
                          <span style={{ color: '#6366f1', marginRight: '6px' }}>→</span>{hint}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`flex items-start gap-2 max-w-[92%] sm:max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                      {/* Avatar */}
                      <div
                        className="flex-shrink-0 h-6 w-6 sm:h-7 sm:w-7 rounded-lg flex items-center justify-center mt-0.5"
                        style={{ background: message.role === "user" ? 'rgba(99,102,241,0.12)' : 'rgba(6,182,212,0.1)' }}
                      >
                        {message.role === "user"
                          ? <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: '#818cf8' }} />
                          : <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: '#22d3ee' }} />
                        }
                      </div>

                      {/* Bubble */}
                      <div className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"} min-w-0`}>
                        <div
                          className="rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 overflow-hidden"
                          style={
                            message.role === "user"
                              ? { background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: '#e0e7ff', borderTopRightRadius: '6px' }
                              : { background: '#111833', border: '1px solid rgba(99,102,241,0.08)', color: '#cbd5e1', borderTopLeftRadius: '6px' }
                          }
                        >
                          {message.role === "assistant" ? (
                            <div className="markdown-content text-xs sm:text-sm leading-relaxed overflow-x-auto">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">{message.content}</p>
                          )}
                        </div>

                        {/* Sources */}
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-1.5">
                            <button onClick={() => toggleSources(index)} className="flex items-center gap-1 text-[10px] sm:text-[11px]" style={{ color: '#64748b' }}>
                              <FileText className="h-3 w-3" />
                              <span>{message.sources.length} source{message.sources.length > 1 ? 's' : ''}</span>
                              <ChevronDown className={`h-3 w-3 transition-transform ${expandedSources[index] ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedSources[index] && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {message.sources.map((source, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] sm:text-[10px]" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)', color: '#94a3b8' }}>
                                    <FileText className="h-2.5 w-2.5 mr-1 flex-shrink-0" style={{ color: '#6366f1' }} />
                                    <span className="truncate max-w-[120px] sm:max-w-none">
                                      {typeof source === "object" ? `${source.filename || "Unknown"}${source.page ? ` · p${source.page}` : ""}` : source}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <span className="text-[9px] sm:text-[10px] mt-1 px-1" style={{ color: '#334155' }}>
                          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2">
                      <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)' }}>
                        <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: '#22d3ee' }} />
                      </div>
                      <div className="rounded-2xl rounded-tl-md px-3 sm:px-4 py-2.5 sm:py-3" style={{ background: '#111833', border: '1px solid rgba(99,102,241,0.08)' }}>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#6366f1', animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                            ))}
                          </div>
                          <span className="text-[10px] sm:text-[11px]" style={{ color: '#64748b' }}>Analyzing...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="flex-shrink-0 px-3 sm:px-5 py-2.5 sm:py-3" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
            <form onSubmit={handleQuerySubmit} className="max-w-3xl mx-auto flex gap-2 sm:gap-3">
              <div className="flex-1 relative min-w-0">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={documents.length === 0 ? "Upload a document first..." : "Ask about your documents..."}
                  disabled={loading || documents.length === 0}
                  className="w-full px-3 sm:px-4 py-2.5 pr-8 rounded-xl text-xs sm:text-sm disabled:opacity-30 transition-all duration-200 focus:outline-none"
                  style={{ background: '#0d1224', border: '1px solid rgba(99,102,241,0.1)', color: '#e2e8f0' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.3)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.1)'; e.target.style.boxShadow = 'none'; }}
                />
                {question.length > 0 && (
                  <button type="button" onClick={() => setQuestion("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: '#475569' }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !question.trim() || documents.length === 0}
                className="px-3 sm:px-5 py-2.5 rounded-xl flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-white transition-all duration-200 disabled:opacity-25 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
            {documents.length === 0 && (
              <p className="text-center text-[10px] sm:text-[11px] mt-1.5 flex items-center justify-center gap-1" style={{ color: '#334155' }}>
                <AlertCircle className="h-3 w-3" />
                <span>Upload documents to start chatting</span>
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
