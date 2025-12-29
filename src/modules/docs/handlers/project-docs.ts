/**
 * Project Docs Handler
 * 处理 /project-docs 路由 - 文档中心首页
 */

import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { renderMarkdownFile } from '../../../utils/markdown';
import { loadPRDDocuments, loadStoriesIndex } from '../../../utils/prdParser';
import { getCardStats } from '../../../utils/cardParser';
import { getMemoStats } from '../../../utils/memoParser';
import { getCoverageStats } from '../../../utils/coverageParser';
import { baseLayout } from '../templates/base';

// ============ 页面样式 ============

const pageStyles = `
  .nav-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }
  .nav-card {
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    padding: 25px;
    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
    transition: all 0.3s;
    text-decoration: none;
    display: block;
  }
  .nav-card:hover {
    box-shadow: 0 6px 12px rgba(0,0,0,0.15);
    border-color: #3498db;
    transform: translateY(-4px);
  }
  .nav-card h2 { color: #3498db; margin-bottom: 10px; font-size: 1.4em; }
  .nav-card p { color: #666; margin-bottom: 15px; }
  .nav-card .stats { color: #7f8c8d; font-size: 0.9em; margin-top: 10px; }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-top: 30px;
  }
  .stat-box {
    background: #f8f9fa;
    border-left: 4px solid #3498db;
    padding: 15px;
    border-radius: 4px;
  }
  .stat-box h3 { font-size: 0.9em; color: #7f8c8d; margin-bottom: 5px; }
  .stat-box .number { font-size: 2em; font-weight: 700; color: #2c3e50; }
  .rules-section {
    margin-top: 40px;
    border: 3px solid #e74c3c;
    border-radius: 8px;
    overflow: hidden;
  }
  .rules-header {
    background: #e74c3c;
    color: white;
    padding: 15px 20px;
    font-size: 1.1em;
    font-weight: 600;
  }
  .rules-content {
    padding: 25px;
    background: #fff5f5;
  }
  .rules-content h1, .rules-content h2, .rules-content h3 { color: #e74c3c; margin-top: 20px; }
  .rules-content table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  .rules-content th, .rules-content td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  .rules-content th { background: #f8f9fa; }
  .rules-content blockquote { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
  .rules-content pre { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 5px; overflow-x: auto; }
  .rules-content code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  .rules-content pre code { background: transparent; color: inherit; }
`;

// ============ 导航卡片配置 ============

interface NavCard {
  href: string;
  icon: string;
  title: string;
  desc: string;
  stats: string;
}

function getNavCards(prdTotal: number, storyTotal: number, cardStats: any, memoTotal: number, coverageStats: any): NavCard[] {
  return [
    { href: '/memos', icon: '💡', title: 'Strategic Memos', desc: 'Synthesized thinking, value propositions, and strategic analysis', stats: `Total: ${memoTotal} memos` },
    { href: '/prd', icon: '📋', title: 'PRD Documents', desc: 'Product Requirements Documents with detailed specifications', stats: `Total: ${prdTotal} documents` },
    { href: '/stories', icon: '📖', title: 'User Stories', desc: 'User stories linking business requirements to technical implementation', stats: `Total: ${storyTotal} stories` },
    { href: '/cards', icon: '🎯', title: 'Implementation Cards', desc: 'Technical implementation cards with API contracts', stats: `Total: ${cardStats.total} cards (${cardStats.byStatus.Done || 0} done)` },
    { href: '/sitemap', icon: '🗺️', title: 'Documentation Sitemap', desc: 'Hierarchical view of PRD → Story → Card relationships', stats: 'Complete project structure' },
    { href: '/graph', icon: '📊', title: 'Relationship Graph', desc: 'Interactive visual graph showing connections', stats: 'Click nodes to explore' },
    { href: '/compliance', icon: '✅', title: 'Compliance Dashboard', desc: 'Real-time documentation compliance audit', stats: 'Automated checking' },
    { href: '/coverage', icon: '📊', title: 'Test Coverage', desc: 'Test coverage metrics and Newman reports', stats: `${coverageStats.complete}/${coverageStats.total_prds} PRDs covered` },
    { href: '/docs', icon: '🔧', title: 'API Documentation', desc: 'Swagger UI with OpenAPI 3.0 specification', stats: 'Interactive explorer' },
    { href: '/architecture', icon: '🏗️', title: 'Product Architecture', desc: 'Multi-platform product flowcharts', stats: 'System overview' },
    { href: '/evaluation', icon: '🔍', title: 'Foundation Evaluation', desc: 'Ask the right questions to assess system health by role', stats: 'PM / Dev / QA / Tech Lead' },
    { href: '/tests', icon: '🧪', title: 'Test Collections', desc: 'Live test cases from Postman JSON (source of truth for AI)', stats: 'Searchable test inventory' },
    { href: '/ai-sitemap', icon: '🤖', title: 'AI Knowledge Base', desc: 'Machine-readable project knowledge (JSON) - enables AI context recovery', stats: 'Complete project state' },
  ];
}

