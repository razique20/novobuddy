import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  // Split content by code blocks first
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-2.5 text-xs leading-relaxed text-text-primary break-words">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlock key={idx} language={block.language || 'text'} code={block.content} />;
        }
        return <TextBlock key={idx} text={block.content} />;
      })}
    </div>
  );
};

interface Block {
  type: 'text' | 'code';
  language?: string;
  content: string;
}

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: markdown.slice(lastIndex, match.index),
      });
    }

    blocks.push({
      type: 'code',
      language: match[1]?.trim() || 'text',
      content: match[2]?.replace(/\n$/, '') || '',
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < markdown.length) {
    // Check if there is an unclosed code block (e.g. while streaming)
    const remaining = markdown.slice(lastIndex);
    const unclosedMatch = remaining.match(/```([a-zA-Z0-9_-]*)\n([\s\S]*)$/);
    if (unclosedMatch) {
      const textBefore = remaining.slice(0, unclosedMatch.index);
      if (textBefore) {
        blocks.push({ type: 'text', content: textBefore });
      }
      blocks.push({
        type: 'code',
        language: unclosedMatch[1]?.trim() || 'text',
        content: unclosedMatch[2] || '',
      });
    } else {
      blocks.push({
        type: 'text',
        content: remaining,
      });
    }
  }

  return blocks;
}

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy code:', e);
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border/80 bg-[#0d0d14] text-[#e2e8f0] font-mono text-[11px] shadow-md select-text">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-black/40 border-b border-white/5 select-none">
        <div className="flex items-center gap-1.5 text-text-muted text-[10px]">
          <Terminal className="w-3 h-3 text-primary" />
          <span className="font-sans font-medium uppercase tracking-wider text-text-secondary">
            {language || 'code'}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="p-3.5 overflow-x-auto">
        <pre className="m-0 leading-relaxed">
          <code>{renderSyntaxTokens(code, language)}</code>
        </pre>
      </div>
    </div>
  );
};

/**
 * Lightweight token syntax highlighter for common programming languages
 */
function renderSyntaxTokens(code: string, _language: string): React.ReactNode {
  const lines = code.split('\n');

  return lines.map((line, lineIdx) => {
    // Match comments
    if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
      return (
        <div key={lineIdx} className="text-slate-500 italic">
          {line || ' '}
        </div>
      );
    }

    // Split line by tokens
    const tokens = line.split(/(\s+|[{}\[\](),;:.=<>!+\-*\/&|%]|"[^"]*"|'[^']*'|`[^`]*`)/);

    return (
      <div key={lineIdx}>
        {tokens.map((token, tokIdx) => {
          if (!token) return null;

          // Strings
          if (
            (token.startsWith('"') && token.endsWith('"')) ||
            (token.startsWith("'") && token.endsWith("'")) ||
            (token.startsWith('`') && token.endsWith('`'))
          ) {
            return (
              <span key={tokIdx} className="text-emerald-400">
                {token}
              </span>
            );
          }

          // Keywords
          const keywords = new Set([
            'const', 'let', 'var', 'function', 'return', 'import', 'from', 'export', 'default',
            'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'async', 'await', 'try',
            'catch', 'class', 'interface', 'type', 'fn', 'pub', 'struct', 'impl', 'use', 'mod',
            'def', 'class', 'self', 'true', 'false', 'null', 'undefined', 'None', 'True', 'False',
          ]);

          if (keywords.has(token.trim())) {
            return (
              <span key={tokIdx} className="text-purple-400 font-semibold">
                {token}
              </span>
            );
          }

          // Numbers
          if (/^\d+(\.\d+)?$/.test(token.trim())) {
            return (
              <span key={tokIdx} className="text-amber-400">
                {token}
              </span>
            );
          }

          return <span key={tokIdx}>{token}</span>;
        })}
      </div>
    );
  });
}

const TextBlock: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let isNumberedList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal pl-5 space-y-1 my-1.5">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1 my-1.5">
            {listItems}
          </ul>
        );
      }
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={i} className="text-xs font-bold text-text-primary mt-2 mb-1">
          {renderInlineFormatting(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={i} className="text-sm font-bold text-text-primary mt-2.5 mb-1 text-purple-300">
          {renderInlineFormatting(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={i} className="text-sm font-bold text-text-primary mt-3 mb-1">
          {renderInlineFormatting(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      isNumberedList = false;
      listItems.push(
        <li key={`li-${i}`}>{renderInlineFormatting(trimmed.slice(2))}</li>
      );
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      isNumberedList = true;
      listItems.push(<li key={`li-${i}`}>{renderInlineFormatting(numMatch[2])}</li>);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote
          key={i}
          className="border-l-2 border-primary/60 pl-3 py-1 my-1.5 text-text-secondary italic bg-primary/5 rounded-r"
        >
          {renderInlineFormatting(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={i} className="my-1">
        {renderInlineFormatting(line)}
      </p>
    );
  }

  flushList();

  return <>{elements}</>;
};

function renderInlineFormatting(text: string): React.ReactNode {
  // Matches inline code `code`, bold **text**, and italic *text*
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-background-card border border-border/70 text-primary font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={idx} className="italic text-text-secondary">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}
