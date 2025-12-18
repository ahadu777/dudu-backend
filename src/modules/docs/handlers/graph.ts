/**
 * Relationship Graph Route Handler
 *
 * 可视化展示 PRD → Story → Card 的关系图
 */

import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { buildSitemap, SitemapPRD } from '../../../utils/sitemapBuilder';
import { baseLayout, sharedStyles } from '../templates/base';
import { componentStyles, pageHeader } from '../templates/components';
import { graphStyles } from '../styles';

/**
 * Graph 页面专用样式
 */
const graphPageStyles = `
.controls {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  display: flex;
  gap: 15px;
  align-items: center;
}
.controls label {
  font-weight: 600;
  color: #2c3e50;
}
.controls select {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
}
.graph-container {
  display: flex;
  gap: 40px;
  overflow-x: auto;
  padding: 30px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 8px;
  min-height: 600px;
}
.column {
  flex: 0 0 auto;
  min-width: 280px;
}
.column-header {
  text-align: center;
  font-size: 1.2em;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 20px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.node {
  background: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}
.node:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 12px rgba(0,0,0,0.15);
}
.node.highlighted {
  background: #fff3cd;
  border: 2px solid #ffc107;
  box-shadow: 0 0 20px rgba(255, 193, 7, 0.4);
}
.node.dimmed {
  opacity: 0.3;
}
.prd-node {
  border-left: 5px solid #3498db;
  background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%);
}
.story-node {
  border-left: 5px solid #2ecc71;
  background: linear-gradient(135deg, #ffffff 0%, #e8f5e9 100%);
}
.card-node {
  border-left: 5px solid #e74c3c;
  background: linear-gradient(135deg, #ffffff 0%, #ffebee 100%);
}
.node-title {
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 5px;
  font-size: 1em;
}
.node-subtitle {
  font-size: 0.85em;
  color: #7f8c8d;
  margin-bottom: 8px;
}
.node-status {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.75em;
  font-weight: 600;
  margin-top: 5px;
}
.status-Done, .status-Complete {
  background: #d4edda;
  color: #155724;
}
.status-In\\.Progress {
  background: #fff3cd;
  color: #856404;
}
.status-Draft, .status-Ready {
  background: #d1ecf1;
  color: #0c5460;
}
.node-connections {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e0e0e0;
  font-size: 0.8em;
  color: #7f8c8d;
}
.stats-box {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}
.stat-item {
  text-align: center;
}
.stat-number {
  font-size: 2em;
  font-weight: 700;
  color: #3498db;
}
.stat-label {
  font-size: 0.9em;
  color: #7f8c8d;
}
.legend {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}
.legend-title {
  font-weight: 700;
  margin-bottom: 10px;
  color: #2c3e50;
}
.legend-items {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}
.prd-color { background: #3498db; }
.story-color { background: #2ecc71; }
.card-color { background: #e74c3c; }
`;

/**
 * 生成 PRD 筛选器选项
 */
function generatePrdFilterOptions(sitemap: SitemapPRD[]): string {
  return sitemap
    .map(prd => `<option value="${prd.prd_id}">${prd.prd_id}: ${prd.title}</option>`)
    .join('');
}

/**
 * 生成 PRD 节点列表
 */
function generatePrdNodes(sitemap: SitemapPRD[]): string {
  return sitemap.map(prd => {
    const storyCount = prd.stories.length;
    const cardCount = prd.stories.reduce((sum, story) => sum + story.cards.length, 0);

    return `
          <div class="node prd-node" data-type="prd" data-id="${prd.prd_id}" onclick="highlightConnections('prd', '${prd.prd_id}')">
            <div class="node-title">${prd.prd_id}</div>
            <div class="node-subtitle">${prd.title}</div>
            <span class="node-status status-${prd.status.replace(/ /g, '.')}">${prd.status}</span>
            <div class="node-connections">
              ${storyCount} ${storyCount === 1 ? 'story' : 'stories'}, ${cardCount} ${cardCount === 1 ? 'card' : 'cards'}
            </div>
          </div>`;
  }).join('');
}

/**
 * 生成 Story 节点列表
 */
