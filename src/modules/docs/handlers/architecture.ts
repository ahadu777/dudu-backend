/**
 * Architecture Route Handler
 *
 * 显示产品架构流程图（Mermaid 支持）
 */

import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../../utils/logger';

/**
 * Architecture 页面专用样式
 */
const architectureStyles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f5f5f5;
  padding: 20px;
}
.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}
.nav-links a {
  color: #3498db;
  text-decoration: none;
  margin-left: 15px;
}
.nav-links a:hover { text-decoration: underline; }
h1 { color: #2c3e50; margin-bottom: 20px; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
h2 { color: #34495e; margin: 30px 0 15px; padding-top: 20px; border-top: 1px solid #eee; }
h3 { color: #7f8c8d; margin: 20px 0 10px; }
h4 { color: #95a5a6; margin: 15px 0 10px; }
p { margin: 10px 0; }
.mermaid {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
  overflow-x: auto;
}
pre {
  background: #f4f4f4;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 15px 0;
}
code {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}
:not(pre) > code {
  background: #f4f4f4;
  padding: 2px 6px;
  border-radius: 3px;
  color: #c7254e;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}
.data-table td, .data-table th {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}
.data-table tr:nth-child(1) {
  background: #3498db;
  color: white;
  font-weight: bold;
}
.data-table tr:nth-child(even) { background: #f9f9f9; }
blockquote {
  border-left: 4px solid #3498db;
  padding-left: 15px;
  margin: 15px 0;
  color: #666;
  background: #f8f9fa;
  padding: 10px 15px;
  border-radius: 0 4px 4px 0;
}
hr { border: none; border-top: 1px solid #eee; margin: 30px 0; }
a { color: #3498db; }
`;

/**
 * Mermaid 初始化脚本
 */
const mermaidScript = `
<script>
  function initMermaid() {
    if (typeof mermaid !== 'undefined') {
      try {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        mermaid.run({
          querySelector: '.mermaid'
        }).catch(function(error) {
          console.error('Mermaid render error:', error);
        });
        return true;
      } catch (error) {
        console.error('Mermaid initialization error:', error);
        return false;
      }
    }
    return false;
  }

  function waitForMermaidAndInit() {
    if (typeof mermaid !== 'undefined' || window.mermaidScriptLoaded) {
      if (initMermaid()) return;
    }

    const maxAttempts = 50;
    let attempts = 0;
    const pollInterval = setInterval(function() {
      attempts++;
      if (typeof mermaid !== 'undefined') {
        clearInterval(pollInterval);
        initMermaid();
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        console.error('Mermaid failed to load');
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForMermaidAndInit);
  } else {
    waitForMermaidAndInit();
  }

  window.addEventListener('load', function() {
    if (typeof mermaid !== 'undefined' && document.querySelectorAll('.mermaid svg').length === 0) {
      initMermaid();
    }
  });
</script>
`;

/**
 * 将 Markdown 转换为 HTML（支持 Mermaid）
 */
function convertMarkdownToHtml(content: string): string {
  let htmlContent = content;

  // 提取并保留代码块
  const codeBlocks: string[] = [];
  htmlContent = htmlContent.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
    const index = codeBlocks.length;
    if (lang === 'mermaid') {
      codeBlocks.push(`<div class="mermaid">\n${code.trim()}\n</div>`);
    } else {
      codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
    }
    return `\n__CODE_BLOCK_${index}__\n`;
  });

  // 转义剩余的 HTML
  htmlContent = htmlContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 标题
  htmlContent = htmlContent.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  htmlContent = htmlContent.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  htmlContent = htmlContent.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  htmlContent = htmlContent.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // 粗体和斜体
  htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  htmlContent = htmlContent.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 行内代码
  htmlContent = htmlContent.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 链接
  htmlContent = htmlContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 引用块
  htmlContent = htmlContent.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>');

  // 水平线
  htmlContent = htmlContent.replace(/^---$/gim, '<hr>');

  // 表格
  htmlContent = htmlContent.replace(/^\|(.+)\|$/gim, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    if (cells.every(c => /^[-:]+$/.test(c.trim()))) {
      return ''; // 跳过分隔行
    }
    const row = cells.map(c => `<td>${c.trim()}</td>`).join('');
    return `<tr>${row}</tr>`;
  });
  htmlContent = htmlContent.replace(/(<tr>.*<\/tr>\n?)+/g, '<table class="data-table">$&</table>');

  // 段落处理
  htmlContent = htmlContent.replace(/\n\n(?!__CODE_BLOCK)/g, '</p>\n<p>');
  htmlContent = '<p>' + htmlContent + '</p>';
  htmlContent = htmlContent.replace(/<p>\s*<(h[1-4]|table|blockquote|hr)/g, '<$1');
  htmlContent = htmlContent.replace(/<\/(h[1-4]|table|blockquote)>\s*<\/p>/g, '</$1>');
  htmlContent = htmlContent.replace(/<p>\s*__CODE_BLOCK_/g, '__CODE_BLOCK_');
  htmlContent = htmlContent.replace(/__CODE_BLOCK_(\d+)__\s*<\/p>/g, '__CODE_BLOCK_$1__');
  htmlContent = htmlContent.replace(/<p>\s*<\/p>/g, '');

  // 恢复代码块
  codeBlocks.forEach((block, index) => {
    htmlContent = htmlContent.replace(`__CODE_BLOCK_${index}__`, block);
  });

  return htmlContent;
}

/**
 * 生成完整的 HTML 页面
 */
function generateArchitecturePage(title: string, htmlContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js" onload="window.mermaidScriptLoaded = true;"></script>
  <style>${architectureStyles}</style>
</head>
<body>
  <div class="container">
    <div class="nav-bar">
      <div></div>
      <div class="nav-links">
        <a href="/project-docs">← Project Docs</a>
        <a href="/prd">PRDs</a>
        <a href="/stories">Stories</a>
        <a href="/cards">Cards</a>
        <a href="/sitemap">Sitemap</a>
      </div>
    </div>

    ${htmlContent}
  </div>

  ${mermaidScript}
</body>
</html>`;
}

/**
 * 处理 /architecture 路由
 */
export function handleArchitecture(_req: Request, res: Response): void {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'product-architecture-flowchart.md');

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Architecture document not found' });
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // 从第一个 H1 提取标题
    const titleMatch = content.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : 'Product Architecture';

    // 将 Markdown 转换为 HTML
    const htmlContent = convertMarkdownToHtml(content);

    // 生成完整页面
    const html = generateArchitecturePage(title, htmlContent);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error loading architecture document:', error);
    res.status(500).json({ error: 'Failed to load architecture document' });
  }
}
