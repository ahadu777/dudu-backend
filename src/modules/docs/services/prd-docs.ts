/**
 * Directus PRD 文档服务
 * 处理从 Directus CMS 获取和渲染 PRD 文档
 */

import { markdownToHtml } from '../../../utils/markdown';

// ============ 常量配置 ============

const DIRECTUS_URL = 'https://orq-dev.synque.ca';
const DIRECTUS_FOLDER_ID = '275971c0-b989-44d9-b984-95ac60887bca';

// ============ 类型定义 ============

export interface DirectusFile {
  id: string;
  filename_download: string;
}

export interface ProcessedMarkdown {
  metadata: Record<string, string> | null;
  content: string;
}

// ============ Directus API ============

/**
 * 从 Directus 获取 PRD 文件列表
 */
export async function fetchDirectusFiles(): Promise<DirectusFile[]> {
  const response = await fetch(
    `${DIRECTUS_URL}/files?filter[folder][_eq]=${DIRECTUS_FOLDER_ID}&sort=filename_download`
  );
  if (!response.ok) {
    throw new Error(`Directus API error: ${response.status}`);
  }
  const data = await response.json() as { data?: DirectusFile[] };
  return (data.data || []).filter((f) => f.filename_download?.endsWith('.md'));
}

/**
 * 获取单个文件的元数据
 */
export async function fetchFileMetadata(fileId: string): Promise<{ filename_download?: string }> {
  const response = await fetch(`${DIRECTUS_URL}/files/${fileId}`);
  if (!response.ok) {
    throw new Error(`File not found: ${response.status}`);
  }
  const data = await response.json() as { data?: { filename_download?: string } };
  return data.data || {};
}

/**
 * 获取文件内容
 */
export async function fetchFileContent(fileId: string): Promise<string> {
  const response = await fetch(`${DIRECTUS_URL}/assets/${fileId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.status}`);
  }
  return response.text();
}

// ============ Markdown 处理 ============

/**
 * 处理 PRD Markdown，提取 frontmatter 元数据
 */
export function processPrdMarkdown(markdown: string): ProcessedMarkdown {
  // Pattern: Check for ```yaml code block under "## Document Metadata"
  const yamlBlockMatch = markdown.match(/([\s\S]*?)## Document Metadata\s*\n```yaml\s*\n([\s\S]*?)```\s*\n([\s\S]*)$/);

  if (yamlBlockMatch) {
    const beforeMetadata = yamlBlockMatch[1];
    const yamlContent = yamlBlockMatch[2];
    const afterMetadata = yamlBlockMatch[3];

    // Parse YAML into key-value pairs
    const metadata: Record<string, string> = {};
    yamlContent.split('\n').forEach(line => {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        metadata[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    });

    // Return content without the metadata section
    return { metadata, content: beforeMetadata + afterMetadata };
  }

  return { metadata: null, content: markdown };
}

/**
 * 将元数据渲染为 HTML 卡片
 */
export function renderMetadataCard(metadata: Record<string, string>): string {
  const statusColors: Record<string, string> = {
    'Done': '#27ae60',
    'In Progress': '#f39c12',
    'Draft': '#95a5a6',
    'Blocked': '#e74c3c'
  };

  const status = metadata.status || 'Draft';
  const statusColor = statusColors[status] || '#95a5a6';

  return `
    <div class="metadata-card">
      <div class="metadata-header">
        <span class="metadata-id">${metadata.prd_id || 'PRD'}</span>
        <span class="metadata-status" style="background: ${statusColor}">${status}</span>
      </div>
      <div class="metadata-grid">
        ${metadata.product_area ? `<div class="metadata-item"><span class="label">Product Area</span><span class="value">${metadata.product_area}</span></div>` : ''}
        ${metadata.owner ? `<div class="metadata-item"><span class="label">Owner</span><span class="value">${metadata.owner}</span></div>` : ''}
        ${metadata.created_date ? `<div class="metadata-item"><span class="label">Created</span><span class="value">${metadata.created_date}</span></div>` : ''}
        ${metadata.last_updated ? `<div class="metadata-item"><span class="label">Updated</span><span class="value">${metadata.last_updated}</span></div>` : ''}
      </div>
      ${metadata.related_stories ? `
        <div class="metadata-tags">
          <span class="label">Related Stories:</span>
          <div class="tags">${metadata.related_stories.replace(/[\[\]"]/g, '').split(',').map(s => `<span class="tag story">${s.trim()}</span>`).join('')}</div>
        </div>
      ` : ''}
      ${metadata.implementation_cards ? `
        <div class="metadata-tags">
          <span class="label">Implementation Cards:</span>
          <div class="tags">${metadata.implementation_cards.replace(/[\[\]"]/g, '').split(',').map(s => `<span class="tag card">${s.trim()}</span>`).join('')}</div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * 处理 Markdown 并生成完整的 HTML 内容
 */
export function processAndRenderMarkdown(markdown: string): string {
  const { metadata, content } = processPrdMarkdown(markdown);
  const metadataHtml = metadata ? renderMetadataCard(metadata) : '';
  return metadataHtml + markdownToHtml(content);
}