function generateStoryNodes(sitemap: SitemapPRD[]): string {
  const nodes: string[] = [];
  sitemap.forEach(prd => {
    prd.stories.forEach(story => {
      const cardCount = story.cards.length;
      nodes.push(`
          <div class="node story-node" data-type="story" data-id="${story.id}" data-prd="${prd.prd_id}" onclick="highlightConnections('story', '${story.id}')">
            <div class="node-title">${story.id}</div>
            <div class="node-subtitle">${story.title}</div>
            <span class="node-status status-${story.status.replace(/ /g, '.')}">${story.status}</span>
            <div class="node-connections">
              PRD: ${prd.prd_id} → ${cardCount} ${cardCount === 1 ? 'card' : 'cards'}
            </div>
          </div>`);
    });
  });
  return nodes.join('');
}

/**
 * 生成 Card 节点列表
 */
function generateCardNodes(sitemap: SitemapPRD[]): string {
  const nodes: string[] = [];
  sitemap.forEach(prd => {
    prd.stories.forEach(story => {
      story.cards.forEach(card => {
        nodes.push(`
          <div class="node card-node" data-type="card" data-id="${card.slug}" data-story="${story.id}" data-prd="${prd.prd_id}" onclick="highlightConnections('card', '${card.slug}')">
            <div class="node-title">${card.slug}</div>
            <div class="node-subtitle">${card.title}</div>
            <span class="node-status status-${card.status.replace(/ /g, '.')}">${card.status}</span>
            <div class="node-connections">
              Story: ${story.id}
            </div>
          </div>`);
      });
    });
  });
  return nodes.join('');
}

/**
 * 交互脚本
 */
const graphScript = `
<script>
  let currentHighlight = null;

  function highlightConnections(type, id) {
    const allNodes = document.querySelectorAll('.node');

    if (currentHighlight && currentHighlight.type === type && currentHighlight.id === id) {
      resetFilter();
      return;
    }

    currentHighlight = { type, id };

    allNodes.forEach(node => {
      node.classList.remove('highlighted', 'dimmed');
      node.classList.add('dimmed');
    });

    if (type === 'prd') {
      const prdNode = document.querySelector('.prd-node[data-id="' + id + '"]');
      if (prdNode) {
        prdNode.classList.remove('dimmed');
        prdNode.classList.add('highlighted');
      }
      document.querySelectorAll('.story-node[data-prd="' + id + '"]').forEach(node => {
        node.classList.remove('dimmed');
        node.classList.add('highlighted');
      });
      document.querySelectorAll('.card-node[data-prd="' + id + '"]').forEach(node => {
        node.classList.remove('dimmed');
        node.classList.add('highlighted');
      });
    } else if (type === 'story') {
      const storyNode = document.querySelector('.story-node[data-id="' + id + '"]');
      if (!storyNode) return;

      const prdId = storyNode.dataset.prd;

      storyNode.classList.remove('dimmed');
      storyNode.classList.add('highlighted');

      const prdNode = document.querySelector('.prd-node[data-id="' + prdId + '"]');
      if (prdNode) {
        prdNode.classList.remove('dimmed');
        prdNode.classList.add('highlighted');
      }

      document.querySelectorAll('.card-node[data-story="' + id + '"]').forEach(node => {
        node.classList.remove('dimmed');
        node.classList.add('highlighted');
      });
    } else if (type === 'card') {
      const cardNode = document.querySelector('.card-node[data-id="' + id + '"]');
      if (!cardNode) return;

      const storyId = cardNode.dataset.story;
      const prdId = cardNode.dataset.prd;

      cardNode.classList.remove('dimmed');
      cardNode.classList.add('highlighted');

      const storyNodeEl = document.querySelector('.story-node[data-id="' + storyId + '"]');
      if (storyNodeEl) {
        storyNodeEl.classList.remove('dimmed');
        storyNodeEl.classList.add('highlighted');
      }

      const prdNodeEl = document.querySelector('.prd-node[data-id="' + prdId + '"]');
      if (prdNodeEl) {
        prdNodeEl.classList.remove('dimmed');
        prdNodeEl.classList.add('highlighted');
      }
    }
  }

  function filterByPRD(prdId) {
    const allNodes = document.querySelectorAll('.node');

    if (!prdId) {
      resetFilter();
      return;
    }

    currentHighlight = null;

    allNodes.forEach(node => {
      node.classList.remove('highlighted', 'dimmed');
      node.classList.add('dimmed');
    });

    const prdNode = document.querySelector('.prd-node[data-id="' + prdId + '"]');
    if (prdNode) {
      prdNode.classList.remove('dimmed');
    }

    document.querySelectorAll('.story-node[data-prd="' + prdId + '"]').forEach(node => {
      node.classList.remove('dimmed');
    });
    document.querySelectorAll('.card-node[data-prd="' + prdId + '"]').forEach(node => {
      node.classList.remove('dimmed');
    });
  }

  function resetFilter() {
    currentHighlight = null;
    document.getElementById('prdFilter').value = '';
    const allNodes = document.querySelectorAll('.node');
    allNodes.forEach(node => {
      node.classList.remove('highlighted', 'dimmed');
    });
  }
</script>
`;

