import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import { markdownToHtml, renderMarkdownFile } from '../../utils/markdown';
import { loadPRDDocuments, loadStoriesIndex } from '../../utils/prdParser';
import { getCardStats } from '../../utils/cardParser';
import { buildSitemap } from '../../utils/sitemapBuilder';
import { runComplianceAudit } from '../../utils/complianceAuditor';
import { loadTestCoverageData, getCoverageStats } from '../../utils/coverageParser';
import { loadAllTestCases, FeatureTestCases } from '../../utils/testCaseParser';
import { loadPRDCoverageWithTests, PRDCoverage } from '../../utils/acParser';
import { baseLayout, sharedStyles } from './templates/base';
import { componentStyles, pageHeader } from './templates/components';
import { projectDocsStyles } from './styles';
import {
  handlePrdList,
  handlePrdDetail,
  handlePrdStoryRedirect,
  handleCardsList,
  handleCardDetail,
  handleStoriesList,
  handleStoryDetail
} from './handlers';

// Generate detailed test cases for QA - loads from YAML files
function generateTestCasesHTML(): string {
  const allTestCases = loadAllTestCases();

  if (allTestCases.length === 0) {
    return '<p style="color: #666;">暂无测试用例数据。请在 docs/test-cases/ 目录下添加 YAML 文件。</p>';
  }

  return allTestCases.map((feature: FeatureTestCases) => `
    <div class="test-case-group">
      <div class="test-case-header" data-feature="${feature.prd_id}">
        <div>
          <span class="prd-badge">${feature.prd_id}</span>
          <h3>${feature.feature}</h3>
        </div>
        <div class="test-case-summary">
          <span class="case-count">${feature.test_cases.length} 个用例</span>
          <span class="toggle-arrow" id="arrow-tc-${feature.prd_id}">▶</span>
        </div>
      </div>
      <div class="test-case-body" id="body-tc-${feature.prd_id}">
        <p style="color: #666; margin-bottom: 15px; font-size: 0.9em;">${feature.description}</p>
        <div style="margin-bottom: 15px;">
          <code style="background: #2c3e50; color: #2ecc71; padding: 8px 12px; border-radius: 4px;">${feature.test_command}</code>
          <button class="copy-btn" data-cmd="${feature.test_command}" style="margin-left: 10px;">复制</button>
        </div>
        ${feature.test_cases.map(tc => `
          <div class="test-case-card priority-${tc.priority.toLowerCase()}">
            <div class="test-case-title">
              <span class="case-id">${tc.id}</span>
              <span class="case-name">${tc.name}</span>
              <span class="priority-badge ${tc.priority.toLowerCase()}">${tc.priority}</span>
            </div>

            <div class="test-case-section">
              <h5>📋 前置条件</h5>
              <ul>
                ${tc.preconditions.map(p => `<li>${p}</li>`).join('')}
              </ul>
            </div>

            <div class="test-case-section">
              <h5>🔢 测试步骤</h5>
              <ol>
                ${tc.steps.map(s => `<li>${s}</li>`).join('')}
              </ol>
            </div>

            <div class="test-case-section">
              <h5>✅ 预期结果</h5>
              <ul class="expected-list">
                ${tc.expected.map(e => `<li>${e}</li>`).join('')}
              </ul>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// Generate AC Coverage HTML - PRD → Card → AC hierarchy with test results
function generateACCoverageHTML(): string {
  const prdCoverage = loadPRDCoverageWithTests();

  if (prdCoverage.length === 0) {
    return '<p style="color: #666;">暂无 AC 覆盖数据。请确保 docs/cards/ 目录下有包含验收标准的 Card 文件。</p>';
  }

  // Calculate totals
  const totalACs = prdCoverage.reduce((sum, p) => sum + p.totalACs, 0);
  const testedACs = prdCoverage.reduce((sum, p) => sum + p.testedACs, 0);
  const totalPRDs = prdCoverage.filter(p => p.prdId !== 'Unknown').length;
  const overallCoverage = totalACs > 0 ? Math.round((testedACs / totalACs) * 100) : 0;

  return `
    <div class="ac-coverage-summary">
      <div class="ac-stat-row">
        <div class="ac-stat">
          <span class="ac-stat-number">${totalPRDs}</span>
          <span class="ac-stat-label">PRDs 有 AC</span>
        </div>
        <div class="ac-stat">
          <span class="ac-stat-number">${prdCoverage.reduce((sum, p) => sum + p.cards.length, 0)}</span>
          <span class="ac-stat-label">Cards 解析</span>
        </div>
        <div class="ac-stat">
          <span class="ac-stat-number">${totalACs}</span>
          <span class="ac-stat-label">验收标准 (AC)</span>
        </div>
        <div class="ac-stat">
          <span class="ac-stat-number coverage-${overallCoverage >= 80 ? 'high' : overallCoverage >= 50 ? 'medium' : 'low'}">${testedACs}/${totalACs}</span>
          <span class="ac-stat-label">已测试 (${overallCoverage}%)</span>
        </div>
      </div>
    </div>

    <div class="ac-coverage-intro">
      <p><strong>覆盖率公式：</strong>已测试的 AC 数 / PRD 总 AC 数 × 100%</p>
      <p><strong>数据来源：</strong>Card 文件 AC + Newman 测试报告 (reports/newman/prd-*.xml)</p>
    </div>

    <div class="ac-legend">
      <span class="legend-item"><span class="status-icon passed">✅</span> 测试通过</span>
      <span class="legend-item"><span class="status-icon failed">❌</span> 测试失败</span>
      <span class="legend-item"><span class="status-icon pending">⏸️</span> 待测试</span>
    </div>

    ${prdCoverage.filter(p => p.prdId !== 'Unknown').map(prd => `
      <div class="ac-prd-card">
        <div class="ac-prd-header" data-prd-ac="${prd.prdId}">
          <div class="ac-prd-title">
            <a href="/prd/${prd.prdId}" class="prd-link">${prd.prdId}</a>
            <span class="prd-name">${prd.prdTitle}</span>
          </div>
          <div class="ac-prd-stats">
            <span class="coverage-badge coverage-${prd.coveragePercent >= 80 ? 'high' : prd.coveragePercent >= 50 ? 'medium' : 'low'}">${prd.coveragePercent}%</span>
            <span class="ac-count">${prd.testedACs}/${prd.totalACs} ACs</span>
            ${prd.newmanStats ? `<span class="newman-badge" title="Newman: ${prd.newmanStats.passedAssertions}/${prd.newmanStats.totalAssertions} assertions">🧪 ${prd.newmanStats.totalRequests}req</span>` : ''}
            <span class="ac-cards-count">${prd.cards.length} Cards</span>
            <span class="toggle-arrow-ac" id="arrow-ac-${prd.prdId}">▼</span>
          </div>
        </div>
        <div class="ac-prd-body expanded" id="body-ac-${prd.prdId}">
          ${prd.newmanStats ? `
          <div class="newman-stats-bar">
            <span class="newman-stat"><strong>Requests:</strong> ${prd.newmanStats.totalRequests}</span>
            <span class="newman-stat"><strong>Assertions:</strong> ${prd.newmanStats.passedAssertions}/${prd.newmanStats.totalAssertions}</span>
            <span class="newman-stat ${prd.newmanStats.passRate === 100 ? 'pass' : 'warn'}"><strong>Pass Rate:</strong> ${prd.newmanStats.passRate}%</span>
          </div>
          ` : ''}
          ${prd.testCases && prd.testCases.length > 0 ? `
          <details class="test-cases-section">
            <summary class="test-cases-summary">🧪 测试用例 (${prd.testCases.length} tests)</summary>
            <div class="test-cases-list">
              ${prd.testCases.map(tc => `
              <div class="test-case-item">
                <div class="test-case-header-row">
                  <code class="method ${tc.method.toLowerCase()}">${tc.method}</code>
                  <span class="test-case-name">${tc.name}</span>
                </div>
                <div class="test-case-url"><code>${tc.url}</code></div>
                ${tc.body ? `
                <details class="test-case-body">
                  <summary>Request Body</summary>
                  <pre>${tc.body}</pre>
                </details>
                ` : ''}
                ${tc.assertions.length > 0 ? `
                <div class="test-case-assertions">
                  ${tc.assertions.map(a => `<span class="assertion">✓ ${a}</span>`).join('')}
                </div>
                ` : ''}
              </div>
              `).join('')}
            </div>
          </details>
          ` : ''}
          ${prd.cards.map(card => {
            const cardCoverage = card.totalACs > 0 ? Math.round((card.testedACs / card.totalACs) * 100) : 0;
            return `
            <div class="ac-card-section">
              <div class="ac-card-header">
                <a href="/cards/${card.cardSlug}" class="card-link">📋 ${card.cardName}</a>
                <span class="card-status ${card.status.toLowerCase()}">${card.status}</span>
                <span class="card-coverage coverage-${cardCoverage >= 80 ? 'high' : cardCoverage >= 50 ? 'medium' : 'low'}">${card.testedACs}/${card.totalACs} (${cardCoverage}%)</span>
              </div>
              ${card.oasPaths.length > 0 ? `
                <div class="ac-endpoints">
                  ${card.oasPaths.map(p => `<code class="endpoint">${p}</code>`).join('')}
                </div>
              ` : ''}
              <div class="ac-categories">
                ${card.categories.map(cat => `
                  <div class="ac-category">
                    <h5 class="ac-category-name">${cat.name}</h5>
                    <ul class="ac-list">
                      ${cat.acs.map(ac => `
                        <li class="ac-item ${ac.testStatus}">
                          <span class="ac-status-icon">${ac.testStatus === 'passed' ? '✅' : ac.testStatus === 'failed' ? '❌' : '⏸️'}</span>
                          <div class="ac-content">
                            <div class="ac-gwt">
                              <span class="gwt-given"><strong>Given</strong> ${ac.given}</span>
                              <span class="gwt-when"><strong>When</strong> ${ac.when}</span>
                              <span class="gwt-then"><strong>Then</strong> ${ac.then}</span>
                            </div>
                            ${ac.testId ? `<span class="ac-test-id">Test: ${ac.testId}</span>` : ''}
                          </div>
                        </li>
                      `).join('')}
                    </ul>
                  </div>
                `).join('')}
              </div>
            </div>
          `}).join('')}
        </div>
      </div>
    `).join('')}
  `;
}

const router = Router();

// ============ PRD Routes ============
router.get('/prd', handlePrdList);
router.get('/prd/:prdId', handlePrdDetail);
router.get('/prd/story/:storyId', handlePrdStoryRedirect);

// ============ Cards Routes ============
router.get('/cards', handleCardsList);
router.get('/cards/:cardSlug', handleCardDetail);

// ============ Stories Routes ============
router.get('/stories', handleStoriesList);
router.get('/stories/:storyId', handleStoryDetail);

// ============ Visualization Routes ============

router.get('/sitemap', (_req: Request, res: Response) => {
      try {
        const sitemap = buildSitemap();

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation Sitemap</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .nav-links {
      display: flex;
      gap: 15px;
      font-size: 0.9em;
    }
    .nav-links a {
      color: #3498db;
      text-decoration: none;
      padding: 5px 10px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .nav-links a:hover {
      background: #e8f4f8;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 30px;
    }
    .tree {
      margin-top: 20px;
    }
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>🗺️ Documentation Sitemap</h1>
        <p class="subtitle">Hierarchical view of PRD → Story → Card relationships</p>
      </div>
      <div class="nav-links">
        <a href="/project-docs">← Project Docs</a>
        <a href="/prd">PRDs</a>
        <a href="/stories">Stories</a>
        <a href="/cards">Cards</a>
      </div>
    </div>

    <div class="tree">`;

        sitemap.forEach(prd => {
          html += `
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
        });

        html += `
    </div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error building sitemap:', error);
        res.status(500).json({ error: 'Failed to build sitemap' });
      }
});

router.get('/graph', (_req: Request, res: Response) => {
      try {
        const sitemap = buildSitemap();

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relationship Graph</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .nav-links {
      display: flex;
      gap: 15px;
      font-size: 0.9em;
    }
    .nav-links a {
      color: #3498db;
      text-decoration: none;
      padding: 5px 10px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .nav-links a:hover {
      background: #e8f4f8;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 30px;
    }
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
    .status-In.Progress {
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relationship Graph</h1>
      <div class="nav-links">
        <a href="/project-docs">← Hub</a>
        <a href="/prd">PRDs</a>
        <a href="/stories">Stories</a>
        <a href="/cards">Cards</a>
        <a href="/sitemap">Sitemap</a>
      </div>
    </div>
    <p class="subtitle">Visual representation of PRD → Story → Card relationships</p>

    <div class="controls">
      <label>Filter by PRD:</label>
      <select id="prdFilter" onchange="filterByPRD(this.value)">
        <option value="">All PRDs</option>`;

        sitemap.forEach(prd => {
          html += `<option value="${prd.prd_id}">${prd.prd_id}: ${prd.title}</option>`;
        });

        html += `
      </select>
      <button onclick="resetFilter()" style="padding: 5px 15px; border: 1px solid #3498db; background: white; color: #3498db; border-radius: 4px; cursor: pointer; font-weight: 600;">Reset</button>
      <span style="margin-left: auto; color: #7f8c8d; font-size: 0.9em;">Click any node to highlight its connections</span>
    </div>

    <div class="graph-container">
      <div class="column">
        <div class="column-header">📋 PRDs</div>
        <div id="prd-column">`;

        sitemap.forEach(prd => {
          const storyCount = prd.stories.length;
          const cardCount = prd.stories.reduce((sum, story) => sum + story.cards.length, 0);

          html += `
          <div class="node prd-node" data-type="prd" data-id="${prd.prd_id}" onclick="highlightConnections('prd', '${prd.prd_id}')">
            <div class="node-title">${prd.prd_id}</div>
            <div class="node-subtitle">${prd.title}</div>
            <span class="node-status status-${prd.status.replace(/ /g, '.')}">${prd.status}</span>
            <div class="node-connections">
              ${storyCount} ${storyCount === 1 ? 'story' : 'stories'}, ${cardCount} ${cardCount === 1 ? 'card' : 'cards'}
            </div>
          </div>`;
        });

        html += `
        </div>
      </div>

      <div class="column">
        <div class="column-header">📖 User Stories</div>
        <div id="story-column">`;

        sitemap.forEach(prd => {
          prd.stories.forEach(story => {
            const cardCount = story.cards.length;
            html += `
          <div class="node story-node" data-type="story" data-id="${story.id}" data-prd="${prd.prd_id}" onclick="highlightConnections('story', '${story.id}')">
            <div class="node-title">${story.id}</div>
            <div class="node-subtitle">${story.title}</div>
            <span class="node-status status-${story.status.replace(/ /g, '.')}">${story.status}</span>
            <div class="node-connections">
              PRD: ${prd.prd_id} → ${cardCount} ${cardCount === 1 ? 'card' : 'cards'}
            </div>
          </div>`;
          });
        });

        html += `
        </div>
      </div>

      <div class="column">
        <div class="column-header">🎯 Implementation Cards</div>
        <div id="card-column">`;

        sitemap.forEach(prd => {
          prd.stories.forEach(story => {
            story.cards.forEach(card => {
              html += `
          <div class="node card-node" data-type="card" data-id="${card.slug}" data-story="${story.id}" data-prd="${prd.prd_id}" onclick="highlightConnections('card', '${card.slug}')">
            <div class="node-title">${card.slug}</div>
            <div class="node-subtitle">${card.title}</div>
            <span class="node-status status-${card.status.replace(/ /g, '.')}">${card.status}</span>
            <div class="node-connections">
              Story: ${story.id}
            </div>
          </div>`;
            });
          });
        });

        html += `
        </div>
      </div>
    </div>

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
    </div>

    <div class="stats-box">
      <div class="stat-item">
        <div class="stat-number">${sitemap.length}</div>
        <div class="stat-label">PRDs</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${sitemap.reduce((sum, prd) => sum + prd.stories.length, 0)}</div>
        <div class="stat-label">Stories</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${sitemap.reduce((sum, prd) => sum + prd.stories.reduce((s, story) => s + story.cards.length, 0), 0)}</div>
        <div class="stat-label">Cards</div>
      </div>
    </div>
  </div>

  <script>
    let currentHighlight = null;

    function highlightConnections(type, id) {
      const allNodes = document.querySelectorAll('.node');

      // If clicking the same node, reset
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
        // Highlight PRD itself
        const prdNode = document.querySelector('.prd-node[data-id="' + id + '"]');
        if (prdNode) {
          prdNode.classList.remove('dimmed');
          prdNode.classList.add('highlighted');
        }

        // Highlight related stories and cards
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

        // Highlight story itself
        storyNode.classList.remove('dimmed');
        storyNode.classList.add('highlighted');

        // Highlight parent PRD
        const prdNode = document.querySelector('.prd-node[data-id="' + prdId + '"]');
        if (prdNode) {
          prdNode.classList.remove('dimmed');
          prdNode.classList.add('highlighted');
        }

        // Highlight related cards
        document.querySelectorAll('.card-node[data-story="' + id + '"]').forEach(node => {
          node.classList.remove('dimmed');
          node.classList.add('highlighted');
        });
      } else if (type === 'card') {
        const cardNode = document.querySelector('.card-node[data-id="' + id + '"]');
        if (!cardNode) return;

        const storyId = cardNode.dataset.story;
        const prdId = cardNode.dataset.prd;

        // Highlight card itself
        cardNode.classList.remove('dimmed');
        cardNode.classList.add('highlighted');

        // Highlight parent story
        const storyNodeEl = document.querySelector('.story-node[data-id="' + storyId + '"]');
        if (storyNodeEl) {
          storyNodeEl.classList.remove('dimmed');
          storyNodeEl.classList.add('highlighted');
        }

        // Highlight parent PRD
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

      // Highlight selected PRD
      const prdNode = document.querySelector('.prd-node[data-id="' + prdId + '"]');
      if (prdNode) {
        prdNode.classList.remove('dimmed');
      }

      // Highlight related stories and cards
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
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error building relationship graph:', error);
        res.status(500).json({ error: 'Failed to build relationship graph' });
      }
});

router.get('/compliance', (_req: Request, res: Response) => {
      try {
        const report = runComplianceAudit();

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation Compliance Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #3498db;
    }
    h1 {
      color: #2c3e50;
      font-size: 2em;
    }
    .back-link {
      color: #3498db;
      text-decoration: none;
      font-weight: 500;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .score-card {
      text-align: center;
      padding: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }
    .score-number {
      font-size: 5em;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 10px;
    }
    .score-label {
      font-size: 1.2em;
      opacity: 0.9;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-box {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3498db;
    }
    .stat-box.error { border-left-color: #e74c3c; }
    .stat-box.warning { border-left-color: #f39c12; }
    .stat-box.success { border-left-color: #2ecc71; }
    .stat-title {
      font-size: 0.9em;
      color: #7f8c8d;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-value {
      font-size: 2.5em;
      font-weight: 700;
      color: #2c3e50;
    }
    .stat-subtitle {
      font-size: 0.9em;
      color: #7f8c8d;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 1.5em;
      color: #2c3e50;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e0e0e0;
    }
    .quick-wins {
      background: #e8f5e9;
      border-left: 4px solid #2ecc71;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }
    .quick-wins h3 {
      color: #27ae60;
      margin-bottom: 10px;
    }
    .quick-wins ul {
      list-style: none;
      padding: 0;
    }
    .quick-wins li {
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
    }
    .quick-wins li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #27ae60;
      font-weight: bold;
    }
    .violations-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      border-radius: 8px;
      overflow: hidden;
    }
    .violations-table th {
      background: #34495e;
      color: white;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85em;
      letter-spacing: 0.5px;
    }
    .violations-table td {
      padding: 15px;
      border-bottom: 1px solid #ecf0f1;
    }
    .violations-table tr:last-child td {
      border-bottom: none;
    }
    .violations-table tr:hover {
      background: #f8f9fa;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge.error {
      background: #ffebee;
      color: #c62828;
    }
    .badge.warning {
      background: #fff3e0;
      color: #ef6c00;
    }
    .file-path {
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      color: #7f8c8d;
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .fix-suggestion {
      background: #e3f2fd;
      padding: 10px;
      border-radius: 4px;
      margin-top: 8px;
      font-size: 0.9em;
    }
    .fix-suggestion strong {
      color: #1976d2;
    }
    .impact {
      color: #e74c3c;
      font-style: italic;
      margin-top: 5px;
      font-size: 0.9em;
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #95a5a6;
    }
    .empty-state h3 {
      font-size: 2em;
      margin-bottom: 10px;
    }
    .timestamp {
      text-align: right;
      color: #95a5a6;
      font-size: 0.9em;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Documentation Compliance Dashboard</h1>
      <a href="/project-docs" class="back-link">← Back to Docs Hub</a>
    </div>

    <div class="score-card">
      <div class="score-number">${report.overall_score}%</div>
      <div class="score-label">Overall Compliance Score</div>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-title">Total Files</div>
        <div class="stat-value">${report.total_files}</div>
        <div class="stat-subtitle">${report.stats.prds.total} PRDs · ${report.stats.stories.total} Stories · ${report.stats.cards.total} Cards</div>
      </div>
      <div class="stat-box error">
        <div class="stat-title">Critical Issues</div>
        <div class="stat-value">${report.summary.critical_issues}</div>
        <div class="stat-subtitle">Errors that must be fixed</div>
      </div>
      <div class="stat-box warning">
        <div class="stat-title">Warnings</div>
        <div class="stat-value">${report.summary.warnings}</div>
        <div class="stat-subtitle">Issues to address</div>
      </div>
      <div class="stat-box success">
        <div class="stat-title">Compliant Files</div>
        <div class="stat-value">${report.stats.prds.compliant + report.stats.stories.compliant + report.stats.cards.compliant}</div>
        <div class="stat-subtitle">Following all rules</div>
      </div>
    </div>`;

        if (report.summary.quick_wins.length > 0) {
          html += `
    <div class="quick-wins">
      <h3>🚀 Quick Wins (Fix These First)</h3>
      <ul>`;
          report.summary.quick_wins.forEach(win => {
            html += `<li>${win}</li>`;
          });
          html += `
      </ul>
    </div>`;
        }

        if (report.violations.length > 0) {
          html += `
    <div class="section">
      <h2 class="section-title">Compliance Violations (${report.violations.length})</h2>
      <table class="violations-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Category</th>
            <th>File</th>
            <th>Issue & Fix</th>
          </tr>
        </thead>
        <tbody>`;

          report.violations.forEach(v => {
            html += `
          <tr>
            <td><span class="badge ${v.type}">${v.type}</span></td>
            <td>${v.category}</td>
            <td><span class="file-path">${v.file}</span></td>
            <td>
              <strong>Issue:</strong> ${v.issue}
              <div class="fix-suggestion">
                <strong>Fix:</strong> ${v.fix}
              </div>
              <div class="impact">⚠️ Impact: ${v.impact}</div>
            </td>
          </tr>`;
          });

          html += `
        </tbody>
      </table>
    </div>`;
        } else {
          html += `
    <div class="empty-state">
      <h3>🎉 Perfect Compliance!</h3>
      <p>All documentation follows the standards. Great work!</p>
    </div>`;
        }

        html += `
    <div class="timestamp">
      Last updated: ${new Date(report.timestamp).toLocaleString()}
    </div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error generating compliance report:', error);
        res.status(500).json({ error: 'Failed to generate compliance report' });
      }
});

router.get('/architecture', (_req: Request, res: Response) => {
      try {
        const filePath = path.join(process.cwd(), 'docs', 'product-architecture-flowchart.md');

        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'Architecture document not found' });
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract title from first H1
        const titleMatch = content.match(/^# (.+)$/m);
        const title = titleMatch ? titleMatch[1] : 'Product Architecture';

        // Convert markdown to HTML with Mermaid support
        let htmlContent = content;

        // Extract and preserve code blocks first
        const codeBlocks: string[] = [];
        let mermaidBlockCount = 0;
        htmlContent = htmlContent.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
          const index = codeBlocks.length;
          if (lang === 'mermaid') {
            mermaidBlockCount++;
            const mermaidCode = code.trim();
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/73d11adb-3f0a-41a0-938a-bc91c91fadce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.ts:2970',message:'Mermaid block extracted',data:{blockIndex:index,mermaidBlockCount,codeLength:mermaidCode.length,codePreview:mermaidCode.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            codeBlocks.push(`<div class="mermaid">\n${mermaidCode}\n</div>`);
          } else {
            codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
          }
          return `\n__CODE_BLOCK_${index}__\n`;
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/73d11adb-3f0a-41a0-938a-bc91c91fadce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.ts:2976',message:'Total mermaid blocks found',data:{totalMermaidBlocks:mermaidBlockCount,totalCodeBlocks:codeBlocks.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        // Escape remaining HTML
        htmlContent = htmlContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        // Headers
        htmlContent = htmlContent.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        htmlContent = htmlContent.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        htmlContent = htmlContent.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        htmlContent = htmlContent.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Bold and Italic
        htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        htmlContent = htmlContent.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Inline code
        htmlContent = htmlContent.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Links
        htmlContent = htmlContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Blockquotes
        htmlContent = htmlContent.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>');

        // Horizontal rules
        htmlContent = htmlContent.replace(/^---$/gim, '<hr>');

        // Tables
        htmlContent = htmlContent.replace(/^\|(.+)\|$/gim, (match) => {
          const cells = match.split('|').filter(c => c.trim());
          if (cells.every(c => /^[-:]+$/.test(c.trim()))) {
            return ''; // Skip separator row
          }
          const row = cells.map(c => `<td>${c.trim()}</td>`).join('');
          return `<tr>${row}</tr>`;
        });
        htmlContent = htmlContent.replace(/(<tr>.*<\/tr>\n?)+/g, '<table class="data-table">$&</table>');

        // Paragraphs - but not around code block placeholders
        htmlContent = htmlContent.replace(/\n\n(?!__CODE_BLOCK)/g, '</p>\n<p>');
        htmlContent = '<p>' + htmlContent + '</p>';
        htmlContent = htmlContent.replace(/<p>\s*<(h[1-4]|table|blockquote|hr)/g, '<$1');
        htmlContent = htmlContent.replace(/<\/(h[1-4]|table|blockquote)>\s*<\/p>/g, '</$1>');
        htmlContent = htmlContent.replace(/<p>\s*__CODE_BLOCK_/g, '__CODE_BLOCK_');
        htmlContent = htmlContent.replace(/__CODE_BLOCK_(\d+)__\s*<\/p>/g, '__CODE_BLOCK_$1__');
        htmlContent = htmlContent.replace(/<p>\s*<\/p>/g, '');

        // Restore code blocks AFTER all other processing
        codeBlocks.forEach((block, index) => {
          htmlContent = htmlContent.replace(`__CODE_BLOCK_${index}__`, block);
          // #region agent log
          if (block.includes('class="mermaid"')) {
            const blockPreview = block.substring(0, 200).replace(/\n/g, '\\n');
            const hasNewlines = block.includes('\n');
            fetch('http://127.0.0.1:7242/ingest/73d11adb-3f0a-41a0-938a-bc91c91fadce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.ts:3036',message:'Mermaid block restored to HTML',data:{blockIndex:index,blockLength:block.length,hasMermaidClass:block.includes('class="mermaid"'),hasNewlines,blockPreview},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          }
          // #endregion
        });

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js" onload="window.mermaidScriptLoaded = true;"></script>
  <style>
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
  </style>
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

  <script>
    // #region agent log
    console.log('[DEBUG] Script execution started');
    console.log('[DEBUG] Document ready state:', document.readyState);
    console.log('[DEBUG] Mermaid divs found:', document.querySelectorAll('.mermaid').length);
    // #endregion
    
    function initMermaid() {
      // #region agent log
      console.log('[DEBUG] initMermaid called');
      console.log('[DEBUG] typeof mermaid:', typeof mermaid);
      console.log('[DEBUG] window.mermaidScriptLoaded:', window.mermaidScriptLoaded);
      const mermaidDivs = document.querySelectorAll('.mermaid');
      console.log('[DEBUG] Mermaid divs found:', mermaidDivs.length);
      if (mermaidDivs.length > 0) {
        console.log('[DEBUG] First mermaid div content preview:', mermaidDivs[0].textContent.substring(0, 100));
      }
      // #endregion
      
      if (typeof mermaid !== 'undefined') {
        try {
          // #region agent log
          console.log('[DEBUG] Initializing Mermaid...');
          // #endregion
          // Initialize without startOnLoad since we'll manually run
          mermaid.initialize({ startOnLoad: false, theme: 'default' });
          // #region agent log
          console.log('[DEBUG] Mermaid initialized, now running render...');
          // #endregion
          
          // Manually run to render all diagrams
          mermaid.run({
            querySelector: '.mermaid',
            postRenderCallback: function(id) {
              // #region agent log
              console.log('[DEBUG] Mermaid diagram rendered:', id);
              // #endregion
            }
          }).then(function() {
            // #region agent log
            const rendered = document.querySelectorAll('.mermaid svg').length;
            console.log('[DEBUG] Mermaid.run() completed. Rendered diagrams:', rendered);
            // #endregion
          }).catch(function(error) {
            // #region agent log
            console.error('[DEBUG] Mermaid.run() error:', error);
            // #endregion
          });
          
          return true;
        } catch (error) {
          // #region agent log
          console.error('[DEBUG] Mermaid initialization error:', error);
          // #endregion
          return false;
        }
      } else {
        // #region agent log
        console.error('[DEBUG] Mermaid library not loaded yet');
        // #endregion
        return false;
      }
    }
    
    function waitForMermaidAndInit() {
      // #region agent log
      console.log('[DEBUG] waitForMermaidAndInit called');
      console.log('[DEBUG] typeof mermaid:', typeof mermaid);
      console.log('[DEBUG] window.mermaidScriptLoaded:', window.mermaidScriptLoaded);
      // #endregion
      
      if (typeof mermaid !== 'undefined' || window.mermaidScriptLoaded) {
        if (initMermaid()) {
          // #region agent log
          console.log('[DEBUG] Mermaid initialized successfully');
          // #endregion
          return;
        }
      }
      
      // Poll until Mermaid is loaded
      const maxAttempts = 50;
      let attempts = 0;
      const pollInterval = setInterval(function() {
        attempts++;
        // #region agent log
        if (attempts % 10 === 0) {
          console.log('[DEBUG] Polling attempt', attempts, 'typeof mermaid:', typeof mermaid);
        }
        // #endregion
        
        if (typeof mermaid !== 'undefined') {
          clearInterval(pollInterval);
          initMermaid();
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          // #region agent log
          console.error('[DEBUG] Mermaid failed to load after', maxAttempts, 'attempts');
          // #endregion
        }
      }, 100);
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        // #region agent log
        console.log('[DEBUG] DOMContentLoaded fired');
        // #endregion
        waitForMermaidAndInit();
      });
    } else {
      // DOM already loaded
      // #region agent log
      console.log('[DEBUG] DOM already loaded');
      // #endregion
      waitForMermaidAndInit();
    }
    
    // Also listen for script load event as backup
    window.addEventListener('load', function() {
      // #region agent log
      console.log('[DEBUG] window.load event fired');
      // #endregion
      if (typeof mermaid !== 'undefined' && document.querySelectorAll('.mermaid svg').length === 0) {
        // #region agent log
        console.log('[DEBUG] Window loaded but diagrams not rendered, retrying');
        // #endregion
        initMermaid();
      }
});
  </script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error loading architecture document:', error);
        res.status(500).json({ error: 'Failed to load architecture document' });
      }
});

router.get('/coverage', (_req: Request, res: Response) => {
      try {
        const coverageData = loadTestCoverageData();
        const coverageStats = getCoverageStats();

        if (!coverageData || !coverageData.coverage_registry) {
          return res.status(404).json({ error: 'Coverage data not found' });
        }

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Coverage</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .nav-links {
      display: flex;
      gap: 15px;
      font-size: 0.9em;
    }
    .nav-links a {
      color: #3498db;
      text-decoration: none;
      padding: 5px 10px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .nav-links a:hover {
      background: #e8f4f8;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 20px;
    }
    .stats-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-box {
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border: 1px solid #e9ecef;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .stat-box:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }
    .stat-box .icon {
      font-size: 2em;
      margin-bottom: 10px;
      display: block;
    }
    .stat-box h3 {
      font-size: 0.8em;
      color: #6c757d;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .stat-box .number {
      font-size: 2.2em;
      font-weight: 700;
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-box.success .number {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-box.speed .number {
      background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-box .subtitle {
      font-size: 0.75em;
      color: #adb5bd;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #2c3e50;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .status-indicator {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .status-indicator.complete {
      background: #d4edda;
      color: #155724;
    }
    .status-indicator.partial {
      background: #fff3cd;
      color: #856404;
    }
    .status-indicator.draft {
      background: #e0e0e0;
      color: #666;
    }
    a {
      color: #3498db;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    /* PRD Detail Card styles (kept for reference, may be removed later) */
    .prd-detail-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .prd-detail-header {
      background: linear-gradient(135deg, #f8f9fa 0%, #e8f4f8 100%);
      padding: 20px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .prd-detail-header:hover {
      background: linear-gradient(135deg, #e8f4f8 0%, #d4edda 100%);
    }
    .prd-detail-header h3 {
      color: #2c3e50;
      margin: 0;
    }
    .prd-detail-body {
      padding: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out, padding 0.3s ease-out;
    }
    .prd-detail-body.expanded {
      padding: 20px;
      max-height: 2000px;
    }
    .feature-group {
      margin-bottom: 20px;
    }
    .feature-group h4 {
      color: #3498db;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e0e0e0;
    }
    .scenario-list {
      list-style: none;
      padding: 0;
    }
    .scenario-list li {
      padding: 8px 12px;
      margin: 4px 0;
      background: #f8f9fa;
      border-radius: 4px;
      font-size: 0.95em;
    }
    .scenario-list li.pass {
      border-left: 3px solid #28a745;
    }
    .scenario-list li.pending {
      border-left: 3px solid #ffc107;
    }
    .progress-bar {
      background: #e0e0e0;
      border-radius: 10px;
      height: 20px;
      overflow: hidden;
      margin: 10px 0;
    }
    .progress-fill {
      background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
      height: 100%;
      border-radius: 10px;
      transition: width 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.85em;
    }
    .api-status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 10px;
    }
    .api-status-item {
      padding: 10px 15px;
      background: #f8f9fa;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .api-status-item code {
      background: #2c3e50;
      color: #fff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.85em;
    }
    .api-status-item .badge {
      font-size: 0.8em;
      padding: 2px 8px;
      border-radius: 10px;
      background: #d4edda;
      color: #155724;
    }
    .quick-start {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
    }
    .quick-start h3 {
      color: #3498db;
      margin-bottom: 15px;
    }
    .quick-start pre {
      background: #1a252f;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.9em;
    }
    .quick-start code {
      color: #2ecc71;
    }
    .coverage-notes {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 15px;
      margin-top: 15px;
    }
    .coverage-notes h5 {
      color: #856404;
      margin-bottom: 10px;
    }
    .toggle-arrow {
      transition: transform 0.3s;
    }
    .toggle-arrow.expanded {
      transform: rotate(90deg);
    }
    /* QA Guide Styles */
    .qa-guide-section {
      max-width: 1000px;
    }
    .step-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    .step-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }
    .step-number {
      width: 40px;
      height: 40px;
      background: white;
      color: #667eea;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5em;
      font-weight: bold;
      margin: 0 auto 15px;
    }
    .step-card h3 {
      margin-bottom: 10px;
      font-size: 1.1em;
    }
    .step-card p {
      opacity: 0.9;
      font-size: 0.9em;
    }
    .qa-quick-commands {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 12px;
      margin: 20px 0;
    }
    .qa-quick-commands h3 {
      margin-bottom: 15px;
      color: #2c3e50;
    }
    .command-table {
      width: 100%;
      border-collapse: collapse;
    }
    .command-table th, .command-table td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    .command-table th {
      background: #e9ecef;
      font-weight: 600;
    }
    .command-table code {
      background: #2c3e50;
      color: #2ecc71;
      padding: 4px 10px;
      border-radius: 4px;
      font-family: 'Monaco', monospace;
    }
    .copy-btn {
      background: #3498db;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85em;
      transition: all 0.2s;
    }
    .copy-btn:hover {
      background: #2980b9;
    }
    .copy-btn.copied {
      background: #27ae60;
    }
    .qa-workflow {
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 25px;
      margin: 20px 0;
    }
    .qa-workflow h3 {
      margin-bottom: 20px;
      color: #2c3e50;
    }
    .workflow-steps {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }
    .workflow-step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      flex: 1;
      min-width: 180px;
    }
    .workflow-icon {
      font-size: 1.5em;
    }
    .workflow-step strong {
      display: block;
      margin-bottom: 5px;
      color: #2c3e50;
    }
    .workflow-step p {
      font-size: 0.85em;
      color: #666;
      margin: 0;
    }
    .workflow-step code {
      background: #2c3e50;
      color: #2ecc71;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
    }
    .workflow-arrow {
      font-size: 1.5em;
      color: #3498db;
      font-weight: bold;
    }
    .qa-tips {
      background: #e8f4f8;
      padding: 25px;
      border-radius: 12px;
      margin: 20px 0;
    }
    .qa-tips h3 {
      margin-bottom: 15px;
      color: #2c3e50;
    }
    .qa-tips details {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
      cursor: pointer;
    }
    .qa-tips summary {
      font-weight: 600;
      color: #3498db;
    }
    .qa-tips details p {
      margin-top: 10px;
      color: #666;
      padding-left: 10px;
      border-left: 3px solid #3498db;
    }
    /* Feature Mapping Styles */
    .feature-search {
      margin-bottom: 20px;
    }
    .feature-search input {
      width: 100%;
      padding: 15px 20px;
      font-size: 1em;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      outline: none;
      transition: border-color 0.2s;
    }
    .feature-search input:focus {
      border-color: #3498db;
    }
    .feature-mapping-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    .feature-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;
    }
    .feature-card:hover {
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    .feature-card.hidden {
      display: none;
    }
    .feature-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .feature-card h4 {
      color: #2c3e50;
      margin: 0;
      font-size: 1.1em;
    }
    .feature-card .prd-badge {
      background: #3498db;
      color: white;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.8em;
      font-weight: 600;
    }
    .feature-card .description {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 15px;
      line-height: 1.5;
    }
    .feature-card .test-info {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    .feature-card .test-info span {
      display: block;
      font-size: 0.85em;
      color: #666;
    }
    .feature-card .test-info strong {
      color: #27ae60;
    }
    .feature-card .test-command {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .feature-card .test-command code {
      flex: 1;
      background: #2c3e50;
      color: #2ecc71;
      padding: 10px 15px;
      border-radius: 6px;
      font-family: 'Monaco', monospace;
      font-size: 0.85em;
    }
    .feature-keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 10px;
    }
    .keyword-tag {
      background: #e8f4f8;
      color: #3498db;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75em;
    }
    /* Test Case Styles */
    .test-case-group {
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .test-case-header {
      background: linear-gradient(135deg, #f8f9fa 0%, #e8f4f8 100%);
      padding: 20px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .test-case-header:hover {
      background: linear-gradient(135deg, #e8f4f8 0%, #d4edda 100%);
    }
    .test-case-header h3 {
      display: inline;
      color: #2c3e50;
      margin-left: 10px;
      font-size: 1.1em;
    }
    .test-case-summary {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .case-count {
      background: #3498db;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
    }
    .test-case-body {
      padding: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out, padding 0.3s ease-out;
    }
    .test-case-body.expanded {
      padding: 20px;
      max-height: 5000px;
    }
    .test-case-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
      border-left: 4px solid #3498db;
    }
    .test-case-card.priority-p0 {
      border-left-color: #e74c3c;
    }
    .test-case-card.priority-p1 {
      border-left-color: #f39c12;
    }
    .test-case-card.priority-p2 {
      border-left-color: #27ae60;
    }
    .test-case-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    .case-id {
      background: #2c3e50;
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      font-family: 'Monaco', monospace;
      font-size: 0.85em;
    }
    .case-name {
      font-weight: 600;
      color: #2c3e50;
      font-size: 1.1em;
      flex: 1;
    }
    .priority-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.8em;
      font-weight: 600;
    }
    .priority-badge.p0 {
      background: #fce4e4;
      color: #e74c3c;
    }
    .priority-badge.p1 {
      background: #fef5e7;
      color: #f39c12;
    }
    .priority-badge.p2 {
      background: #e8f8f5;
      color: #27ae60;
    }
    .test-case-section {
      margin-bottom: 15px;
    }
    .test-case-section h5 {
      color: #3498db;
      margin-bottom: 8px;
      font-size: 0.95em;
    }
    .test-case-section ul, .test-case-section ol {
      margin-left: 20px;
      color: #555;
    }
    .test-case-section li {
      margin: 5px 0;
      line-height: 1.5;
    }
    .expected-list li {
      color: #27ae60;
    }
    /* AC Coverage Styles */
    .ac-coverage-header {
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      margin-bottom: 25px;
    }
    .ac-coverage-header h2 { margin-bottom: 10px; }
    .ac-coverage-header p { opacity: 0.9; }
    .ac-coverage-summary {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .ac-stat-row {
      display: flex;
      gap: 30px;
      justify-content: center;
    }
    .ac-stat {
      text-align: center;
    }
    .ac-stat-number {
      display: block;
      font-size: 2.5em;
      font-weight: 700;
      color: #3498db;
    }
    .ac-stat-label {
      color: #666;
      font-size: 0.9em;
    }
    .ac-coverage-intro {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 25px;
    }
    .ac-coverage-intro p { margin: 5px 0; color: #856404; font-size: 0.9em; }
    .ac-legend {
      display: flex;
      gap: 25px;
      margin-bottom: 20px;
      padding: 10px 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9em;
      color: #666;
    }
    .coverage-badge {
      padding: 4px 12px;
      border-radius: 15px;
      font-size: 0.85em;
      font-weight: 700;
    }
    .coverage-high { background: #d4edda; color: #155724; }
    .coverage-medium { background: #fff3cd; color: #856404; }
    .coverage-low { background: #f8d7da; color: #721c24; }
    .card-coverage {
      margin-left: auto;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.8em;
      font-weight: 600;
    }
    .ac-test-id {
      display: inline-block;
      background: #e3f2fd;
      color: #1565c0;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75em;
      margin-top: 5px;
    }
    .ac-prd-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .ac-prd-header {
      background: linear-gradient(135deg, #f8f9fa 0%, #e8f4f8 100%);
      padding: 20px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ac-prd-header:hover {
      background: linear-gradient(135deg, #e8f4f8 0%, #d4edda 100%);
    }
    .ac-prd-title {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .prd-link {
      background: #3498db;
      color: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 600;
      text-decoration: none;
      font-size: 0.9em;
    }
    .prd-link:hover { background: #2980b9; text-decoration: none; }
    .prd-name { color: #2c3e50; font-weight: 600; font-size: 1.1em; }
    .ac-prd-stats {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .ac-count {
      background: #27ae60;
      color: white;
      padding: 4px 12px;
      border-radius: 15px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .ac-cards-count {
      background: #9b59b6;
      color: white;
      padding: 4px 12px;
      border-radius: 15px;
      font-size: 0.85em;
    }
    .newman-badge {
      background: #17a2b8;
      color: white;
      padding: 4px 12px;
      border-radius: 15px;
      font-size: 0.85em;
      cursor: help;
    }
    .newman-stats-bar {
      display: flex;
      gap: 20px;
      background: #f8f9fa;
      padding: 10px 15px;
      border-radius: 6px;
      margin-bottom: 15px;
      font-size: 0.9em;
      border-left: 3px solid #17a2b8;
    }
    .newman-stat { color: #495057; }
    .newman-stat.pass { color: #28a745; font-weight: 600; }
    .newman-stat.warn { color: #ffc107; font-weight: 600; }
    .toggle-arrow-ac {
      font-size: 1.2em;
      transition: transform 0.3s;
    }
    .toggle-arrow-ac.collapsed { transform: rotate(-90deg); }
    .ac-prd-body {
      padding: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s, padding 0.3s;
    }
    .ac-prd-body.expanded {
      padding: 20px;
      max-height: 5000px;
    }
    .ac-card-section {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .ac-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    .card-link {
      font-weight: 600;
      color: #2c3e50;
      text-decoration: none;
    }
    .card-link:hover { color: #3498db; }
    .card-status {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 600;
    }
    .card-status.done { background: #d4edda; color: #155724; }
    .card-status.in_progress, .card-status.in-progress { background: #fff3cd; color: #856404; }
    .card-status.draft { background: #e0e0e0; color: #666; }
    .card-ac-count {
      margin-left: auto;
      color: #666;
      font-size: 0.85em;
    }
    .ac-endpoints {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 15px;
    }
    .ac-endpoints code.endpoint {
      background: #2c3e50;
      color: #2ecc71;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.8em;
    }
    .ac-category { margin-bottom: 15px; }
    .ac-category-name {
      color: #3498db;
      font-size: 0.95em;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px dashed #e0e0e0;
    }
    .ac-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .ac-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px;
      margin: 5px 0;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 3px solid #e0e0e0;
    }
    .ac-item.passed { border-left-color: #27ae60; }
    .ac-item.failed { border-left-color: #dc3545; }
    .ac-item.pending { border-left-color: #ffc107; }
    .ac-status-icon { font-size: 1em; }
    .ac-content { flex: 1; }
    .ac-gwt {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.9em;
    }
    .gwt-given, .gwt-when, .gwt-then {
      display: block;
      padding: 2px 0;
    }
    .gwt-given strong { color: #9b59b6; }
    .gwt-when strong { color: #3498db; }
    .gwt-then strong { color: #27ae60; }
    /* Test Case Details Styles */
    .test-case-details {
      margin-top: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }
    .test-case-header-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .test-case-badge {
      background: #17a2b8;
      color: white;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.8em;
      font-weight: 600;
    }
    .test-case-name {
      font-weight: 500;
      color: #495057;
      font-size: 0.9em;
    }
    .test-case-request {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .test-case-request .method {
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.8em;
    }
    .test-case-request .method.get { background: #61affe; color: white; }
    .test-case-request .method.post { background: #49cc90; color: white; }
    .test-case-request .method.put { background: #fca130; color: white; }
    .test-case-request .method.delete { background: #f93e3e; color: white; }
    .test-case-request .url {
      background: #2c3e50;
      color: #2ecc71;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 0.85em;
    }
    .test-case-body {
      margin: 8px 0;
    }
    .test-case-body summary {
      cursor: pointer;
      color: #6c757d;
      font-size: 0.85em;
      padding: 4px 0;
    }
    .test-case-body pre {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 10px;
      border-radius: 4px;
      font-size: 0.8em;
      overflow-x: auto;
      margin-top: 5px;
    }
    .test-case-assertions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    .assertions-label {
      font-size: 0.8em;
      color: #6c757d;
      font-weight: 500;
    }
    .assertion {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75em;
      display: block;
      margin: 2px 0;
    }
    /* Test Cases Section at PRD level */
    .test-cases-section {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .test-cases-summary {
      padding: 12px 15px;
      cursor: pointer;
      font-weight: 600;
      color: #17a2b8;
      background: #e3f2fd;
      border-radius: 8px;
    }
    .test-cases-summary:hover {
      background: #bbdefb;
    }
    .test-cases-section[open] .test-cases-summary {
      border-radius: 8px 8px 0 0;
    }
    .test-cases-list {
      padding: 15px;
      display: grid;
      gap: 12px;
    }
    .test-case-item {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 12px;
    }
    .test-case-url code {
      background: #2c3e50;
      color: #2ecc71;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.85em;
      display: inline-block;
      margin: 8px 0;
    }
    .test-cases-intro {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      margin-bottom: 25px;
    }
    .test-cases-intro h2 {
      margin-bottom: 10px;
    }
    .test-cases-intro p {
      opacity: 0.9;
      margin-bottom: 15px;
    }
    .test-cases-legend {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.2);
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.9em;
    }
    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }
    .legend-color.p0 { background: #e74c3c; }
    .legend-color.p1 { background: #f39c12; }
    .legend-color.p2 { background: #27ae60; }
    @media (max-width: 768px) {
      .step-cards {
        grid-template-columns: 1fr;
      }
      .workflow-steps {
        flex-direction: column;
      }
      .workflow-arrow {
        transform: rotate(90deg);
      }
      .test-case-title {
        flex-wrap: wrap;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>📊 Test Coverage</h1>
        <p class="subtitle">Test coverage metrics and Newman test reports</p>
      </div>
      <div class="nav-links">
        <a href="/project-docs">← Project Docs</a>
        <a href="/prd">PRDs</a>
      </div>
    </div>

    <div class="stats-summary">
      <div class="stat-box">
        <span class="icon">📦</span>
        <h3>Total PRDs</h3>
        <div class="number">${coverageStats.total_prds}</div>
        <div class="subtitle">Product requirements</div>
      </div>
      <div class="stat-box success">
        <span class="icon">✅</span>
        <h3>Fully Covered</h3>
        <div class="number">${coverageStats.complete}</div>
        <div class="subtitle">100% test coverage</div>
      </div>
      <div class="stat-box">
        <span class="icon">📋</span>
        <h3>Test Requests</h3>
        <div class="number">${coverageStats.total_requests}</div>
        <div class="subtitle">API calls executed</div>
      </div>
      <div class="stat-box">
        <span class="icon">✓</span>
        <h3>Assertions</h3>
        <div class="number">${coverageStats.total_assertions}</div>
        <div class="subtitle">Validations performed</div>
      </div>
      <div class="stat-box success">
        <span class="icon">🎯</span>
        <h3>Success Rate</h3>
        <div class="number">${coverageStats.pass_rate}</div>
        <div class="subtitle">All tests passing</div>
      </div>
      <div class="stat-box speed">
        <span class="icon">⚡</span>
        <h3>Response Time</h3>
        <div class="number">${coverageData.coverage_summary?.test_statistics?.avg_response_time || '<500ms'}</div>
        <div class="subtitle">Average latency</div>
      </div>
    </div>

    <!-- Unified Coverage View -->
    <div class="ac-coverage-header">
      <h2>📋 测试覆盖率总览</h2>
      <p>PRD → Card → AC 层级结构，展示验收标准覆盖状态与 Newman 测试结果</p>
    </div>
    ${generateACCoverageHTML()}


  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // AC Coverage PRD toggle
      document.querySelectorAll('.ac-prd-header[data-prd-ac]').forEach(function(header) {
        header.addEventListener('click', function(e) {
          if (e.target.classList.contains('prd-link')) return; // Don't toggle when clicking link
          var prdId = this.getAttribute('data-prd-ac');
          var body = document.getElementById('body-ac-' + prdId);
          var arrow = document.getElementById('arrow-ac-' + prdId);
          body.classList.toggle('expanded');
          arrow.classList.toggle('collapsed');
        });
      });

      // Copy button functionality
      document.querySelectorAll('.copy-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var cmd = this.getAttribute('data-cmd');
          var button = this;
          navigator.clipboard.writeText(cmd).then(function() {
            var originalText = button.textContent;
            button.textContent = '已复制!';
            button.classList.add('copied');
            setTimeout(function() {
              button.textContent = originalText;
              button.classList.remove('copied');
            }, 2000);
          }).catch(function(err) {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制命令');
          });
        });
      });

    });
  </script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error loading coverage data:', error);
        res.status(500).json({ error: 'Failed to load coverage data' });
      }
});

// Documentation Hub - Main landing page
router.get('/project-docs', (_req, res) => {
  try {
    const prdStats = { total: loadPRDDocuments().length };
    const storyStats = { total: loadStoriesIndex().length };
    const cardStats = getCardStats();
    const coverageStats = getCoverageStats();

    // 读取规则内容（从 markdown 文件）
    const rulesHtml = renderMarkdownFile('docs/reference/developer-rules.md');

    // 页面专用样式
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

    // 导航卡片配置
    const navCards = [
      { href: '/prd', icon: '📋', title: 'PRD Documents', desc: 'Product Requirements Documents with detailed specifications', stats: `Total: ${prdStats.total} documents` },
      { href: '/stories', icon: '📖', title: 'User Stories', desc: 'User stories linking business requirements to technical implementation', stats: `Total: ${storyStats.total} stories` },
      { href: '/cards', icon: '🎯', title: 'Implementation Cards', desc: 'Technical implementation cards with API contracts', stats: `Total: ${cardStats.total} cards (${cardStats.byStatus.Done || 0} done)` },
      { href: '/sitemap', icon: '🗺️', title: 'Documentation Sitemap', desc: 'Hierarchical view of PRD → Story → Card relationships', stats: 'Complete project structure' },
      { href: '/graph', icon: '📊', title: 'Relationship Graph', desc: 'Interactive visual graph showing connections', stats: 'Click nodes to explore' },
      { href: '/compliance', icon: '✅', title: 'Compliance Dashboard', desc: 'Real-time documentation compliance audit', stats: 'Automated checking' },
      { href: '/coverage', icon: '📊', title: 'Test Coverage', desc: 'Test coverage metrics and Newman reports', stats: `${coverageStats.complete}/${coverageStats.total_prds} PRDs covered` },
      { href: '/docs', icon: '🔧', title: 'API Documentation', desc: 'Swagger UI with OpenAPI 3.0 specification', stats: 'Interactive explorer' },
      { href: '/architecture', icon: '🏗️', title: 'Product Architecture', desc: 'Multi-platform product flowcharts', stats: 'System overview' },
    ];

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
});

// ============ Directus PRD Viewer ============
const DIRECTUS_URL = 'https://orq-dev.synque.ca';
const DIRECTUS_FOLDER_ID = '275971c0-b989-44d9-b984-95ac60887bca';

// Helper to parse and format PRD markdown content
function processPrdMarkdown(markdown: string): { metadata: Record<string, string> | null; content: string } {
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

// Helper to render metadata as a nice card
function renderMetadataCard(metadata: Record<string, string>): string {
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

// Helper to fetch files from Directus
async function fetchDirectusFiles(): Promise<Array<{ id: string; filename_download: string }>> {
  const response = await fetch(
    `${DIRECTUS_URL}/files?filter[folder][_eq]=${DIRECTUS_FOLDER_ID}&sort=filename_download`
  );
  if (!response.ok) {
    throw new Error(`Directus API error: ${response.status}`);
  }
  const data = await response.json() as { data?: Array<{ id: string; filename_download: string }> };
  return (data.data || []).filter((f) => f.filename_download?.endsWith('.md'));
}

// Helper to generate the full page HTML with sidebar
function generatePrdViewerHtml(
  files: Array<{ id: string; filename_download: string }>,
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${selectedFileName ? selectedFileName + ' - ' : ''}PRD Documents</title>
  <style>
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

    .item-icon {
      font-size: 1.1em;
    }

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

    .sidebar-footer a:hover {
      color: #fff;
    }

    /* Main Content */
    .main-content {
      flex: 1;
      margin-left: 300px;
      padding: 32px 48px;
      max-width: calc(100% - 300px);
    }

    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e0e0e0;
    }

    .content-header h1 {
      color: #1a1a2e;
      font-size: 1.8em;
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

    .welcome-state .icon {
      font-size: 4em;
      margin-bottom: 24px;
    }

    .welcome-state h2 {
      color: #1a1a2e;
      margin-bottom: 12px;
    }

    .welcome-state p {
      color: #666;
      max-width: 400px;
      margin: 0 auto;
    }

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

    .metadata-item .value {
      font-weight: 600;
      color: #1a1a2e;
    }

    .metadata-tags {
      margin-top: 16px;
    }

    .metadata-tags .label {
      display: block;
      font-size: 0.8em;
      color: #6c757d;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .metadata-tags .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

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

    .content h1:first-child {
      margin-top: 0;
    }

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

    .content p {
      margin-bottom: 16px;
      color: #444;
      line-height: 1.8;
    }

    .content ul, .content ol {
      margin-left: 8px;
      margin-bottom: 20px;
      padding: 16px 16px 16px 36px;
      background: #fafbfc;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .content li {
      margin: 10px 0;
      color: #444;
      line-height: 1.7;
    }

    .content li::marker {
      color: #667eea;
    }

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

    .content th, .content td {
      padding: 14px 18px;
      text-align: left;
    }

    .content th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 600;
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .content td {
      border-bottom: 1px solid #e9ecef;
      background: white;
    }

    .content tr:last-child td {
      border-bottom: none;
    }

    .content tr:hover td {
      background: #f8f9fa;
    }

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

    .content blockquote p:last-child {
      margin-bottom: 0;
    }

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

    .content a:hover {
      color: #764ba2;
      border-bottom-style: solid;
    }

    /* Strong/Bold text */
    .content strong {
      color: #1a1a2e;
      font-weight: 600;
    }

    /* Section containers - for visual grouping */
    .content > p + ul,
    .content > p + ol {
      margin-top: -8px;
    }

    /* Scrollbar */
    .sidebar::-webkit-scrollbar {
      width: 6px;
    }

    .sidebar::-webkit-scrollbar-track {
      background: rgba(255,255,255,0.05);
    }

    .sidebar::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.2);
      border-radius: 3px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sidebar {
        width: 100%;
        height: auto;
        position: relative;
      }
      .main-content {
        margin-left: 0;
        max-width: 100%;
        padding: 20px;
      }
      .content-card {
        padding: 24px;
      }
    }
  </style>
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

// List PRD files from Directus (landing page)
router.get('/prd-docs', async (_req: Request, res: Response) => {
  try {
    const files = await fetchDirectusFiles();
    const html = generatePrdViewerHtml(files, null, '', 'PRD Documents');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error fetching Directus files:', error);
    res.status(500).json({ error: 'Failed to fetch documents from Directus' });
  }
});

// View single PRD from Directus (with sidebar)
router.get('/prd-docs/:fileId', async (req: Request, res: Response) => {
  const { fileId } = req.params;

  try {
    // Fetch all files for sidebar
    const files = await fetchDirectusFiles();

    // Fetch file metadata
    const metaResponse = await fetch(`${DIRECTUS_URL}/files/${fileId}`);
    if (!metaResponse.ok) {
      throw new Error(`File not found: ${metaResponse.status}`);
    }
    const metaData = await metaResponse.json() as { data?: { filename_download?: string } };
    const fileName = metaData.data?.filename_download?.replace('.md', '') || 'Document';

    // Fetch file content
    const contentResponse = await fetch(`${DIRECTUS_URL}/assets/${fileId}`);
    if (!contentResponse.ok) {
      throw new Error(`Failed to fetch content: ${contentResponse.status}`);
    }
    const markdown = await contentResponse.text();

    // Process markdown to extract and format frontmatter
    const { metadata, content } = processPrdMarkdown(markdown);
    const metadataHtml = metadata ? renderMetadataCard(metadata) : '';
    const htmlContent = metadataHtml + markdownToHtml(content);

    const html = generatePrdViewerHtml(files, fileId, htmlContent, fileName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error fetching Directus document:', error);
    res.status(500).json({ error: 'Failed to fetch document from Directus' });
  }
});

export default router;
