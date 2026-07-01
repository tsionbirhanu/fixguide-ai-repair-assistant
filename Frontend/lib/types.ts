// types.ts - TypeScript type definitions for FixGuide AI

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface AuthResponse {
  success: boolean;
  user: User | null;
  session: Session | null;
  access_token?: string;
  message: string;
  error?: string;
}

export interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];  // base64 data URLs for display
  created_at?: string;
}

export interface ChatRequest {
  message: string;
  thread_id?: string;
}

export interface UserStats {
  total_messages: number;
  total_tokens: number;
  total_conversations: number;
}

export type SSEEventType = "status" | "token" | "done" | "error";

export interface SSEEvent {
  type: SSEEventType;
  content?: string;
  thread_id?: string;
}

export interface Conversation {
  id: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}
