/**
 * Validate URL to prevent XSS via javascript: protocol
 * Only allows safe protocols: http, https, mailto, tel, and relative URLs
 */
function sanitizeUrl(url: string): string {
  const trimmedUrl = url.trim().toLowerCase();

  // Allow relative URLs (starting with / or #) and safe protocols
  if (
    trimmedUrl.startsWith('/') ||
    trimmedUrl.startsWith('#') ||
    trimmedUrl.startsWith('http://') ||
    trimmedUrl.startsWith('https://') ||
    trimmedUrl.startsWith('mailto:') ||
    trimmedUrl.startsWith('tel:')
  ) {
    return url;
  }

  // Block dangerous protocols (javascript:, data:, vbscript:, etc.)
  // Return safe fallback
  return '#';
}

/**
 * Simple markdown to HTML converter for basic formatting
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links - sanitize URLs to prevent XSS
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const safeUrl = sanitizeUrl(url);
    return `<a href="${safeUrl}">${text}</a>`;
  });

  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');

  // Wrap consecutive list items in ul tags
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<[h|u|o|p])/g, '$1');
  html = html.replace(/(<\/[h|u|o|p]>)<\/p>/g, '$1');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}
