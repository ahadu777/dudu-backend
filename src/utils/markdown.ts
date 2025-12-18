/**
 * 增强版 Markdown 转 HTML 工具
 * 借鉴 marked 库的设计思路：块级优先、内联后处理
 * 支持：表格、引用块、代码块、水平线、列表、链接等
 */

/**
 * 验证 URL 防止 XSS 攻击
 */
function sanitizeUrl(url: string): string {
  const trimmedUrl = url.trim().toLowerCase();
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
  return '#';
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 解析 GFM 风格表格
 */
function parseTable(tableText: string): string {
  const lines = tableText.trim().split('\n');
  if (lines.length < 2) return tableText;

  const headerLine = lines[0];
  const separatorLine = lines[1];

  // 验证分隔行格式: |---|---|
  if (!/^\|?[\s:-]+\|[\s|:-]+\|?$/.test(separatorLine)) {
    return tableText;
  }

  // 解析对齐方式
  const alignments = separatorLine
    .split('|')
    .filter(cell => cell.trim())
    .map(cell => {
      const trimmed = cell.trim();
      if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
      if (trimmed.endsWith(':')) return 'right';
      return 'left';
    });

  // 解析表头
  const headers = headerLine
    .split('|')
    .filter(cell => cell.trim())
    .map(cell => cell.trim());

  // 解析数据行
  const rows = lines.slice(2).map(line =>
    line.split('|').filter(cell => cell.trim()).map(cell => cell.trim())
  );

  // 生成 HTML
  let html = '<table>\n<thead>\n<tr>\n';
  headers.forEach((header, i) => {
    const align = alignments[i] || 'left';
    html += `<th style="text-align: ${align}">${escapeHtml(header)}</th>\n`;
  });
  html += '</tr>\n</thead>\n<tbody>\n';

  rows.forEach(row => {
    html += '<tr>\n';
    row.forEach((cell, i) => {
      const align = alignments[i] || 'left';
      html += `<td style="text-align: ${align}">${parseInline(escapeHtml(cell))}</td>\n`;
    });
    html += '</tr>\n';
  });

  html += '</tbody>\n</table>';
  return html;
}

/**
 * 解析引用块
 */
function parseBlockquote(text: string): string {
  const lines = text.split('\n');
  const content = lines
    .map(line => line.replace(/^>\s?/, ''))
    .join('\n');
  return `<blockquote>${parseInline(escapeHtml(content))}</blockquote>`;
}

/**
 * 解析内联元素（加粗、斜体、代码、链接）
 */
function parseInline(text: string): string {
  let html = text;

  // 代码（先处理，避免被其他规则干扰）
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 加粗
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // 斜体
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // 删除线 (GFM)
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, url) => {
    const safeUrl = sanitizeUrl(url);
    return `<a href="${safeUrl}">${linkText}</a>`;
  });

  return html;
}

/**
 * 读取 Markdown 文件并转换为 HTML
 */
export function renderMarkdownFile(filePath: string): string {
  const fs = require('fs');
  const path = require('path');

  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    return `<p class="error">文件不存在: ${filePath}</p>`;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  return markdownToHtml(content);
}

/**
 * Markdown 转 HTML
 * 支持：表格、引用块、代码块、水平线、标题、列表、内联格式
 */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (line.trim() === '') {
      result.push('');
      i++;
      continue;
    }

    // 代码块 ```
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      const lang = line.slice(3).trim();
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const codeContent = escapeHtml(codeLines.join('\n'));
      const langAttr = lang ? ` class="language-${lang}"` : '';
      result.push(`<pre><code${langAttr}>${codeContent}</code></pre>`);
      i++;
      continue;
    }

    // 表格（检测表头 + 分隔行）
    if (line.includes('|') && i + 1 < lines.length && /^\|?[\s:-]+\|/.test(lines[i + 1])) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      result.push(parseTable(tableLines.join('\n')));
      continue;
    }

    // 引用块
    if (line.startsWith('>')) {
      const quoteLines: string[] = [line];
      i++;
      while (i < lines.length && (lines[i].startsWith('>') || (lines[i].trim() !== '' && quoteLines.length > 0))) {
        if (!lines[i].startsWith('>') && lines[i].trim() === '') break;
        quoteLines.push(lines[i]);
        i++;
      }
      result.push(parseBlockquote(quoteLines.join('\n')));
      continue;
    }

    // 水平线
    if (/^[-*_]{3,}\s*$/.test(line)) {
      result.push('<hr>');
      i++;
      continue;
    }

    // 标题
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = parseInline(escapeHtml(headerMatch[2]));
      result.push(`<h${level}>${text}</h${level}>`);
      i++;
      continue;
    }

    // 无序列表
    if (/^[\*\-\+]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[\*\-\+]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[\*\-\+]\s+/, '');
        listItems.push(`<li>${parseInline(escapeHtml(itemText))}</li>`);
        i++;
      }
      result.push(`<ul>\n${listItems.join('\n')}\n</ul>`);
      continue;
    }

    // 有序列表
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s+/, '');
        listItems.push(`<li>${parseInline(escapeHtml(itemText))}</li>`);
        i++;
      }
      result.push(`<ol>\n${listItems.join('\n')}\n</ol>`);
      continue;
    }

    // 普通段落
    const paragraphLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' &&
           !lines[i].startsWith('#') &&
           !lines[i].startsWith('>') &&
           !lines[i].startsWith('```') &&
           !/^[\*\-\+]\s+/.test(lines[i]) &&
           !/^\d+\.\s+/.test(lines[i]) &&
           !/^[-*_]{3,}\s*$/.test(lines[i])) {
      paragraphLines.push(lines[i]);
      i++;
    }
    const paragraphText = paragraphLines.join('<br>\n');
    result.push(`<p>${parseInline(escapeHtml(paragraphText))}</p>`);
  }

  return result.filter(line => line !== '').join('\n');
}
