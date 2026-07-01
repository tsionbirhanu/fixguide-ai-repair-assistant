// components/MessageBubble.tsx - Chat message bubble component
/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";
import { Check, Copy, PencilLine } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];
  isStreaming?: boolean;
  onEdit?: (text: string) => void;
}

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "image"; alt: string; src: string };

type MetaItem = {
  label: string;
  value: string;
};

const htmlEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith("#x")) {
      return String.fromCharCode(parseInt(normalized.slice(2), 16));
    }
    if (normalized.startsWith("#")) {
      return String.fromCharCode(parseInt(normalized.slice(1), 10));
    }
    return htmlEntities[normalized] || match;
  });
}

function normalizeRepairText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00e2\u20ac[\u201c\u201d]/g, " - ")
    .replace(/\u00e2\u20ac[\u2122\u2019]/g, "'")
    .replace(/\u00e2\u20ac[\u0153\u009d]/g, "\"")
    .replace(/\u00e2\u20ac\u00a2/g, "*")
    .replace(/\u00e2\u2020\u2019/g, "->")
    .replace(/\u00c2/g, "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/p\s*>/gi, "\n\n")
    .replace(/<\s*p[^>]*>/gi, "")
    .replace(/<\s*strong[^>]*>/gi, "**")
    .replace(/<\s*\/strong\s*>/gi, "**")
    .replace(/<\s*b[^>]*>/gi, "**")
    .replace(/<\s*\/b\s*>/gi, "**")
    .replace(/<\s*em[^>]*>/gi, "*")
    .replace(/<\s*\/em\s*>/gi, "*")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = normalizeRepairText(content).split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push({ type: "list", items: listItems });
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "image",
        alt: imageMatch[1].trim(),
        src: imageMatch[2].trim(),
      });
      continue;
    }

    const listMatch = trimmed.match(/^(?:[-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1].trim());
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function stripMarkdown(value: string): string {
  return value.replace(/\*\*/g, "").replace(/[_`]/g, "").trim();
}

function parseMeta(block: MarkdownBlock): MetaItem | null {
  if (block.type !== "paragraph") return null;
  const match = block.text.match(/^\*\*([^:*]+):\*\*\s*(.+)$/);
  if (!match) return null;
  return {
    label: stripMarkdown(match[1]),
    value: match[2].trim(),
  };
}

function renderInline(value: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let rest = value;
  let index = 0;

  while (rest) {
    const linkMatch = rest.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const boldMatch = rest.match(/\*\*([^*]+)\*\*/);
    const linkIndex = linkMatch?.index ?? Number.POSITIVE_INFINITY;
    const boldIndex = boldMatch?.index ?? Number.POSITIVE_INFINITY;

    if (!linkMatch && !boldMatch) {
      nodes.push(rest);
      break;
    }

    if (linkIndex < boldIndex && linkMatch) {
      if (linkIndex > 0) nodes.push(rest.slice(0, linkIndex));
      const href = linkMatch[2].trim();
      nodes.push(
        <a
          key={`${keyPrefix}-link-${index}`}
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noreferrer" : undefined}
          className="font-medium text-primary underline underline-offset-2 hover:opacity-80 break-words"
        >
          {stripMarkdown(linkMatch[1])}
        </a>
      );
      rest = rest.slice(linkIndex + linkMatch[0].length);
    } else if (boldMatch) {
      if (boldIndex > 0) nodes.push(rest.slice(0, boldIndex));
      nodes.push(
        <strong key={`${keyPrefix}-strong-${index}`} className="font-semibold text-[rgb(var(--chat-text))]">
          {stripMarkdown(boldMatch[1])}
        </strong>
      );
      rest = rest.slice(boldIndex + boldMatch[0].length);
    }

    index += 1;
  }

  return nodes;
}

function renderBlocks(blocks: MarkdownBlock[], keyPrefix: string): React.ReactNode {
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        const key = `${keyPrefix}-${index}`;

        if (block.type === "paragraph") {
          return (
            <p key={key} className="text-sm leading-7 text-[rgb(var(--chat-text))]">
              {renderInline(block.text, key)}
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={key} className="grid gap-x-8 gap-y-2 pl-5 sm:grid-cols-2">
              {block.items.map((item, itemIndex) => (
                <li
                  key={`${key}-item-${itemIndex}`}
                  className="list-disc text-sm leading-6 text-[rgb(var(--chat-text))] marker:text-[rgb(255,138,101)]"
                >
                  {renderInline(item, `${key}-item-${itemIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "image") {
          const altText = block.alt || "Repair step image";
          return (
            <figure key={key} className="overflow-hidden rounded-xl border border-[rgb(var(--chat-border))] bg-[rgb(var(--chat-surface-soft))]">
              <img
                src={block.src}
                alt={altText}
                className="max-h-96 w-full object-contain"
              />
              {block.alt && (
                <figcaption className="border-t border-[rgb(var(--chat-border))] px-3 py-2 text-xs text-[rgb(var(--chat-muted))]">
                  {stripMarkdown(block.alt)}
                </figcaption>
              )}
            </figure>
          );
        }

        return (
          <h3 key={key} className="text-base font-semibold text-[rgb(var(--chat-text))]">
            {stripMarkdown(block.text)}
          </h3>
        );
      })}
    </div>
  );
}

