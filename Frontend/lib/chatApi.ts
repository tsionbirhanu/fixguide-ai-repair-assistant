// chatApi.ts - Chat and conversation API helpers

import { authService } from "./auth";
import { API_CONFIG, STORAGE_KEYS } from "./config";

export interface Conversation {
  thread_id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

function authHeaders() {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function getLocalConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalConversations(conversations: Conversation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations.slice(0, 50)));
}

function localMessagesKey(threadId: string) {
  return `${STORAGE_KEYS.CONVERSATION_MESSAGES}:${threadId}`;
}

function getLocalMessages(threadId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(localMessagesKey(threadId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMessagesToLocal(threadId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(localMessagesKey(threadId), JSON.stringify(messages.slice(-100)));
}

export function saveConversationToLocal(threadId: string, title: string) {
  const list = getLocalConversations();
  const filtered = list.filter((conversation) => conversation.thread_id !== threadId);
  filtered.unshift({
    thread_id: threadId,
    title: (title || "New chat").slice(0, 50),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  setLocalConversations(filtered);
}

export async function fetchConversations(): Promise<Conversation[]> {
  const headers = authHeaders();
  const local = getLocalConversations();
  if (!headers) return local;

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT_CONVERSATIONS}`, {
      headers,
    });
    if (!response.ok) return local;

    const data = await response.json();
    const conversations = (data.conversations || []) as Conversation[];
    if (conversations.length === 0 && local.length > 0) return local;

    setLocalConversations(conversations);
    return conversations;
  } catch {
    return local;
  }
}

export async function fetchConversationMessages(threadId: string): Promise<ChatMessage[]> {
  const headers = authHeaders();
  const local = getLocalMessages(threadId);
  if (!headers) return local;

  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT_MESSAGES(threadId)}`,
      { headers },
    );
    if (!response.ok) return local;

    const data = await response.json();
    const messages = (data.messages || []) as ChatMessage[];
    if (messages.length === 0 && local.length > 0) return local;

    saveMessagesToLocal(threadId, messages);
    return messages;
  } catch {
    return local;
  }
}

export async function renameConversation(threadId: string, title: string): Promise<Conversation> {
  const cleanTitle = title.trim().slice(0, 50);
  if (!cleanTitle) throw new Error("Conversation title is required");

  const headers = authHeaders();
  if (!headers) {
    saveConversationToLocal(threadId, cleanTitle);
    return { thread_id: threadId, title: cleanTitle };
  }

  const response = await fetch(
    `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT_CONVERSATION(threadId)}`,
    {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: cleanTitle }),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to rename conversation");
  }

  const data = await response.json();
  const conversation = (data.conversation || { thread_id: threadId, title: cleanTitle }) as Conversation;
  const list = getLocalConversations();
  setLocalConversations(
    list.map((item) => (item.thread_id === threadId ? { ...item, title: conversation.title } : item)),
  );
  return conversation;
}

export async function deleteConversation(threadId: string): Promise<void> {
  const headers = authHeaders();
  if (headers) {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT_CONVERSATION(threadId)}`,
      {
        method: "DELETE",
        headers,
      },
    );

    if (!response.ok) {
      throw new Error("Failed to delete conversation");
    }
  }

  const list = getLocalConversations().filter((conversation) => conversation.thread_id !== threadId);
  setLocalConversations(list);
  if (typeof window !== "undefined") {
    localStorage.removeItem(localMessagesKey(threadId));
  }
}
