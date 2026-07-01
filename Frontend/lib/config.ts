// config.ts - API configuration for FixGuide AI

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",

  ENDPOINTS: {
    HEALTH: "/health",
    SIGNUP: "/api/auth/signup",
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    CHAT_STREAM: "/api/chat/stream",
    CHAT_CONVERSATIONS: "/api/chat/conversations",
    CHAT_CONVERSATION: (threadId: string) => `/api/chat/conversations/${threadId}`,
    CHAT_MESSAGES: (threadId: string) => `/api/chat/conversations/${threadId}/messages`,
    STATS: "/api/stats",
  },
};

export const STORAGE_KEYS = {
  AVATAR: "fixguide_avatar",
  CONVERSATIONS: "fixguide_conversations",
  CONVERSATION_MESSAGES: "fixguide_conversation_messages",
};

// Sample questions for new users
export const SAMPLE_QUESTIONS = [
  "How to replace iPhone 13 screen?",
  "Fix PS5 overheating issue",
  "Nintendo Switch won't charge",
  "Xbox controller drift fix",
  "Laptop keyboard not working",
  "MacBook won't turn on",
];
