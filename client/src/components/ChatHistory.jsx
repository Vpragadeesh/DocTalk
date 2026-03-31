import { useState, useEffect } from "react";
import { chatAPI } from "../api";
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  X,
  Loader2,
} from "lucide-react";

export default function ChatHistory({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isCollapsed,
  onToggleCollapse,
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchConversations();
  }, [page]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await chatAPI.getConversations(limit, page * limit);
      setConversations(response.data.conversations || []);
      setTotalCount(response.data.total_count || 0);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchConversations();
      return;
    }
    setLoading(true);
    try {
      const response = await chatAPI.searchHistory(searchQuery);
      setConversations(response.data.conversations || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (conversationId, e) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await chatAPI.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.conversation_id !== conversationId));
      if (currentConversationId === conversationId) {
        onNewConversation();
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleRename = async (conversationId) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await chatAPI.renameConversation(conversationId, editTitle);
      setConversations((prev) =>
        prev.map((c) => (c.conversation_id === conversationId ? { ...c, title: editTitle } : c))
      );
    } catch (err) {
      console.error("Rename failed:", err);
    }
    setEditingId(null);
  };

  const startEdit = (conversation, e) => {
    e.stopPropagation();
    setEditingId(conversation.conversation_id);
    setEditTitle(conversation.title || "Untitled");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (isCollapsed) {
    return (
      <div
        className="flex-shrink-0 w-12 flex flex-col items-center py-3 gap-3"
        style={{ background: "#0d1224", borderRight: "1px solid rgba(99, 102, 241, 0.1)" }}
      >
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg transition-colors hover:bg-gray-800/50"
          style={{ color: "#818cf8" }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={onNewConversation}
          className="p-2 rounded-lg transition-colors hover:bg-gray-800/50"
          style={{ color: "#818cf8" }}
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="flex-1" />
        <div className="text-[10px] font-medium" style={{ color: "#475569", writingMode: "vertical-rl" }}>
          {totalCount} chats
        </div>
      </div>
    );
  }

  return (
    <aside
      className="flex-shrink-0 w-64 flex flex-col"
      style={{ background: "#0d1224", borderRight: "1px solid rgba(99, 102, 241, 0.1)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3" style={{ borderBottom: "1px solid rgba(99, 102, 241, 0.08)" }}>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" style={{ color: "#818cf8" }} />
          <span className="text-sm font-semibold" style={{ color: "#c7d2fe" }}>
            Chat History
          </span>
        </div>
        <button onClick={onToggleCollapse} className="p-1 rounded hover:bg-gray-800/50" style={{ color: "#64748b" }}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 py-2">
        <button
          onClick={onNewConversation}
          className="w-full py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#475569" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search chats..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none"
            style={{ background: "#111833", border: "1px solid rgba(99, 102, 241, 0.1)", color: "#94a3b8" }}
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#6366f1" }} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2" style={{ color: "#334155" }} />
            <p className="text-xs" style={{ color: "#475569" }}>
              No conversations yet
            </p>
          </div>
        ) : (
          <div className="space-y-1 py-1">
            {conversations.map((conv) => (
              <div
                key={conv.conversation_id}
                onClick={() => onSelectConversation(conv.conversation_id)}
                className={`group relative p-2.5 rounded-lg cursor-pointer transition-all ${
                  currentConversationId === conv.conversation_id ? "" : "hover:bg-gray-800/30"
                }`}
                style={{
                  background: currentConversationId === conv.conversation_id ? "rgba(99, 102, 241, 0.1)" : "transparent",
                  border: `1px solid ${currentConversationId === conv.conversation_id ? "rgba(99, 102, 241, 0.2)" : "transparent"}`,
                }}
              >
                {editingId === conv.conversation_id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(conv.conversation_id)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="flex-1 px-2 py-0.5 rounded text-xs focus:outline-none"
                      style={{ background: "#1e293b", border: "1px solid rgba(99, 102, 241, 0.2)", color: "#e2e8f0" }}
                    />
                    <button onClick={() => handleRename(conv.conversation_id)} style={{ color: "#34d399" }}>
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ color: "#f87171" }}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-medium truncate pr-2 flex-1" style={{ color: "#e2e8f0" }}>
                        {conv.title || "Untitled"}
                      </h4>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => startEdit(conv, e)}
                          className="p-1 rounded hover:bg-gray-700/50"
                          style={{ color: "#64748b" }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(conv.conversation_id, e)}
                          className="p-1 rounded hover:bg-gray-700/50"
                          style={{ color: "#f87171" }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] mt-1 truncate" style={{ color: "#64748b" }}>
                      {conv.last_message || "No messages"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Clock className="h-2.5 w-2.5" style={{ color: "#475569" }} />
                      <span className="text-[9px]" style={{ color: "#475569" }}>
                        {formatDate(conv.last_updated)}
                      </span>
                      <span className="text-[9px] ml-auto" style={{ color: "#475569" }}>
                        {conv.message_count || 0} msgs
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > limit && (
        <div className="flex items-center justify-center gap-2 px-3 py-2" style={{ borderTop: "1px solid rgba(99, 102, 241, 0.08)" }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1 rounded disabled:opacity-30"
            style={{ color: "#64748b" }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[10px]" style={{ color: "#64748b" }}>
            {page + 1} / {Math.ceil(totalCount / limit)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * limit >= totalCount}
            className="p-1 rounded disabled:opacity-30"
            style={{ color: "#64748b" }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