function splitStepCards(blocks: MarkdownBlock[]) {
  const intro: MarkdownBlock[] = [];
  const steps: Array<{ title: string; blocks: MarkdownBlock[] }> = [];
  let currentStep: { title: string; blocks: MarkdownBlock[] } | null = null;

  for (const block of blocks) {
    if (block.type === "heading" && block.level === 3) {
      if (currentStep) steps.push(currentStep);
      currentStep = { title: block.text, blocks: [] };
      continue;
    }

    if (currentStep) {
      currentStep.blocks.push(block);
    } else {
      intro.push(block);
    }
  }

  if (currentStep) steps.push(currentStep);
  return { intro, steps };
}

function renderSection(title: string, blocks: MarkdownBlock[], key: string): React.ReactNode {
  const normalizedTitle = stripMarkdown(title).toLowerCase();

  if (normalizedTitle.includes("repair steps")) {
    const { intro, steps } = splitStepCards(blocks);
    return (
      <section key={key} className="space-y-3">
        <h2 className="text-lg font-semibold text-[rgb(var(--chat-text))]">Repair Steps</h2>
        {intro.length > 0 && renderBlocks(intro, `${key}-intro`)}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <article
              key={`${key}-step-${index}`}
              className="border-t border-[rgb(var(--chat-border))] pt-4 first:border-t-0 first:pt-0"
            >
              <h3 className="text-base font-semibold leading-6 text-[rgb(var(--chat-text))]">
                {stripMarkdown(step.title)}
              </h3>
              {step.blocks.length > 0 && (
                <div className="mt-3">{renderBlocks(step.blocks, `${key}-step-${index}`)}</div>
              )}
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section key={key} className="border-t border-[rgb(var(--chat-border))] pt-5 first:border-t-0 first:pt-0">
      <h2 className="mb-3 text-base font-semibold text-[rgb(var(--chat-text))]">
        {stripMarkdown(title)}
      </h2>
      {renderBlocks(blocks, key)}
    </section>
  );
}

function StructuredMarkdown({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const blocks = parseMarkdownBlocks(content);
  const titleIndex = blocks.findIndex((block) => block.type === "heading" && block.level === 1);
  const titleBlock = titleIndex >= 0
    ? (blocks[titleIndex] as Extract<MarkdownBlock, { type: "heading" }>)
    : null;
  const leadingBlocks = titleIndex >= 0 ? blocks.slice(0, titleIndex) : [];
  const afterTitle = titleIndex >= 0 ? blocks.slice(titleIndex + 1) : blocks;
  const metaItems: MetaItem[] = [];
  const bodyBlocks: MarkdownBlock[] = [];
  let collectingMeta = true;

  for (const block of afterTitle) {
    const meta = parseMeta(block);
    if (collectingMeta && meta) {
      metaItems.push(meta);
      continue;
    }
    collectingMeta = false;
    bodyBlocks.push(block);
  }

  const sections: Array<{ title: string; blocks: MarkdownBlock[] }> = [];
  const looseBlocks: MarkdownBlock[] = [];
  let currentSection: { title: string; blocks: MarkdownBlock[] } | null = null;

  for (const block of bodyBlocks) {
    if (block.type === "heading" && block.level === 2) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: block.text, blocks: [] };
      continue;
    }

    if (currentSection) {
      currentSection.blocks.push(block);
    } else {
      looseBlocks.push(block);
    }
  }

  if (currentSection) sections.push(currentSection);

  return (
    <div className="w-full space-y-4">
      {leadingBlocks.length > 0 && (
        <div className="text-sm text-[rgb(var(--chat-muted))]">
          {renderBlocks(leadingBlocks, "leading")}
        </div>
      )}

      {titleBlock && (
        <h1 className="text-xl font-semibold leading-7 text-[rgb(var(--chat-text))]">
          {stripMarkdown(titleBlock.text)}
        </h1>
      )}

      {metaItems.length > 0 && (
        <div className="grid gap-x-6 gap-y-3 border-y border-[rgb(var(--chat-border))] py-4 sm:grid-cols-3">
          {metaItems.map((item, index) => (
            <div
              key={`meta-${item.label}-${index}`}
              className="min-w-0"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--chat-muted))]">
                {item.label}
              </p>
              <p className="mt-1 break-words text-sm leading-6 text-[rgb(var(--chat-text))]">
                {renderInline(item.value, `meta-${index}`)}
              </p>
            </div>
          ))}
        </div>
      )}

      {looseBlocks.length > 0 && (
        <div>
          {renderBlocks(looseBlocks, "loose")}
        </div>
      )}

      {sections.map((section, index) => renderSection(section.title, section.blocks, `section-${index}`))}

      {isStreaming && (
        <span className="inline-flex gap-1 ml-1 align-middle">
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
        </span>
      )}
    </div>
  );
}

