"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { MessageBubble } from "@/components/MessageBubble";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { authService } from "@/lib/auth";
import {
  fetchConversations,
  fetchConversationMessages,
  saveConversationToLocal,
  deleteConversation,
  renameConversation,
  type Conversation,
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
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [conversationError, setConversationError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

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
          authService.logout();
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
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: assistantMessage },
                  ]);
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
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: `Sorry, I encountered an error: ${data.content || "Please try again."}` },
                  ]);
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
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please try again or start a new conversation.",
        },
      ]);
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

  const user = authService.getUser();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } flex-shrink-0 border-r border-border bg-card overflow-x-hidden overflow-y-auto transition-all duration-200 flex flex-col`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-[rgb(229,231,235)] dark:hover:bg-[rgb(55,65,81)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
          <Button
            variant="primary"
            className="w-full mt-4"
            onClick={handleNewConversation}
          >
            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <h3 className="px-4 py-2 text-xs font-semibold text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)] uppercase">
            History
          </h3>
          {historyLoading ? (
            <p className="px-4 py-2 text-sm text-[rgb(156,163,175)]">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="px-4 py-2 text-sm text-[rgb(156,163,175)]">No conversations yet</p>
          ) : (
            <ul className="space-y-0.5 pb-4">
              {conversations.map((conv) => (
                <li key={conv.thread_id} className="group/item relative mx-2">
                  {renamingId === conv.thread_id ? (
                    <div className="flex gap-1 py-1">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            confirmRename();
                          }
                        }}
                        className="flex-1 px-2 py-1.5 text-sm rounded border border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)] bg-white dark:bg-[rgb(15,15,15)] text-[rgb(15,15,15)] dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={confirmRename}
                        className="p-1.5 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setRenamingId(null); setRenameValue(""); }}
                        className="p-1.5 rounded text-[rgb(107,114,128)] hover:bg-[rgb(229,231,235)] dark:hover:bg-[rgb(55,65,81)]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSelectConversation(conv)}
                        className={`w-full text-left px-4 py-2.5 pr-16 text-sm rounded-lg transition-colors ${
                          threadId === conv.thread_id
                            ? "bg-[rgb(255,138,101)]/20 text-[rgb(255,138,101)]"
                            : "hover:bg-[rgb(229,231,235)] dark:hover:bg-[rgb(55,65,81)] text-[rgb(15,15,15)] dark:text-white"
                        }`}
                      >
                        {conv.title || "New chat"}
                      </button>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleRenameConversation(e, conv)}
                          className="p-1.5 rounded hover:bg-[rgb(229,231,235)] dark:hover:bg-[rgb(55,65,81)] text-[rgb(107,114,128)]"
                          title="Rename"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(e, conv.thread_id)}
                          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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
        <div className="p-4 border-t border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)] flex-shrink-0">
          <button
            className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-[rgb(229,231,235)] dark:hover:bg-[rgb(55,65,81)] transition-colors"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[rgb(229,231,235)] dark:bg-[rgb(55,65,81)] flex items-center justify-center flex-shrink-0">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-[rgb(255,138,101)]">
                  {user?.email?.[0]?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-[rgb(15,15,15)] dark:text-white truncate">
                {user?.email || "User"}
              </p>
              <p className="text-xs text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)]">
                {profileOpen ? "Hide profile" : "Profile"}
              </p>
            </div>
            <svg
              className={`w-4 h-4 transition-transform ${profileOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {profileOpen && (
            <div className="mt-3 p-3 rounded-xl bg-[rgb(249,250,251)] dark:bg-[rgb(31,41,55)] border border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)]">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[rgb(229,231,235)] dark:bg-[rgb(55,65,81)] flex items-center justify-center flex-shrink-0">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-[rgb(255,138,101)]">
                      {user?.email?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Photo
                  </Button>
                  {avatar && (
                    <Button variant="ghost" size="sm" onClick={removeAvatar} className="ml-1">
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)] mb-3 truncate">
                {user?.email}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setProfileOpen(false); router.push("/stats"); }}>
                  Statistics
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-10 p-2 rounded-lg bg-white dark:bg-[rgb(31,41,55)] border border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)] shadow"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex-shrink-0 border-b border-border bg-background px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              FixGuide AI
            </h1>
            <p className="text-xs text-muted-foreground">
              Ask about device repairs and troubleshooting
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          >
            {theme === "dark" ? (
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {messages.length === 0 && !currentResponse && (
              <div className="text-center py-12">
                <div className="flex justify-center mb-6">
                  <Logo size="lg" />
                </div>
                <h2 className="text-2xl font-bold text-[rgb(15,15,15)] dark:text-white mb-4">
                  How can I help you today?
                </h2>
                <p className="text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)] mb-8">
                  Ask me anything about device repairs and troubleshooting
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {SAMPLE_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="p-4 text-left rounded-xl border border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)] hover:border-[rgb(255,138,101)] dark:hover:border-[rgb(255,138,101)] bg-white dark:bg-[rgb(31,41,55)] hover:shadow-md transition-all"
                    >
                      <p className="text-sm text-[rgb(15,15,15)] dark:text-white">{q}</p>
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
                <div className="rounded-2xl px-5 py-3 bg-card border border-border">
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
        <div className="flex-shrink-0 border-t border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)] bg-white dark:bg-[rgb(24,24,24)] px-4 py-4">
          <div className="max-w-3xl mx-auto">
            {attachedImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachedImages.map((src, i) => (
                  <div key={i} className="relative group/preview">
                    <img
                      src={src}
                      alt={`Attach ${i + 1}`}
                      className="w-14 h-14 rounded-lg object-cover border border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)]"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachedImage(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {voiceError && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">{voiceError}</p>
            )}
            <form onSubmit={handleSubmit} className="relative flex gap-2">
              <input
                ref={chatFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAttachImage}
              />
              <button
                type="button"
                onClick={() => chatFileInputRef.current?.click()}
                disabled={isLoading || attachedImages.length >= 4}
                className="flex-shrink-0 p-3 rounded-xl border border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)] hover:border-[rgb(255,138,101)] text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)] disabled:opacity-50"
                title="Attach image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading}
                className={`flex-shrink-0 p-3 rounded-xl border transition-all ${
                  isListening
                    ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-600"
                    : "border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)] hover:border-[rgb(255,138,101)] text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)]"
                }`}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                <svg
                  className="w-5 h-5"
                  fill={isListening ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v7m0-9a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z"
                  />
                </svg>
              </button>
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask AI about device repairs..."
                  disabled={isLoading}
                  rows={1}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)] bg-white dark:bg-[rgb(15,15,15)] text-[rgb(15,15,15)] dark:text-white placeholder-[rgb(156,163,175)] focus:outline-none focus:ring-2 focus:ring-[rgb(255,138,101)] resize-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={(!inputValue.trim() && attachedImages.length === 0) || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[rgb(255,138,101)] text-white hover:bg-[rgb(255,120,85)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </form>
            <p className="text-xs text-[rgb(156,163,175)] text-center mt-2">
              Press Enter to send • Shift+Enter for new line • Attach image or use voice
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
