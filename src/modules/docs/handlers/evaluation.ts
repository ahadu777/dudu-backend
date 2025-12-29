/**
 * Evaluation Handler
 * 处理 /evaluation 路由 - 基础评估页面
 */

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '../../../utils/logger';
import { loadPRDDocuments, loadStoriesIndex } from '../../../utils/prdParser';
import { getCardStats } from '../../../utils/cardParser';
import { loadTestCoverageData } from '../../../utils/coverageParser';
import { runComplianceAudit } from '../../../utils/complianceAuditor';
import { baseLayout } from '../templates/base';
import {
  generateAutoActionItems,
  calculateProductionReadiness
} from '../services/metrics';

// ============ 类型定义 ============

interface EvalQuestion {
  question: string;
  check_location: string;
  target: string;
}

interface EvalRole {
  id: string;
  title: string;
  icon: string;
  color: string;
  questions: EvalQuestion[];
}

interface QuickCheck {
  name: string;
  description: string;
  command: string;
}

interface EvalConfig {
  last_updated: string;
  roles: EvalRole[];
  quick_checks: QuickCheck[];
}

// ============ 页面样式 ============

const pageStyles = `
  .eval-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
  .eval-header { text-align: center; margin-bottom: 40px; }
  .eval-header h1 { color: #2c3e50; font-size: 2.2em; }
  .eval-header p { color: #7f8c8d; font-size: 1.1em; }
  .eval-header .last-updated { color: #95a5a6; font-size: 0.85em; margin-top: 5px; }
  .quick-check { background: #f8f9fa; border: 2px solid #3498db; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
  .quick-check h2 { color: #3498db; margin-bottom: 15px; }
  .quick-check pre { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 0.85em; }
  .quick-check .check-item { margin-bottom: 15px; }
  .quick-check .check-name { font-weight: 600; color: #2c3e50; }
  .quick-check .check-desc { color: #7f8c8d; font-size: 0.9em; }
  .role-section { margin-bottom: 30px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
  .role-header { padding: 15px 20px; font-weight: 600; font-size: 1.1em; color: white; }
  .role-content { padding: 20px; background: white; }
  .eval-table { width: 100%; border-collapse: collapse; }
  .eval-table th, .eval-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
  .eval-table th { background: #f8f9fa; font-weight: 600; color: #2c3e50; }
  .eval-table tr:hover { background: #f8f9fa; }
  .target { color: #27ae60; font-weight: 500; }
  .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
  .metric-card { background: white; border: 2px solid #27ae60; border-radius: 8px; padding: 20px; text-align: center; }
  .metric-value { font-size: 2.5em; font-weight: 700; color: #2c3e50; }
  .metric-label { color: #7f8c8d; font-size: 0.9em; margin-top: 5px; }
  .action-items { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin-top: 30px; border-radius: 4px; }
  .action-items h3 { color: #856404; margin-bottom: 10px; }
  .action-items ul { margin: 0; padding-left: 20px; }
  .action-items li { margin: 8px 0; }
  .action-items .priority-high { color: #e74c3c; font-weight: 500; }
  .action-items .priority-medium { color: #f39c12; }
  .action-items .priority-low { color: #27ae60; }
  .how-it-works { margin-top: 40px; background: linear-gradient(135deg, #f8f9fa 0%, #e8f4f8 100%); border-radius: 12px; padding: 25px; border: 2px solid #3498db; }
  .how-it-works h2 { color: #2c3e50; margin-bottom: 20px; font-size: 1.3em; }
  .how-it-works .principle { background: #d4edda; border-left: 4px solid #27ae60; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
  .how-it-works .principle strong { color: #155724; }
  .data-flow-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
  .data-flow-table th { background: #2c3e50; color: white; padding: 12px; text-align: left; }
  .data-flow-table td { padding: 10px 12px; border-bottom: 1px solid #eee; }
  .data-flow-table tr:last-child td { border-bottom: none; }
  .data-flow-table code { background: #e8f4f8; padding: 2px 6px; border-radius: 3px; font-size: 0.85em; color: #2c3e50; }
  .data-flow-table .arrow { color: #3498db; font-weight: bold; }
  .data-flow-table tr:hover { background: #f8f9fa; }
  .foundation-score { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; color: white; }
  .foundation-score h2 { margin: 0 0 20px 0; font-size: 1.3em; }
  .score-display { display: flex; align-items: center; gap: 30px; flex-wrap: wrap; }
  .main-score { text-align: center; min-width: 150px; }
  .main-score .number { font-size: 4em; font-weight: 700; line-height: 1; }
  .main-score .label { font-size: 0.9em; opacity: 0.8; margin-top: 5px; }
  .score-breakdown { flex: 1; min-width: 300px; }
  .score-item { display: flex; align-items: center; margin-bottom: 12px; }
  .score-item .name { width: 140px; font-size: 0.9em; opacity: 0.9; }
  .score-item .bar-container { flex: 1; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; margin: 0 15px; }
  .score-item .bar { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .score-item .bar.green { background: #27ae60; }
  .score-item .bar.yellow { background: #f39c12; }
  .score-item .bar.red { background: #e74c3c; }
  .score-item .value { width: 50px; text-align: right; font-weight: 600; }
`;

