/**
 * Directus PRD 文档 Handler
 * 处理 /prd-docs 路由
 */

import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import {
  fetchDirectusFiles,
  fetchFileMetadata,
  fetchFileContent,
  processAndRenderMarkdown,
  DirectusFile
} from '../services/prd-docs';

// ============ 页面 HTML 生成 ============

/**
 * 生成 PRD 查看器完整 HTML（带侧边栏）
 */
function generatePrdViewerHtml(
  files: DirectusFile[],
  selectedFileId: string | null,
  contentHtml: string,
  selectedFileName: string
): string {
  const sidebarItems = files.map((f) => {
    const isActive = f.id === selectedFileId;
    const displayName = f.filename_download.replace('.md', '');
    return `
      <a href="/prd-docs/${f.id}" class="sidebar-item ${isActive ? 'active' : ''}">
        <span class="item-icon">${isActive ? '📖' : '📄'}</span>
        <span class="item-name">${displayName}</span>
      </a>
    `;
  }).join('');

  // CSS 样式
  const styles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f0f2f5;
    }

    .layout {
      display: flex;
      min-height: 100vh;
    }

    /* Sidebar */
    .sidebar {
      width: 300px;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      box-shadow: 4px 0 15px rgba(0,0,0,0.1);
    }

    .sidebar-header {
      padding: 24px 20px;
      background: rgba(255,255,255,0.05);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .sidebar-header h1 {
      font-size: 1.4em;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sidebar-header .subtitle {
      font-size: 0.8em;
      color: rgba(255,255,255,0.5);
      margin-top: 4px;
    }

    .sidebar-badge {
      background: #27ae60;
      color: white;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.7em;
      font-weight: 500;
    }

    .sidebar-nav {
      padding: 16px 12px;
    }

    .sidebar-section {
      margin-bottom: 8px;
      padding: 0 8px;
      font-size: 0.75em;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.4);
    }

    .sidebar-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      margin: 4px 0;
      border-radius: 8px;
      text-decoration: none;
      color: rgba(255,255,255,0.7);
      transition: all 0.2s ease;
      font-size: 0.9em;
    }

    .sidebar-item:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
      transform: translateX(4px);
    }

    .sidebar-item.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      font-weight: 500;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .item-icon { font-size: 1.1em; }

    .item-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-footer {
      padding: 16px 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
      margin-top: auto;
    }

    .sidebar-footer a {
      color: rgba(255,255,255,0.5);
      text-decoration: none;
      font-size: 0.85em;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: color 0.2s;
    }

    .sidebar-footer a:hover { color: #fff; }

    /* Main Content */
    .main-content {
      flex: 1;
      margin-left: 300px;
      padding: 32px 48px;
      max-width: calc(100% - 300px);
    }

    .content-card {
      background: #fff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      max-width: 900px;
    }

    /* Welcome State */
    .welcome-state {
      text-align: center;
      padding: 80px 40px;
    }

    .welcome-state .icon { font-size: 4em; margin-bottom: 24px; }
    .welcome-state h2 { color: #1a1a2e; margin-bottom: 12px; }
    .welcome-state p { color: #666; max-width: 400px; margin: 0 auto; }

    /* Metadata Card Styles */
    .metadata-card {
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
      border: 1px solid #e0e7ff;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
    }

    .metadata-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e0e7ff;
    }

    .metadata-id {
      font-size: 1.4em;
      font-weight: 700;
      color: #1a1a2e;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .metadata-status {
      padding: 4px 12px;
      border-radius: 20px;
      color: white;
      font-size: 0.8em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .metadata-item {
      background: white;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid #e9ecef;
    }

    .metadata-item .label {
      display: block;
      font-size: 0.75em;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .metadata-item .value { font-weight: 600; color: #1a1a2e; }

    .metadata-tags { margin-top: 16px; }

    .metadata-tags .label {
      display: block;
      font-size: 0.8em;
      color: #6c757d;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .metadata-tags .tags { display: flex; flex-wrap: wrap; gap: 8px; }

    .metadata-tags .tag {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8em;
      font-weight: 500;
    }

    .metadata-tags .tag.story {
      background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
      color: #155724;
      border: 1px solid #b8daff;
    }

    .metadata-tags .tag.card {
      background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
      color: #856404;
      border: 1px solid #ffc107;
    }

    /* Document Content Styles */
    .content h1, .content h2, .content h3, .content h4 {
      color: #1a1a2e;
      margin-top: 32px;
      margin-bottom: 16px;
      font-weight: 600;
    }

    .content h1:first-child { margin-top: 0; }

    .content h1 {
      font-size: 2.2em;
      padding: 16px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }

    .content h2 {
      font-size: 1.5em;
      padding: 12px 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-left: 4px solid #667eea;
      border-radius: 0 8px 8px 0;
      margin-top: 40px;
      color: #1a1a2e;
    }

    .content h3 {
      font-size: 1.2em;
      color: #444;
      padding: 8px 16px;
      background: #f8f9fa;
      border-radius: 6px;
      display: inline-block;
      margin-top: 28px;
    }

    .content h4 {
      font-size: 1.1em;
      color: #555;
      border-bottom: 2px solid #667eea;
      padding-bottom: 6px;
      display: inline-block;
    }

    .content p { margin-bottom: 16px; color: #444; line-height: 1.8; }

    .content ul, .content ol {
      margin-left: 8px;
      margin-bottom: 20px;
      padding: 16px 16px 16px 36px;
      background: #fafbfc;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .content li { margin: 10px 0; color: #444; line-height: 1.7; }
    .content li::marker { color: #667eea; }

    .content code {
      background: linear-gradient(135deg, #fff5f5 0%, #fee);
      padding: 3px 8px;
      border-radius: 4px;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
      font-size: 0.88em;
      color: #c92a2a;
      border: 1px solid #fcc;
    }

    .content pre {
      background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
      color: #cdd6f4;
      padding: 24px;
      border-radius: 12px;
      overflow-x: auto;
      margin: 24px 0;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      border: 1px solid #313244;
    }

    .content pre code {
      background: none;
      padding: 0;
      color: inherit;
      font-size: 0.9em;
      border: none;
    }

    .content table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 24px 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      border: 1px solid #e9ecef;
    }

    .content th, .content td { padding: 14px 18px; text-align: left; }

    .content th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 600;
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .content td { border-bottom: 1px solid #e9ecef; background: white; }
    .content tr:last-child td { border-bottom: none; }
    .content tr:hover td { background: #f8f9fa; }

    .content blockquote {
      border-left: 4px solid #667eea;
      padding: 20px 28px;
      margin: 24px 0;
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
      border-radius: 0 12px 12px 0;
      color: #444;
      font-style: italic;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
    }

    .content blockquote p:last-child { margin-bottom: 0; }

    .content hr {
      border: none;
      height: 2px;
      background: linear-gradient(90deg, transparent, #667eea, transparent);
      margin: 40px 0;
    }

    .content a {
      color: #667eea;
      text-decoration: none;
      border-bottom: 1px dashed #667eea;
      transition: all 0.2s;
    }

    .content a:hover { color: #764ba2; border-bottom-style: solid; }
    .content strong { color: #1a1a2e; font-weight: 600; }
    .content > p + ul, .content > p + ol { margin-top: -8px; }

    /* Scrollbar */
    .sidebar::-webkit-scrollbar { width: 6px; }
    .sidebar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
    .sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }

    /* Responsive */
    @media (max-width: 768px) {
      .sidebar { width: 100%; height: auto; position: relative; }
      .main-content { margin-left: 0; max-width: 100%; padding: 20px; }
      .content-card { padding: 24px; }
    }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${selectedFileName ? selectedFileName + ' - ' : ''}PRD Documents</title>
  <style>${styles}</style>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1>
          <span>📚</span>
          PRD Documents
        </h1>
        <div class="subtitle">
          <span class="sidebar-badge">Directus</span>
          ${files.length} document${files.length !== 1 ? 's' : ''}
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="sidebar-section">Documents</div>
        ${sidebarItems || '<p style="padding: 16px; color: rgba(255,255,255,0.5); font-size: 0.9em;">No documents found</p>'}
      </nav>

      <div class="sidebar-footer">
        <a href="/project-docs">
          <span>←</span>
          Back to Documentation Hub
        </a>
      </div>
    </aside>

    <main class="main-content">
      <div class="content-card">
        ${selectedFileId ? `<div class="content">${contentHtml}</div>` : `
          <div class="welcome-state">
            <div class="icon">📖</div>
            <h2>Welcome to PRD Documents</h2>
            <p>Select a document from the sidebar to view its contents. All documents are synced from Directus.</p>
          </div>
        `}
      </div>
    </main>
  </div>
</body>
</html>`;
}

// ============ Route Handlers ============

/**
 * 处理 /prd-docs - 显示文档列表
 */
export async function handlePrdDocsList(_req: Request, res: Response): Promise<void> {
  try {
    const files = await fetchDirectusFiles();
    const html = generatePrdViewerHtml(files, null, '', 'PRD Documents');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error fetching Directus files:', error);
    res.status(500).json({ error: 'Failed to fetch documents from Directus' });
  }
}

/**
 * 处理 /prd-docs/:fileId - 显示单个文档
 */
export async function handlePrdDocsDetail(req: Request, res: Response): Promise<void> {
  const { fileId } = req.params;

  try {
    // 获取所有文件用于侧边栏
    const files = await fetchDirectusFiles();

    // 获取文件元数据
    const metadata = await fetchFileMetadata(fileId);
    const fileName = metadata.filename_download?.replace('.md', '') || 'Document';

    // 获取文件内容
    const markdown = await fetchFileContent(fileId);

    // 处理 Markdown 并渲染
    const htmlContent = processAndRenderMarkdown(markdown);

    const html = generatePrdViewerHtml(files, fileId, htmlContent, fileName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error fetching Directus document:', error);
    res.status(500).json({ error: 'Failed to fetch document from Directus' });
  }
}
