"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Blocks,
  Camera,
  Check,
  ChevronRight,
  ImagePlus,
  Library,
  LogOut,
  Mic,
  MicOff,
  Moon,
  PanelLeftClose,
  Paperclip,
  Pencil,
  SendHorizontal,
  Search,
  Share2,
  Sun,
  Trash2,
  X,
  MessageCircle,
  MoreHorizontal,
  SquarePen,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { MessageBubble } from "@/components/MessageBubble";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { authService } from "@/lib/auth";
import {
  fetchConversations,
  fetchConversationMessages,
  saveConversationToLocal,
  saveMessagesToLocal,
  deleteConversation,
  renameConversation,
  type Conversation,
  type ChatMessage,
} from "@/lib/chatApi";
import { API_CONFIG, SAMPLE_QUESTIONS, STORAGE_KEYS } from "@/lib/config";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTheme } from "@/contexts/ThemeContext";
import { Message, SSEEvent } from "@/lib/types";

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [conversationError, setConversationError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { theme, toggleTheme } = useTheme();
  const { isListening, error: voiceError, startListening, stopListening } =
    useVoiceInput((text) => {
      setInputValue((prev) => (prev ? `${prev} ${text}` : text));
    });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }
    setAvatar(typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.AVATAR) : null);
    loadConversations();
  }, [router]);

  const loadConversations = async () => {
    setHistoryLoading(true);
    setConversationError("");
    try {
      const convos = await fetchConversations();
      setConversations(convos);
    } catch (e) {
      console.error("Failed to load conversations", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentResponse]);

  useEffect(() => {
    if (sidebarOpen && searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [sidebarOpen, searchOpen]);

  const handleLogout = async () => {
    await authService.logout();
    router.push("/login");
  };

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentResponse("");
    setThreadId(null);
    setInputValue("");
    setStatus("");
    setAttachedImages([]);
    setProfileOpen(false);
  };

  const handleOpenSearch = () => {
    setSidebarOpen(true);
    setSearchOpen(true);
  };

  const handleAttachImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const toAdd = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 4 - attachedImages.length);
    const dataUrls = await Promise.all(
      toAdd.map(
        (f) =>
          new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.readAsDataURL(f);
          })
      )
    );
    setAttachedImages((prev) => [...prev, ...dataUrls].slice(0, 4));
    e.target.value = "";
  };

  const removeAttachedImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConversationError("");
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.thread_id !== id));
      if (id === threadId) {
        handleNewConversation();
      }
    } catch (error) {
      console.error("Failed to delete conversation", error);
      setConversationError("Could not delete conversation. Please try again.");
    }
  };

  const handleRenameConversation = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setRenamingId(conv.thread_id);
    setRenameValue(conv.title || "");
  };

  const confirmRename = async () => {
    if (renamingId && renameValue.trim()) {
      setConversationError("");
      try {
        const updated = await renameConversation(renamingId, renameValue.trim());
        setConversations((prev) =>
          prev.map((c) => (c.thread_id === renamingId ? { ...c, title: updated.title } : c))
        );
      } catch (error) {
        console.error("Failed to rename conversation", error);
        setConversationError("Could not rename conversation. Please try again.");
      }
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const handleEditMessage = (text: string) => {
    setInputValue(text);
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setHistoryLoading(true);
    setProfileOpen(false);
    try {
      const msgs = await fetchConversationMessages(conv.thread_id);
      setMessages(
        msgs.map((m) => ({
          role: (m.role === "user" || m.role === "assistant" ? m.role : "assistant") as "user" | "assistant",
          content: m.content || "",
          images: m.images,
        }))
      );
      setThreadId(conv.thread_id);
      setCurrentResponse("");
      setStatus("");
    } catch (e) {
      console.error("Failed to load conversation", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      setAvatar(data);
      localStorage.setItem(STORAGE_KEYS.AVATAR, data);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatar(null);
    localStorage.removeItem(STORAGE_KEYS.AVATAR);
  };

  const sendMessage = async (messageText: string) => {
    if ((!messageText.trim() && attachedImages.length === 0) || isLoading) return;

    const text = messageText.trim() || "What can you tell me about this image?";
    const imgs = [...attachedImages];
    const userMessage: Message = { role: "user", content: text, images: imgs.length ? imgs : undefined };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setAttachedImages([]);
    setIsLoading(true);
    setCurrentResponse("");
    setStatus("");

    try {
      const token = authService.getToken();
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT_STREAM}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: text,
            thread_id: threadId,
            images: imgs.length ? imgs : undefined,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          if (token?.startsWith("demo_")) {
            throw new Error("Your local demo session was interrupted. Please try sending again.");
          }
          await authService.logout();
          router.push("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data: SSEEvent = JSON.parse(line.slice(6));
              switch (data.type) {
                case "status":
                  setStatus(data.content || "");
                  break;
                case "token":
                  assistantMessage += data.content || "";
                  setCurrentResponse(assistantMessage);
                  break;
                case "done": {
                  const tid = data.thread_id || null;
                  setThreadId(tid);
                  setMessages((prev) => {
                    const next = [
                      ...prev,
                      { role: "assistant", content: assistantMessage },
                    ] as ChatMessage[];
                    if (tid) saveMessagesToLocal(tid, next);
                    return next;
                  });
                  setCurrentResponse("");
                  setStatus("");
                  setIsLoading(false);
                  if (tid) saveConversationToLocal(tid, text);
                  loadConversations();
                  break;
                }
                case "error": {
                  const errTid = data.thread_id || threadId;
                  if (errTid) saveConversationToLocal(errTid, text);
                  setThreadId(errTid);
                  setMessages((prev) => {
                    const next = [
                      ...prev,
                      { role: "assistant", content: `Sorry, I encountered an error: ${data.content || "Please try again."}` },
                    ] as ChatMessage[];
                    if (errTid) saveMessagesToLocal(errTid, next);
                    return next;
                  });
                  setCurrentResponse("");
                  setStatus("");
                  setIsLoading(false);
                  loadConversations();
                  break;
                }
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const message = error instanceof Error && error.message
        ? error.message
        : "Sorry, I encountered an error. Please try again or start a new conversation.";
      setMessages((prev) => {
        const next = [
          ...prev,
          {
            role: "assistant",
            content: message,
          },
        ] as ChatMessage[];
        if (threadId) saveMessagesToLocal(threadId, next);
        return next;
      });
      setCurrentResponse("");
      setStatus("");
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareTitle = "FixGuide AI";

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Sharing is optional; ignore cancelled share dialogs and clipboard failures.
    }
  };

  const user = authService.getUser();
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredConversations = normalizedSearch
    ? conversations.filter((conv) =>
        (conv.title || "New chat").toLowerCase().includes(normalizedSearch)
      )
    : conversations;

  return (
    <div className="flex h-screen bg-[rgb(var(--chat-bg))] text-[rgb(var(--chat-text))]">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-[304px]" : "w-[76px]"
        } flex-shrink-0 border-r border-[rgb(var(--chat-border))] bg-[rgb(var(--chat-sidebar-bg))] overflow-x-hidden overflow-y-auto transition-all duration-200 flex flex-col`}
      >
        {!sidebarOpen ? (
          <div className="flex h-full flex-col items-center py-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl transition-transform hover:scale-105"
              title="Open sidebar"
              aria-label="Open sidebar"
            >
              <Logo size="sm" showText={false} />
            </button>

            <div className="mt-8 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={handleNewConversation}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[rgb(var(--chat-text))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
                title="New chat"
                aria-label="New chat"
              >
                <SquarePen className="h-5 w-5" strokeWidth={2.1} />
              </button>
              <button
                type="button"
                onClick={handleOpenSearch}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[rgb(var(--chat-text))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
                title="Search chats"
                aria-label="Search chats"
              >
                <Search className="h-5 w-5" strokeWidth={2.1} />
              </button>
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[rgb(var(--chat-text))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
                title="Library"
                aria-label="Open library"
              >
                <Library className="h-5 w-5" strokeWidth={2.1} />
              </button>
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[rgb(var(--chat-text))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
                title="Chats"
                aria-label="Open chats"
              >
                <MessageCircle className="h-5 w-5" strokeWidth={2.1} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="mt-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[rgb(var(--chat-elevated))] text-sm font-semibold text-[rgb(255,138,101)] transition-colors hover:bg-[rgb(var(--chat-hover))]"
              title={user?.email || "Profile"}
              aria-label="Open profile"
            >
              {avatar ? (
                <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                user?.email?.[0]?.toUpperCase() || "?"
              )}
            </button>
          </div>
        ) : (
          <>
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <Logo size="sm" showText={false} />
          <button
            onClick={() => setSidebarOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[rgb(var(--chat-muted))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <nav className="space-y-1 pb-6">
            <button
              type="button"
              onClick={handleNewConversation}
              className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[rgb(var(--chat-text))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
            >
              <SquarePen className="h-5 w-5 flex-shrink-0" strokeWidth={2.1} />
              <span className="text-sm font-medium">New chat</span>
            </button>
            <button
              type="button"
              onClick={handleOpenSearch}
              className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[rgb(var(--chat-text))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
            >
              <Search className="h-5 w-5 flex-shrink-0" strokeWidth={2.1} />
              <span className="text-sm font-medium">Search chats</span>
            </button>
            <button
              type="button"
              className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[rgb(var(--chat-text))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
            >
              <Library className="h-5 w-5 flex-shrink-0" strokeWidth={2.1} />
              <span className="text-sm font-medium">Library</span>
            </button>
            <button
              type="button"
              className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[rgb(var(--chat-text))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
            >
              <Blocks className="h-5 w-5 flex-shrink-0" strokeWidth={2.1} />
              <span className="text-sm font-medium">Apps</span>
            </button>
            <button
              type="button"
              className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[rgb(var(--chat-text))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
            >
              <MoreHorizontal className="h-5 w-5 flex-shrink-0" strokeWidth={2.1} />
              <span className="text-sm font-medium">More</span>
            </button>
          </nav>

          <button
            type="button"
            className="mb-7 flex h-10 w-full items-center gap-1 rounded-xl px-3 text-left text-[rgb(var(--chat-text))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
          >
            <span className="text-sm font-semibold">Projects</span>
            <ChevronRight className="h-4 w-4" strokeWidth={2.1} />
          </button>

          <h3 className="px-3 pb-2 text-sm font-semibold text-[rgb(var(--chat-text))]">
            Chats
          </h3>
          {searchOpen && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-[rgb(var(--chat-border))] bg-[rgb(var(--chat-surface))] px-3 py-2">
              <Search className="h-4 w-4 flex-shrink-0 text-[rgb(var(--chat-muted))]" strokeWidth={2} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats"
                className="min-w-0 flex-1 bg-transparent text-sm text-[rgb(var(--chat-text))] outline-none placeholder:text-[rgb(var(--chat-muted))]"
              />
              {(searchQuery || searchOpen) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchOpen(false);
                  }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[rgb(var(--chat-muted))] hover:bg-[rgb(var(--chat-hover))]"
                  title="Close search"
                  aria-label="Close search"
                >
                  <X className="h-4 w-4" strokeWidth={2.1} />
                </button>
              )}
            </div>
          )}
          {historyLoading ? (
            <p className="px-3 py-2 text-sm text-[rgb(var(--chat-muted))]">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[rgb(var(--chat-muted))]">No conversations yet</p>
          ) : filteredConversations.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[rgb(var(--chat-muted))]">No matching chats</p>
          ) : (
            <ul className="space-y-1 pb-4">
              {filteredConversations.map((conv) => (
                <li key={conv.thread_id} className="group/item relative">
                  {renamingId === conv.thread_id ? (
                    <div className="flex gap-1 rounded-xl border border-[rgb(var(--chat-border))] bg-[rgb(var(--chat-surface))] p-1.5">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            confirmRename();
                          }
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-[rgb(var(--chat-border))] bg-[rgb(var(--chat-bg))] px-2 py-1.5 text-sm text-[rgb(var(--chat-text))] outline-none focus:ring-2 focus:ring-[rgb(255,138,101)]"
                        autoFocus
                      />
                      <button
                        onClick={confirmRename}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                        title="Save"
                        aria-label="Save conversation name"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.2} />
                      </button>
                      <button
                        onClick={() => { setRenamingId(null); setRenameValue(""); }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--chat-muted))] hover:bg-[rgb(var(--chat-hover))]"
                        title="Cancel"
                        aria-label="Cancel rename"
                      >
                        <X className="h-4 w-4" strokeWidth={2.2} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSelectConversation(conv)}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 pr-16 text-left text-sm transition-colors ${
                          threadId === conv.thread_id
                            ? "bg-[rgb(var(--chat-elevated))] text-[rgb(var(--chat-text))]"
                            : "text-[rgb(var(--chat-text))] hover:bg-[rgb(var(--chat-hover))]"
                        }`}
                      >
                        <span className="truncate">{conv.title || "New chat"}</span>
                      </button>
                      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100">
                        <button
                          onClick={(e) => handleRenameConversation(e, conv)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[rgb(var(--chat-muted))] hover:bg-[rgb(var(--chat-elevated))]"
                          title="Rename"
                          aria-label="Rename conversation"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={2.1} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(e, conv.thread_id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                          title="Delete"
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.1} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {conversationError && (
            <p className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
              {conversationError}
            </p>
          )}
        </div>

        {/* Profile section in sidebar - inline expandable */}
        <div className="flex-shrink-0 border-t border-[rgb(var(--chat-border))] p-3">
          <button
            className="flex w-full items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[rgb(var(--chat-hover))]"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[rgb(var(--chat-elevated))] flex items-center justify-center flex-shrink-0">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-[rgb(255,138,101)]">
                  {user?.email?.[0]?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-[rgb(var(--chat-text))] truncate">
                {user?.email || "User"}
              </p>
              <p className="text-xs text-[rgb(var(--chat-muted))]">
                Personal account
              </p>
            </div>
            <span className="rounded-full border border-[rgb(var(--chat-border))] bg-[rgb(var(--chat-elevated))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--chat-text))]">
              Account
            </span>
          </button>
          {profileOpen && (
            <div className="mt-2 rounded-xl border border-[rgb(var(--chat-border))] bg-[rgb(var(--chat-surface))] p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <div className="mb-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[rgb(var(--chat-elevated))] flex items-center justify-center flex-shrink-0">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-[rgb(255,138,101)]">
                      {user?.email?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[rgb(var(--chat-border))] px-3 text-sm font-medium text-[rgb(var(--chat-text))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
                  >
                    <Camera className="h-4 w-4" strokeWidth={2} />
                    Photo
                  </button>
                  {avatar && (
                    <Button variant="ghost" size="sm" onClick={removeAvatar} className="ml-1">
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-[rgb(var(--chat-muted))] mb-3 truncate">
                {user?.email}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setProfileOpen(false); router.push("/stats"); }} className="gap-2">
                  <BarChart3 className="h-4 w-4" strokeWidth={2} />
                  Statistics
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" strokeWidth={2} />
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[rgb(var(--chat-bg))]">
        <header className="flex-shrink-0 border-b border-[rgb(var(--chat-border))] bg-[rgb(var(--chat-bg))] px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[rgb(var(--chat-text))]">
              FixGuide AI
            </h1>
            <p className="text-xs text-[rgb(var(--chat-muted))]">
              Ask about device repairs and troubleshooting
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleShare}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[rgb(var(--chat-text))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
              title="Share"
              aria-label="Share chat"
            >
              <Share2 className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[rgb(var(--chat-text))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
              aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" strokeWidth={2} />
              ) : (
                <Moon className="h-5 w-5" strokeWidth={2} />
              )}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-[rgb(var(--chat-bg))]">
          <div className="max-w-5xl mx-auto px-4 py-8 lg:px-8">
            {messages.length === 0 && !currentResponse && (
              <div className="text-center py-12">
                <div className="flex justify-center mb-6">
                  <Logo size="lg" />
                </div>
                <h2 className="text-2xl font-bold text-[rgb(var(--chat-text))] mb-4">
                  How can I help you today?
                </h2>
                <p className="text-[rgb(var(--chat-muted))] mb-8">
                  Ask me anything about device repairs and troubleshooting
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto">
                  {SAMPLE_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="p-4 text-left rounded-xl border border-[rgb(var(--chat-border))] hover:border-[rgb(255,138,101)] bg-[rgb(var(--chat-surface))] hover:bg-[rgb(var(--chat-hover))] transition-all"
                    >
                      <p className="text-sm text-[rgb(var(--chat-text))]">{q}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <MessageBubble
                key={i}
                role={m.role}
                content={m.content}
                images={m.images}
                onEdit={m.role === "user" ? handleEditMessage : undefined}
              />
            ))}
            {isLoading && !currentResponse && (
              <div className="flex justify-start mb-4">
                <div className="rounded-2xl px-5 py-3 bg-[rgb(var(--chat-surface))] border border-[rgb(var(--chat-border))]">
                  <span className="inline-flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                  </span>
                </div>
              </div>
            )}
            {currentResponse && (
              <MessageBubble role="assistant" content={currentResponse} isStreaming />
            )}
            {status && (
              <div className="flex justify-start mb-4">
                <StatusBadge status={status} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area with voice and attach */}
        <div className="flex-shrink-0 border-t border-[rgb(var(--chat-border))] bg-[rgb(var(--chat-bg))] px-4 py-4">
          <div className="max-w-5xl mx-auto lg:px-8">
            {attachedImages.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachedImages.map((src, i) => (
                  <div key={i} className="relative group/preview">
                    <img
                      src={src}
                      alt={`Attach ${i + 1}`}
                      className="h-16 w-16 rounded-xl border border-[rgb(var(--chat-border))] object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachedImage(i)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover/preview:opacity-100"
                      title="Remove image"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {voiceError && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">{voiceError}</p>
            )}
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-[rgb(var(--chat-border))] bg-[rgb(var(--chat-surface-soft))] px-3 py-2 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-[rgb(255,138,101)]"
            >
              <input
                ref={chatFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAttachImage}
              />
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI about device repairs..."
                disabled={isLoading}
                rows={1}
                className="min-h-[48px] w-full resize-none bg-transparent px-2 py-3 text-sm leading-6 text-[rgb(var(--chat-text))] outline-none placeholder-[rgb(var(--chat-muted))] disabled:opacity-50"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isLoading || attachedImages.length >= 4}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[rgb(var(--chat-muted))] transition-colors hover:bg-[rgb(var(--chat-elevated))] disabled:opacity-50"
                    title="Attach file"
                    aria-label="Attach file"
                  >
                    <Paperclip className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isLoading || attachedImages.length >= 4}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[rgb(var(--chat-muted))] transition-colors hover:bg-[rgb(var(--chat-elevated))] disabled:opacity-50"
                    title="Add image"
                    aria-label="Add image"
                  >
                    <ImagePlus className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                      isListening
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30"
                        : "text-[rgb(var(--chat-muted))] hover:bg-[rgb(var(--chat-elevated))]"
                    }`}
                    title={isListening ? "Stop listening" : "Voice input"}
                    aria-label={isListening ? "Stop listening" : "Voice input"}
                  >
                    {isListening ? (
                      <MicOff className="h-5 w-5" strokeWidth={2} />
                    ) : (
                      <Mic className="h-5 w-5" strokeWidth={2} />
                    )}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={(!inputValue.trim() && attachedImages.length === 0) || isLoading}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(255,138,101)] text-white transition-colors hover:bg-[rgb(255,120,85)] disabled:cursor-not-allowed disabled:opacity-50"
                  title="Send message"
                  aria-label="Send message"
                >
                  <SendHorizontal className="h-5 w-5" strokeWidth={2.2} />
                </button>
              </div>
            </form>
            <p className="mt-2 text-center text-xs text-[rgb(156,163,175)]">
              Press Enter to send | Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