// ============ 辅助函数 ============

function getBarColor(score: number): string {
  return score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
}

function loadEvalConfig(): EvalConfig {
  const evalConfigPath = path.join(process.cwd(), 'docs/reference/evaluation-questions.yaml');
  return yaml.load(fs.readFileSync(evalConfigPath, 'utf-8')) as EvalConfig;
}

// ============ Route Handler ============

/**
 * 处理 /evaluation 路由
 */
export function handleEvaluation(_req: Request, res: Response): void {
  try {
    const evalConfig = loadEvalConfig();

    // 加载实时指标
    const prdStats = { total: loadPRDDocuments().length };
    const storyStats = { total: loadStoriesIndex().length };
    const cardStats = getCardStats();

    // 计算基础评分
    const complianceResult = runComplianceAudit();
    const complianceScore = Math.max(0, complianceResult.overall_score);

    const coverageData = loadTestCoverageData();
    const testStats = (coverageData?.coverage_summary as any)?.test_statistics || {};
    const testPassRate = testStats.success_rate === '100%' ? 100 : parseInt(testStats.success_rate || '0');

    const docsComplete = cardStats.total > 0
      ? Math.round(((cardStats.byStatus.Done || 0) / cardStats.total) * 100)
      : 0;

    const prodReadiness = calculateProductionReadiness();

    // 综合评分 (30% 合规 + 30% 测试 + 20% 文档 + 20% 生产就绪)
    const foundationScore = Math.round(
      (complianceScore * 0.3) + (testPassRate * 0.3) + (docsComplete * 0.2) + (prodReadiness.score * 0.2)
    );

    // 自动生成行动项
    const autoActionItems = generateAutoActionItems();

    // 生成角色部分 HTML
    const roleSectionsHtml = evalConfig.roles.map(role => {
      const questionsHtml = role.questions.map(q => {
        const locationHtml = q.check_location.startsWith('/')
          ? `<a href="${q.check_location}">${q.check_location}</a>`
          : q.check_location.startsWith('npm')
            ? `<code>${q.check_location}</code>`
            : q.check_location;
        return `<tr><td>${q.question}</td><td>${locationHtml}</td><td class="target">${q.target}</td></tr>`;
      }).join('');

      return `
        <div class="role-section">
          <div class="role-header" style="background: ${role.color}">${role.icon} For ${role.title}</div>
          <div class="role-content">
            <table class="eval-table">
              <tr><th>Question</th><th>Where to Check</th><th>Target</th></tr>
              ${questionsHtml}
            </table>
          </div>
        </div>
      `;
    }).join('');

    // 生成快速检查 HTML
    const quickChecksHtml = evalConfig.quick_checks.map(check => `
      <div class="check-item">
        <div class="check-name">${check.name}</div>
        <div class="check-desc">${check.description}</div>
        <pre>${check.command.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\$/g, '&#36;')}</pre>
      </div>
    `).join('');

    // 生成行动项 HTML
    const actionItemsHtml = autoActionItems.map(action => {
      const sourceLink = action.source.startsWith('/')
        ? `<a href="${action.source}" style="color: inherit; margin-left: 8px; font-size: 0.8em;">[${action.source}]</a>`
        : `<code style="font-size: 0.8em; margin-left: 8px;">${action.source}</code>`;
      return `<li class="priority-${action.priority}">${action.description}${sourceLink}</li>`;
    }).join('');

    const content = `
      <div class="eval-container">
        <div class="eval-header">
          <h1>🔍 Foundation Evaluation</h1>
          <p>Ask the right questions to assess system health. Use this page for team discussions and periodic reviews.</p>
          <div class="last-updated">Questions last updated: ${evalConfig.last_updated}</div>
        </div>

        <div class="foundation-score">
          <h2>📊 Foundation Score</h2>
          <div class="score-display">
            <div class="main-score">
              <div class="number">${foundationScore}%</div>
              <div class="label">Overall Health</div>
            </div>
            <div class="score-breakdown">
              <div class="score-item">
                <span class="name">Compliance (30%)</span>
                <div class="bar-container">
                  <div class="bar ${getBarColor(complianceScore)}" style="width: ${complianceScore}%"></div>
                </div>
                <span class="value">${complianceScore}%</span>
              </div>
              <div class="score-item">
                <span class="name">Test Pass Rate (30%)</span>
                <div class="bar-container">
                  <div class="bar ${getBarColor(testPassRate)}" style="width: ${testPassRate}%"></div>
                </div>
                <span class="value">${testPassRate}%</span>
              </div>
              <div class="score-item">
                <span class="name">Docs Complete (20%)</span>
                <div class="bar-container">
                  <div class="bar ${getBarColor(docsComplete)}" style="width: ${docsComplete}%"></div>
                </div>
                <span class="value">${docsComplete}%</span>
              </div>
              <div class="score-item">
                <span class="name">Prod Ready (20%)</span>
                <div class="bar-container">
                  <div class="bar ${getBarColor(prodReadiness.score)}" style="width: ${prodReadiness.score}%"></div>
                </div>
                <span class="value">${prodReadiness.score}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${prdStats.total}</div>
            <div class="metric-label">PRDs</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${storyStats.total}</div>
            <div class="metric-label">Stories</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${cardStats.total}</div>
            <div class="metric-label">Cards (${cardStats.byStatus.Done || 0} Done)</div>
          </div>
          <div class="metric-card">
            <div class="metric-value"><a href="/compliance" style="color: inherit; text-decoration: none;">Check</a></div>
            <div class="metric-label">Compliance Score</div>
          </div>
        </div>

        <div class="quick-check">
          <h2>⚡ Quick Health Check</h2>
          ${quickChecksHtml}
        </div>

        ${roleSectionsHtml}

        ${autoActionItems.length > 0 ? `
        <div class="action-items">
          <h3>📝 Auto-Generated Action Items</h3>
          <p style="font-size: 0.85em; color: #666; margin-bottom: 10px;">
            These items are computed from actual system data, not a hardcoded list.
          </p>
          <ul>${actionItemsHtml}</ul>
        </div>
        ` : '<div class="action-items" style="background: #d4edda; border-left-color: #27ae60;"><h3 style="color: #155724;">✅ No Action Items</h3><p style="color: #155724;">All systems healthy!</p></div>'}

        <div class="how-it-works">
          <h2>📐 How This Page Works</h2>
          <div class="principle">
            <strong>Zero Hardcoding Principle:</strong> If changing data requires changing code, it's hardcoded.
            If data changes flow through automatically, it's data-driven. This page demonstrates the principle it evaluates.
          </div>
          <table class="data-flow-table">
            <tr><th>Data Source</th><th></th><th>Parser</th><th></th><th>UI Display</th></tr>
            <tr>
              <td><code>docs/reference/evaluation-questions.yaml</code></td>
              <td class="arrow">→</td>
              <td><code>yaml.load()</code></td>
              <td class="arrow">→</td>
              <td>Questions by Role (above)</td>
            </tr>
            <tr>
              <td><code>docs/prd/*.md</code></td>
              <td class="arrow">→</td>
              <td><code>loadPRDDocuments()</code></td>
              <td class="arrow">→</td>
              <td>PRD Count: ${prdStats.total}</td>
            </tr>
            <tr>
              <td><code>docs/stories/_index.yaml</code></td>
              <td class="arrow">→</td>
              <td><code>loadStoriesIndex()</code></td>
              <td class="arrow">→</td>
              <td>Story Count: ${storyStats.total}</td>
            </tr>
            <tr>
              <td><code>docs/cards/*.md</code></td>
              <td class="arrow">→</td>
              <td><code>getCardStats()</code></td>
              <td class="arrow">→</td>
              <td>Card Count: ${cardStats.total}</td>
            </tr>
            <tr>
              <td><em>Multiple sources</em></td>
              <td class="arrow">→</td>
              <td><code>generateAutoActionItems()</code></td>
              <td class="arrow">→</td>
              <td>Action Items: ${autoActionItems.length}</td>
            </tr>
            <tr>
              <td><em>Multiple sources</em></td>
              <td class="arrow">→</td>
              <td><code>calculateProductionReadiness()</code></td>
              <td class="arrow">→</td>
              <td>Prod Ready: ${prodReadiness.score}%</td>
            </tr>
          </table>
        </div>
      </div>
    `;

    const html = baseLayout({ title: 'Foundation Evaluation', styles: pageStyles }, content);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error loading evaluation page:', error);
    res.status(500).json({ error: 'Failed to load evaluation page' });
  }
}
