import React from 'react';

/**
 * QuestionContent Component
 * Renders question text cleanly. If C programming code is detected (either in
 * markdown ``` blocks or as multi-line C code statements), it splits the
 * question prompt from the code snippet and renders the code in a syntax-highlighted,
 * monospace dark terminal card with preserved indentation.
 */
export default function QuestionContent({ text, compact = false, style = {} }) {
  if (!text) return null;

  // 1. Check for markdown code block: ```c ... ``` or ``` ... ```
  const codeBlockRegex = /```(?:[a-zA-Z]*\n)?([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);

  if (match) {
    const promptPart = text.slice(0, match.index).trim();
    const codePart = match[1].trim();
    const afterPart = text.slice(match.index + match[0].length).trim();

    return (
      <div style={{ ...style, marginBottom: compact ? '0.4rem' : '1.25rem' }}>
        {promptPart && (
          <div style={{
            fontSize: compact ? '0.88rem' : '1.15rem',
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.5,
            marginBottom: '0.65rem'
          }}>
            {promptPart}
          </div>
        )}
        <div style={{
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: compact ? '0.6rem 0.85rem' : '1rem 1.25rem',
          borderRadius: '10px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: compact ? '0.8rem' : '0.95rem',
          lineHeight: 1.55,
          overflowX: 'auto',
          whiteSpace: 'pre',
          border: '1px solid #1e293b',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
          marginBottom: afterPart ? '0.65rem' : 0
        }}>
          <code>{codePart}</code>
        </div>
        {afterPart && (
          <div style={{ fontSize: compact ? '0.82rem' : '1rem', color: '#334155', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
            {afterPart}
          </div>
        )}
      </div>
    );
  }

  // 2. Check if text has multiple lines (e.g. prompt on line 1, C code on lines 2..N)
  if (text.includes('\n')) {
    const lines = text.split('\n');
    const firstLine = lines[0].trim();
    const restLines = lines.slice(1).join('\n');

    if (restLines.trim()) {
      return (
        <div style={{ ...style, marginBottom: compact ? '0.4rem' : '1.25rem' }}>
          {firstLine && (
            <div style={{
              fontSize: compact ? '0.88rem' : '1.15rem',
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.5,
              marginBottom: '0.65rem'
            }}>
              {firstLine}
            </div>
          )}
          <div style={{
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            padding: compact ? '0.6rem 0.85rem' : '1rem 1.25rem',
            borderRadius: '10px',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: compact ? '0.8rem' : '0.95rem',
            lineHeight: 1.55,
            overflowX: 'auto',
            whiteSpace: 'pre',
            border: '1px solid #1e293b',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)'
          }}>
            <code>{restLines}</code>
          </div>
        </div>
      );
    }
  }

  // 3. Simple single-line question text
  return (
    <div style={{
      fontSize: compact ? '0.88rem' : '1.15rem',
      fontWeight: 700,
      color: '#0f172a',
      lineHeight: 1.6,
      marginBottom: compact ? '0.4rem' : '1.25rem',
      whiteSpace: 'pre-wrap',
      ...style
    }}>
      {text}
    </div>
  );
}
