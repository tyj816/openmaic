/**
 * Message Content Component
 * 
 * Renders chat messages with basic Markdown support
 */

import React from 'react';

interface MessageContentProps {
  content: string;
  className?: string;
}

export function MessageContent({ content, className = '' }: MessageContentProps) {
  // Simple Markdown to HTML conversion
  const renderContent = (text: string) => {
    // Convert **bold** to <strong>
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert * list items to proper list items
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line is a list item
      if (line.startsWith('* ') || line.startsWith('- ')) {
        if (!inList) {
          html += '<ul class="list-disc list-inside space-y-1 my-2">';
          inList = true;
        }
        const itemContent = line.substring(2).trim();
        html += `<li>${itemContent}</li>`;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        if (line) {
          html += `<p class="my-1">${line}</p>`;
        }
      }
    }
    
    if (inList) {
      html += '</ul>';
    }
    
    return html;
  };

  return (
    <div
      className={`text-sm ${className}`}
      dangerouslySetInnerHTML={{ __html: renderContent(content) }}
    />
  );
}
