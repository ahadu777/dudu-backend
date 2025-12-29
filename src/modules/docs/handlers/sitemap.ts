/**
 * Sitemap Route Handler
 *
 * 显示 PRD → Story → Card 的层级结构视图
 */

import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { buildSitemap, SitemapPRD } from '../../../utils/sitemapBuilder';
import { baseLayout, sharedStyles } from '../templates/base';
import { componentStyles, pageHeader } from '../templates/components';
import { sitemapStyles } from '../styles';

/**
 * 生成单个 PRD 的 HTML 块
 */
function generatePrdSection(prd: SitemapPRD): string {
  let html = `
      <details class="prd-node" open>
        <summary class="prd-header">
          📋 <a href="/prd/${prd.prd_id}">${prd.prd_id}: ${prd.title}</a>
          <span class="status-badge ${prd.status}">${prd.status}</span>
        </summary>
        <div class="prd-content">`;

  if (prd.stories.length === 0) {
    html += `<p style="color: #7f8c8d; font-style: italic;">No stories yet</p>`;
  } else {
    prd.stories.forEach(story => {
      html += `
          <div class="story-node">
            <div class="story-header">
              📖 <a href="/stories/${story.id}">${story.id}: ${story.title}</a>
              <span class="status-badge ${story.status}">${story.status}</span>
            </div>`;

      if (story.cards.length > 0) {
        html += `<div class="card-list">`;
        story.cards.forEach(card => {
          html += `<div class="card-item">🎯 <a href="/cards/${card.slug}">${card.slug}</a> <span class="status-badge ${card.status}">${card.status}</span></div>`;
        });
        html += `</div>`;
      } else {
        html += `<div class="card-list" style="color: #7f8c8d; font-size: 0.85em; font-style: italic;">No cards yet</div>`;
      }

      html += `
          </div>`;
    });
  }

  html += `
        </div>
      </details>`;

  return html;
}

/**
 * Sitemap 页面的样式（与现有 sitemapStyles 配合）
 */
const sitemapPageStyles = `
.prd-node {
  margin-bottom: 25px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}
.prd-header {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  padding: 15px 20px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}
.prd-header:hover {
  background: linear-gradient(135deg, #2980b9 0%, #21618c 100%);
}
.prd-header a {
  color: white;
  text-decoration: none;
}
.prd-header a:hover {
  text-decoration: underline;
}
.prd-content {
  padding: 20px;
  background: #fafafa;
}
.story-node {
  margin-bottom: 15px;
  border-left: 3px solid #3498db;
  padding-left: 15px;
}
.story-header {
  font-size: 1em;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}
.story-header a {
  color: #3498db;
  text-decoration: none;
}
.story-header a:hover {
  text-decoration: underline;
}
.card-list {
  margin-left: 20px;
  margin-top: 8px;
}
.card-item {
  padding: 6px 12px;
  margin-bottom: 4px;
  background: white;
  border-radius: 4px;
  font-size: 0.9em;
  display: inline-block;
  margin-right: 8px;
}
.card-item a {
  color: #27ae60;
  text-decoration: none;
}
.card-item a:hover {
  text-decoration: underline;
}
.status-badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75em;
  font-weight: 600;
  margin-left: 6px;
}
.status-badge.Done {
  background: #d4edda;
  color: #155724;
}
.status-badge.Ready {
  background: #cce5ff;
  color: #004085;
}
.status-badge.Unknown {
  background: #e0e0e0;
  color: #666;
}
`;

/**
 * 处理 /sitemap 路由
 */
export function handleSitemap(_req: Request, res: Response): void {
  try {
    const sitemap = buildSitemap();

    // 构建页面头部
    let content = pageHeader(
      '🗺️ Documentation Sitemap',
      'Hierarchical view of PRD → Story → Card relationships',
      [
        { href: '/project-docs', label: '← Project Docs' },
        { href: '/prd', label: 'PRDs' },
        { href: '/stories', label: 'Stories' },
        { href: '/cards', label: 'Cards' }
      ]
    );

    // 构建树形结构
    content += '<div class="tree">';
    sitemap.forEach(prd => {
      content += generatePrdSection(prd);
    });
    content += '</div>';

    // 组装完整页面
    const html = baseLayout(
      {
        title: 'Documentation Sitemap',
        styles: `${componentStyles}\n${sitemapStyles}\n${sitemapPageStyles}`
      },
      content
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error building sitemap:', error);
    res.status(500).json({ error: 'Failed to build sitemap' });
  }
}
