// components/MessageBubble.tsx - Chat message bubble component
/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];
  isStreaming?: boolean;
  onEdit?: (text: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  images = [],
  isStreaming = false,
  onEdit,
}) => {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 group items-start gap-2`}>
      {!isUser && !isStreaming && (
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-[rgb(229,231,235)] dark:hover:bg-[rgb(55,65,81)] text-[rgb(107,114,128)]"
            title={copied ? "Copied!" : "Copy"}
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      )}
      <div
        className={`
          max-w-[80%] rounded-2xl px-5 py-3
          ${isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground border border-border"
          }
          shadow-sm
        `}
      >
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Upload ${i + 1}`}
                className="max-w-[120px] max-h-[120px] rounded-lg object-cover"
              />
            ))}
          </div>
        )}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {content}
          {isStreaming && (
            <span className="inline-flex gap-1 ml-1 align-middle">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
            </span>
          )}
        </div>
      </div>
      {isUser && !isStreaming && (
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-[rgb(229,231,235)] dark:hover:bg-[rgb(55,65,81)] text-[rgb(107,114,128)]"
            title={copied ? "Copied!" : "Copy"}
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(content)}
              className="p-2 rounded-lg hover:bg-[rgb(229,231,235)] dark:hover:bg-[rgb(55,65,81)] text-[rgb(107,114,128)]"
              title="Edit and resend"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
