import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { documentsAPI, queryAPI, chatAPI } from "../api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import FilterPanel from "../components/FilterPanel";
import ChatHistory from "../components/ChatHistory";
import SourceViewer from "../components/SourceViewer";
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
      const response = await queryAPI.query(currentQuestion, activeFilters, currentConversationId);
      const { answer, sources, conversation_id, is_new_conversation } = response.data;
      
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
          timestamp: new Date().toISOString()
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

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0a0e1a' }}>
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 z-50"
        style={{
          background: 'linear-gradient(90deg, #0d1224, #111833)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.12)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
          >
            <FileText className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-base font-bold" style={{ color: '#c7d2fe' }}>DocTalk</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Documents Link */}
          <button
            onClick={() => navigate('/documents')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)' }}
          >
            <FolderOpen className="h-4 w-4" />
            <span>{documents.length} docs</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.15)' }}
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
        <main className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ background: '#080c16' }}>
          {/* Chat Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2" style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.08)' }}>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
              <Bot className="h-4 w-4" style={{ color: '#22d3ee' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate" style={{ color: '#e2e8f0' }}>
                {conversationTitle || 'AI Assistant'}
              </h2>
              <p className="text-[10px]" style={{ color: '#475569' }}>
                {currentConversationId ? `${messages.length} messages` : 'Start a new conversation'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {currentConversationId && (
                <button
                  onClick={handleNewConversation}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors"
                  style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              )}
              {documents.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.12)' }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34d399' }} />
                  <span className="text-[10px] font-medium" style={{ color: '#34d399' }}>Ready</span>
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
                    style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.12)' }}
                  >
                    <Sparkles className="h-7 w-7" style={{ color: '#818cf8' }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#e2e8f0' }}>Start a Conversation</h3>
                  <p className="text-sm mb-5" style={{ color: '#64748b' }}>
                    {documents.length === 0 
                      ? "Upload documents first to start asking questions"
                      : "Ask questions about your documents and get AI-powered answers"}
                  </p>
                  {documents.length === 0 ? (
                    <button
                      onClick={() => navigate('/documents')}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
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
                            style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)' }}
                          >
                            <span style={{ color: '#6366f1', marginRight: '6px' }}>→</span>{hint}
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
                        style={{ background: message.role === "user" ? 'rgba(99,102,241,0.12)' : 'rgba(6,182,212,0.1)' }}
                      >
                        {message.role === "user"
                          ? <User className="h-3.5 w-3.5" style={{ color: '#818cf8' }} />
                          : <Bot className="h-3.5 w-3.5" style={{ color: '#22d3ee' }} />
                        }
                      </div>

                      <div className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"} min-w-0`}>
                        <div
                          className="rounded-2xl px-4 py-3 overflow-hidden"
                          style={
                            message.role === "user"
                              ? { background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: '#e0e7ff', borderTopRightRadius: '6px' }
                              : { background: '#111833', border: '1px solid rgba(99,102,241,0.08)', color: '#cbd5e1', borderTopLeftRadius: '6px' }
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

                        {/* Sources */}
                        {message.sources && message.sources.length > 0 && (
                          <button 
                            onClick={() => openSourceViewer(message.sources)} 
                            className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-colors hover:bg-gray-800/50"
                            style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.1)' }}
                          >
                            <FileText className="h-3 w-3" style={{ color: '#6366f1' }} />
                            <span>
                              {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
                            </span>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        )}

                        <span className="text-[10px] mt-1 px-1" style={{ color: '#334155' }}>
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
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)' }}>
                        <Bot className="h-3.5 w-3.5" style={{ color: '#22d3ee' }} />
                      </div>
                      <div className="rounded-2xl rounded-tl-md px-4 py-3" style={{ background: '#111833', border: '1px solid rgba(99,102,241,0.08)' }}>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#6366f1', animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                            ))}
                          </div>
                          <span className="text-[11px]" style={{ color: '#64748b' }}>Analyzing...</span>
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
          <div className="flex-shrink-0 px-4 py-3 relative z-10" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
            {error && (
              <div className="max-w-3xl mx-auto mb-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.12)', color: '#fca5a5' }}>
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError("")}><X className="h-3 w-3" /></button>
              </div>
            )}
            
            <form onSubmit={handleQuerySubmit} className="max-w-3xl mx-auto">
              <div className="flex gap-2 mb-2 relative z-10">
                <FilterPanel 
                  documents={documents} 
                  onFiltersChange={handleFiltersChange}
                  activeFilters={activeFilters}
                />
                {activeFilters && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <FilterIcon className="h-3.5 w-3.5" />
                    <span>Filters active</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <div className="flex-1 relative min-w-0">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={documents.length === 0 ? "Upload documents first..." : "Ask about your documents..."}
                    disabled={loading || documents.length === 0}
                    className="w-full px-4 py-2.5 pr-8 rounded-xl text-sm disabled:opacity-30 transition-all focus:outline-none"
                    style={{ background: '#0d1224', border: '1px solid rgba(99,102,241,0.1)', color: '#e2e8f0' }}
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
                  className="px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold text-white transition-all disabled:opacity-25"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
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
