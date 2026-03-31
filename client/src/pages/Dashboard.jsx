import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { documentsAPI, queryAPI, chatAPI } from "../api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import FilterPanel from "../components/FilterPanel";
import ChatHistory from "../components/ChatHistory";
import SourceViewer from "../components/SourceViewer";
import SearchMode, { SearchModeIndicator } from "../components/SearchMode";
import ThemeToggle from "../components/ThemeToggle";
import {
  LogOut,
  Send,
  FileText,
  MessageSquare,
  Loader2,
  AlertCircle,
  Bot,
  User,
  Sparkles,
  X,
  ChevronDown,
  Plus,
  Filter as FilterIcon,
  FolderOpen,
  Globe,
} from "lucide-react";

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeFilters, setActiveFilters] = useState(null);
  const [searchMode, setSearchMode] = useState('docs_only'); // docs_only, hybrid, web_only
  
  // Chat history state
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [chatHistoryCollapsed, setChatHistoryCollapsed] = useState(false);
  const [sourceViewerOpen, setSourceViewerOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState([]);
  const [conversationTitle, setConversationTitle] = useState("New Chat");
  
  const messagesEndRef = useRef(null);

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
    }
  };

  // Load conversation messages when switching conversations
  const loadConversation = async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      setCurrentConversationId(null);
      setConversationTitle("New Chat");
      return;
    }
    
    try {
      const response = await chatAPI.getConversation(conversationId);
      const { messages: convMessages, title } = response.data;
      
      const formattedMessages = convMessages.map(msg => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.content,
        sources: msg.sources || [],
        timestamp: msg.timestamp,
        messageId: msg.message_id
      }));
      
      setMessages(formattedMessages);
      setCurrentConversationId(conversationId);
      setConversationTitle(title || "Conversation");
    } catch (err) {
      console.error("Failed to load conversation:", err);
      setError("Failed to load conversation");
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setConversationTitle("New Chat");
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    
    const userMessage = { role: "user", content: question, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    const currentQuestion = question;
    setQuestion("");
    setLoading(true);
    setError("");
    
    try {
      // Prepare search context based on search mode
      const searchContext = searchMode !== 'docs_only' ? {
        enable_web_search: true,
        search_type: searchMode,
        max_web_results: 5
      } : null;
      
      const response = await queryAPI.query(currentQuestion, activeFilters, currentConversationId, searchContext);
      const { answer, sources, conversation_id, is_new_conversation, web_search_used } = response.data;
      
      if (is_new_conversation) {
        setCurrentConversationId(conversation_id);
        setConversationTitle(currentQuestion.slice(0, 50) + (currentQuestion.length > 50 ? '...' : ''));
      }
      
      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: answer || "No response received.", 
          sources: sources || [],
          timestamp: new Date().toISOString(),
          webSearchUsed: web_search_used || false
        },
      ]);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Failed to get response.";
      setError(errorMsg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${errorMsg}`, sources: [], timestamp: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (filters) => {
    setActiveFilters(filters);
  };

  const openSourceViewer = (sources) => {
    setSelectedSources(sources);
    setSourceViewerOpen(true);
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="z-50 flex flex-shrink-0 items-center justify-between border-b border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={gradientButtonStyle}
          >
            <FileText className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-base font-bold text-[var(--text-primary)]">DocTalk</h1>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle variant="header" />

          {/* Documents Link */}
          <button
            onClick={() => navigate('/documents')}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:-translate-y-px"
            style={accentSurfaceStyle}
          >
            <FolderOpen className="h-4 w-4" />
            <span>{documents.length} docs</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:-translate-y-px"
            style={dangerSurfaceStyle}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat History Sidebar */}
        <ChatHistory
          currentConversationId={currentConversationId}
          onSelectConversation={loadConversation}
          onNewConversation={handleNewConversation}
          isCollapsed={chatHistoryCollapsed}
          onToggleCollapse={() => setChatHistoryCollapsed(!chatHistoryCollapsed)}
        />

        {/* Chat Area */}
        <main className="min-w-0 flex flex-1 flex-col overflow-hidden bg-[var(--bg-primary)]">
          {/* Chat Header */}
          <div className="flex flex-shrink-0 items-center gap-3 border-b border-[var(--border-light)] px-4 py-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "color-mix(in srgb, var(--accent-primary) 14%, transparent)" }}
            >
              <Bot className="h-4 w-4 text-[var(--accent-primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {conversationTitle || 'AI Assistant'}
              </h2>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                {currentConversationId ? `${messages.length} messages` : 'Start a new conversation'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {currentConversationId && (
                <button
                  onClick={handleNewConversation}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors"
                  style={accentSurfaceStyle}
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              )}
              {documents.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5" style={successSurfaceStyle}>
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--success)]" />
                  <span className="text-[10px] font-medium">Ready</span>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm">
                  <div
                    className="h-16 w-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                    style={accentSurfaceStyle}
                  >
                    <Sparkles className="h-7 w-7 text-[var(--accent-primary)]" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-[var(--text-primary)]">Start a Conversation</h3>
                  <p className="mb-5 text-sm text-[var(--text-secondary)]">
                    {documents.length === 0 
                      ? "Upload documents first to start asking questions"
                      : "Ask questions about your documents and get AI-powered answers"}
                  </p>
                  {documents.length === 0 ? (
                    <button
                      onClick={() => navigate('/documents')}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                      style={gradientButtonStyle}
                    >
                      <FolderOpen className="h-4 w-4 inline mr-2" />
                      Go to Documents
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {["Summarize the key findings", "Compare across documents", "What topics are covered?"].map(
                        (hint, i) => (
                          <button
                            key={i}
                            onClick={() => setQuestion(hint)}
                            className="w-full text-left px-4 py-2.5 rounded-lg text-xs transition-all"
                            style={{
                              color: "var(--text-secondary)",
                              background: "color-mix(in srgb, var(--accent-primary) 8%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--accent-primary) 18%, transparent)",
                            }}
                          >
                            <span className="mr-1.5 text-[var(--accent-primary)]">-&gt;</span>{hint}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`flex items-start gap-2 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div
                        className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center mt-0.5"
                        style={{
                          background:
                            message.role === "user"
                              ? "color-mix(in srgb, var(--accent-primary) 16%, transparent)"
                              : "color-mix(in srgb, var(--accent-primary) 10%, transparent)",
                        }}
                      >
                        {message.role === "user"
                          ? <User className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                          : <Bot className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                        }
                      </div>

                      <div className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"} min-w-0`}>
                        <div
                          className="rounded-2xl px-4 py-3 overflow-hidden"
                          style={
                            message.role === "user"
                              ? {
                                  background: "linear-gradient(135deg, var(--accent-primary), var(--accent-hover))",
                                  color: "#ffffff",
                                  borderTopRightRadius: "6px",
                                }
                              : {
                                  background: "var(--bg-secondary)",
                                  border: "1px solid var(--border-light)",
                                  color: "var(--text-secondary)",
                                  borderTopLeftRadius: "6px",
                                }
                          }
                        >
                          {message.role === "assistant" ? (
                            <div className="markdown-content text-sm leading-relaxed overflow-x-auto">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{message.content}</p>
                          )}
                        </div>

                        {/* Sources with web indicator */}
                        {message.sources && message.sources.length > 0 && (
                          <button 
                            onClick={() => openSourceViewer(message.sources)} 
                            className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-[var(--border-light)] px-2.5 py-1 text-[11px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)]"
                          >
                            {message.webSearchUsed ? (
                              <Globe className="h-3 w-3 text-[var(--warning)]" />
                            ) : (
                              <FileText className="h-3 w-3 text-[var(--accent-primary)]" />
                            )}
                            <span>
                              {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
                              {message.webSearchUsed && ' (incl. web)'}
                            </span>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        )}

                        <span className="mt-1 px-1 text-[10px] text-[var(--text-tertiary)]">
                          {formatMessageTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{ background: "color-mix(in srgb, var(--accent-primary) 10%, transparent)" }}
                      >
                        <Bot className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                      </div>
                      <div
                        className="rounded-2xl rounded-tl-md border border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <div
                                key={i}
                                className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]"
                                style={{ animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite` }}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-[var(--text-tertiary)]">Analyzing...</span>
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
          <div className="relative z-10 flex-shrink-0 border-t border-[var(--border-light)] px-4 py-3">
            {error && (
              <div
                className="mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-lg px-3 py-2 text-xs"
                style={{
                  background: "color-mix(in srgb, var(--error) 14%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--error) 28%, transparent)",
                  color: "var(--error)",
                }}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError("")}><X className="h-3 w-3" /></button>
              </div>
            )}
            
            <form onSubmit={handleQuerySubmit} className="max-w-3xl mx-auto">
              <div className="relative z-10 mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FilterPanel 
                    documents={documents} 
                    onFiltersChange={handleFiltersChange}
                    activeFilters={activeFilters}
                  />
                  {activeFilters && (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs" style={accentSurfaceStyle}>
                      <FilterIcon className="h-3.5 w-3.5" />
                      <span>Filters active</span>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center justify-end">
                  <SearchMode 
                    searchMode={searchMode}
                    onModeChange={setSearchMode}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 relative min-w-0">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={documents.length === 0 ? "Upload documents first..." : "Ask about your documents..."}
                    disabled={loading || documents.length === 0}
                    className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-2.5 pr-8 text-sm text-[var(--text-primary)] transition-all placeholder:text-[var(--text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--accent-primary)_30%,transparent)] disabled:opacity-30"
                  />
                  {question.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuestion("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || !question.trim() || documents.length === 0}
                  className="px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold text-white transition-all disabled:opacity-25"
                  style={gradientButtonStyle}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* Source Viewer Modal */}
      <SourceViewer
        sources={selectedSources}
        isOpen={sourceViewerOpen}
        onClose={() => setSourceViewerOpen(false)}
      />
    </div>
  );
}