function PlainMessage({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-7">
      {normalizeRepairText(content)}
      {isStreaming && (
        <span className="inline-flex gap-1 ml-1 align-middle">
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
        </span>
      )}
    </p>
  );
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
  const normalizedContent = normalizeRepairText(content);
  const markdownBlocks = parseMarkdownBlocks(content);
  const hasMarkdownImage = markdownBlocks.some((block) => block.type === "image");
  const hasStructuredMarkdown = !isUser && markdownBlocks.some(
    (block) => block.type === "heading" && block.level <= 2
  );
  const shouldRenderMarkdown = !isUser && (hasStructuredMarkdown || hasMarkdownImage);
  const contentWidth = shouldRenderMarkdown ? "w-full max-w-[min(100%,64rem)]" : "max-w-[80%]";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(normalizedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className={`mb-5 flex ${isUser ? "justify-end" : "justify-start"} group`}>
      <div className={`flex ${contentWidth} flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`
          ${
            shouldRenderMarkdown
              ? "w-full max-w-[min(100%,64rem)] rounded-2xl border border-[rgb(var(--chat-border))] bg-[rgb(var(--chat-surface))] px-5 py-5 shadow-sm sm:px-6"
              : "max-w-[80%] rounded-2xl px-5 py-3"
          }
          ${isUser
            ? "bg-[rgb(var(--chat-user-bg))] text-[rgb(var(--chat-user-text))]"
            : shouldRenderMarkdown
              ? "text-[rgb(var(--chat-text))]"
              : "border border-[rgb(var(--chat-border))] bg-[rgb(var(--chat-surface-soft))] text-[rgb(var(--chat-text))]"
          }
          ${shouldRenderMarkdown ? "" : "shadow-sm"}
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
        {shouldRenderMarkdown ? (
          <StructuredMarkdown content={content} isStreaming={isStreaming} />
        ) : (
          <PlainMessage content={content} isStreaming={isStreaming} />
        )}
      </div>
      {!isStreaming && (
        <div className={`mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${isUser ? "justify-end" : "justify-start"}`}>
          <button
            onClick={handleCopy}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--chat-muted))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
            title={copied ? "Copied!" : "Copy"}
            aria-label={copied ? "Copied" : "Copy message"}
          >
            {copied ? (
              <Check className="h-4 w-4" strokeWidth={2.2} />
            ) : (
              <Copy className="h-4 w-4" strokeWidth={2.1} />
            )}
          </button>
          {isUser && onEdit && (
            <button
              onClick={() => onEdit(content)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--chat-muted))] transition-colors hover:bg-[rgb(var(--chat-hover))]"
              title="Edit and resend"
              aria-label="Edit message"
            >
              <PencilLine className="h-4 w-4" strokeWidth={2.1} />
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
};