// ============ Route Handler ============

/**
 * 处理 /project-docs 路由
 */
export function handleProjectDocs(_req: Request, res: Response): void {
  try {
    const prdStats = { total: loadPRDDocuments().length };
    const storyStats = { total: loadStoriesIndex().length };
    const cardStats = getCardStats();
    const memoStats = getMemoStats();
    const coverageStats = getCoverageStats();

    // 读取规则内容
    const rulesHtml = renderMarkdownFile('docs/reference/developer-rules.md');

    // 生成导航卡片
    const navCards = getNavCards(prdStats.total, storyStats.total, cardStats, memoStats.total, coverageStats);
    const navGridHtml = navCards.map(card => `
      <a href="${card.href}" class="nav-card">
        <h2>${card.icon} ${card.title}</h2>
        <p>${card.desc}</p>
        <div class="stats">${card.stats}</div>
      </a>
    `).join('');

    const coveragePercent = Math.round((coverageStats.complete / coverageStats.total_prds) * 100);

    const content = `
      <h1>📚 Documentation Hub</h1>
      <p class="subtitle">Browse product documentation, user stories, implementation cards, and test coverage</p>

      <div class="nav-grid">${navGridHtml}</div>

      <!-- AI Knowledge Base Explanation -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; margin-top: 30px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
        <h2 style="margin: 0 0 15px 0; display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.5em;">🤖</span> AI Project Knowledge Base
        </h2>
        <p style="margin: 0 0 15px 0; font-size: 1.1em; opacity: 0.95;">
          <strong>The <code style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">/ai-sitemap</code> endpoint is the machine-readable institutional knowledge of this project.</strong>
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
          <div>
            <h4 style="margin: 0 0 8px 0; opacity: 0.9;">🎯 The Problem</h4>
            <p style="margin: 0; opacity: 0.85; font-size: 0.95em;">AI context is ephemeral. Conversations reset. Knowledge is lost. Every new session starts from zero.</p>
          </div>
          <div>
            <h4 style="margin: 0 0 8px 0; opacity: 0.9;">✨ The Solution</h4>
            <p style="margin: 0; opacity: 0.85; font-size: 0.95em;">The project itself exposes its complete state as structured JSON. Any AI can understand the entire project in one request.</p>
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0;">🔄 AI Recovery Protocol</h4>
          <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 0.9em;">
            <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px;">1. Fetch /ai-sitemap</span>
            <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px;">2. Read project summary</span>
            <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px;">3. Navigate knowledge sources</span>
            <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px;">4. Follow verification guide</span>
          </div>
        </div>
        <p style="margin: 15px 0 0 0; font-size: 0.85em; opacity: 0.7;">
          This enables: AI Onboarding • Knowledge Continuity • Verification • External Integration
        </p>
      </div>

      <h2 style="margin-top: 30px; margin-bottom: 15px;">Overview Statistics</h2>
      <div class="stats-grid">
        <div class="stat-box"><h3>PRD Documents</h3><div class="number">${prdStats.total}</div></div>
        <div class="stat-box"><h3>User Stories</h3><div class="number">${storyStats.total}</div></div>
        <div class="stat-box"><h3>Implementation Cards</h3><div class="number">${cardStats.total}</div></div>
        <div class="stat-box"><h3>Test Coverage</h3><div class="number">${coveragePercent}%</div></div>
      </div>

      <div class="rules-section">
        <div class="rules-header">⚠️ Developer Maintenance Rules (MUST READ)</div>
        <div class="rules-content">${rulesHtml}</div>
      </div>
    `;

    const html = baseLayout({ title: 'Documentation Hub', styles: pageStyles }, content);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error loading documentation hub:', error);
    res.status(500).json({ error: 'Failed to load documentation hub' });
  }
}