/**
 * 处理 /graph 路由
 */
export function handleGraph(_req: Request, res: Response): void {
  try {
    const sitemap = buildSitemap();

    // 计算统计数据
    const totalPrds = sitemap.length;
    const totalStories = sitemap.reduce((sum, prd) => sum + prd.stories.length, 0);
    const totalCards = sitemap.reduce((sum, prd) =>
      sum + prd.stories.reduce((s, story) => s + story.cards.length, 0), 0);

    // 构建页面头部
    let content = pageHeader(
      '📊 Relationship Graph',
      'Visual representation of PRD → Story → Card relationships',
      [
        { href: '/project-docs', label: '← Hub' },
        { href: '/prd', label: 'PRDs' },
        { href: '/stories', label: 'Stories' },
        { href: '/cards', label: 'Cards' },
        { href: '/sitemap', label: 'Sitemap' }
      ]
    );

    // 筛选控件
    content += `
    <div class="controls">
      <label>Filter by PRD:</label>
      <select id="prdFilter" onchange="filterByPRD(this.value)">
        <option value="">All PRDs</option>
        ${generatePrdFilterOptions(sitemap)}
      </select>
      <button onclick="resetFilter()" style="padding: 5px 15px; border: 1px solid #3498db; background: white; color: #3498db; border-radius: 4px; cursor: pointer; font-weight: 600;">Reset</button>
      <span style="margin-left: auto; color: #7f8c8d; font-size: 0.9em;">Click any node to highlight its connections</span>
    </div>`;

    // 三列图表
    content += `
    <div class="graph-container">
      <div class="column">
        <div class="column-header">📋 PRDs</div>
        <div id="prd-column">
          ${generatePrdNodes(sitemap)}
        </div>
      </div>

      <div class="column">
        <div class="column-header">📖 User Stories</div>
        <div id="story-column">
          ${generateStoryNodes(sitemap)}
        </div>
      </div>

      <div class="column">
        <div class="column-header">🎯 Implementation Cards</div>
        <div id="card-column">
          ${generateCardNodes(sitemap)}
        </div>
      </div>
    </div>`;

    // 图例
    content += `
    <div class="legend">
      <div class="legend-title">Legend</div>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-color prd-color"></div>
          <span>PRD (Product Requirements Document)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color story-color"></div>
          <span>User Story</span>
        </div>
        <div class="legend-item">
          <div class="legend-color card-color"></div>
          <span>Implementation Card</span>
        </div>
      </div>
    </div>`;

    // 统计信息
    content += `
    <div class="stats-box">
      <div class="stat-item">
        <div class="stat-number">${totalPrds}</div>
        <div class="stat-label">PRDs</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${totalStories}</div>
        <div class="stat-label">Stories</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${totalCards}</div>
        <div class="stat-label">Cards</div>
      </div>
    </div>`;

    // 组装完整页面
    const html = baseLayout(
      {
        title: 'Relationship Graph',
        containerClass: 'wide',
        styles: `${componentStyles}\n${graphStyles}\n${graphPageStyles}`,
        scripts: graphScript
      },
      content
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error building relationship graph:', error);
    res.status(500).json({ error: 'Failed to build relationship graph' });
  }
}
