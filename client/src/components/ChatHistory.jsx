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

  const accentSurfaceStyle = {
    background: "color-mix(in srgb, var(--accent-primary) 14%, transparent)",
    border: "1px solid color-mix(in srgb, var(--accent-primary) 28%, transparent)",
    color: "var(--accent-primary)",
  };

  const gradientButtonStyle = {
    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-hover))",
  };

  if (isCollapsed) {
    return (
      <div
        className="flex-shrink-0 w-12 flex flex-col items-center py-3 gap-3"
        style={{ background: "var(--bg-secondary)", borderRight: "1px solid var(--border-light)" }}
      >
        <button
          onClick={onToggleCollapse}
          className="rounded-lg p-2 text-[var(--accent-primary)] transition-colors hover:bg-[var(--bg-hover)]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={onNewConversation}
          className="rounded-lg p-2 text-[var(--accent-primary)] transition-colors hover:bg-[var(--bg-hover)]"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="flex-1" />
        <div className="text-[10px] font-medium text-[var(--text-tertiary)]" style={{ writingMode: "vertical-rl" }}>
          {totalCount} chats
        </div>
      </div>
    );
  }

  return (
    <aside
      className="flex-shrink-0 w-64 flex flex-col"
      style={{ background: "var(--bg-secondary)", borderRight: "1px solid var(--border-light)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-light)] px-3 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Chat History
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 py-2">
        <button
          onClick={onNewConversation}
          className="w-full py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-white transition-all"
          style={gradientButtonStyle}
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search chats..."
            className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--bg-tertiary)] py-1.5 pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
            <p className="text-xs text-[var(--text-tertiary)]">
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
                  currentConversationId === conv.conversation_id ? "" : "hover:bg-[var(--bg-hover)]"
                }`}
                style={{
                  background:
                    currentConversationId === conv.conversation_id
                      ? "color-mix(in srgb, var(--accent-primary) 14%, transparent)"
                      : "transparent",
                  border:
                    currentConversationId === conv.conversation_id
                      ? "1px solid color-mix(in srgb, var(--accent-primary) 28%, transparent)"
                      : "1px solid transparent",
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
                      className="flex-1 rounded border border-[var(--border-light)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                    <button onClick={() => handleRename(conv.conversation_id)} className="text-[var(--success)]">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-[var(--error)]">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <h4 className="flex-1 truncate pr-2 text-xs font-medium text-[var(--text-primary)]">
                        {conv.title || "Untitled"}
                      </h4>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => startEdit(conv, e)}
                          className="rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(conv.conversation_id, e)}
                          className="rounded p-1 text-[var(--error)] hover:bg-[var(--bg-hover)]"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-[var(--text-tertiary)]">
                      {conv.last_message || "No messages"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Clock className="h-2.5 w-2.5 text-[var(--text-tertiary)]" />
                      <span className="text-[9px] text-[var(--text-tertiary)]">
                        {formatDate(conv.last_updated)}
                      </span>
                      <span className="ml-auto text-[9px] text-[var(--text-tertiary)]">
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
        <div className="flex items-center justify-center gap-2 border-t border-[var(--border-light)] px-3 py-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {page + 1} / {Math.ceil(totalCount / limit)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * limit >= totalCount}
            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
