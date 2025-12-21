import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '../../utils/logger';
import { markdownToHtml, renderMarkdownFile } from '../../utils/markdown';
import { loadPRDDocuments, loadStoriesIndex } from '../../utils/prdParser';
import { getCardStats } from '../../utils/cardParser';
import { getMemoStats } from '../../utils/memoParser';
import { buildSitemap } from '../../utils/sitemapBuilder';
import { runComplianceAudit } from '../../utils/complianceAuditor';
import { loadTestCoverageData, getCoverageStats } from '../../utils/coverageParser';
import { loadAllTestCases, FeatureTestCases } from '../../utils/testCaseParser';
import { loadPRDCoverageWithTests, PRDCoverage } from '../../utils/acParser';
import { extractPrdTestData, PrdTestData, TestCaseDetail } from '../../utils/newmanParser';
import { extractStoryTestData, StoryTestData, RunbookTestCase, groupTestCasesByFunction, FunctionGroup, MergedTestCase } from '../../utils/runbookParser';
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
  handleStoryDetail,
  handleSitemap,
  handleGraph,
  handleCompliance,
  handleArchitecture,
  handleMemosList,
  handleMemoDetail
} from './handlers';
import { loadCardDocuments } from '../../utils/cardParser';

// ============ Auto-Generated Action Items ============
// Data-driven: computes from actual data instead of hardcoded YAML list
interface AutoActionItem {
  description: string;
  priority: 'high' | 'medium' | 'low';
  source: string; // Where this action item came from
  category: 'compliance' | 'coverage' | 'docs' | 'production';
}

function generateAutoActionItems(): AutoActionItem[] {
  const actions: AutoActionItem[] = [];

  // 1. Get compliance violations (errors = high priority, warnings = medium)
  const complianceResult = runComplianceAudit();
  const criticalViolations = complianceResult.violations.filter(v => v.type === 'error');
  const warningViolations = complianceResult.violations.filter(v => v.type === 'warning');

  if (criticalViolations.length > 0) {
    // Group by category for better actionability
    const byCategory = criticalViolations.reduce((acc, v) => {
      acc[v.category] = (acc[v.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(byCategory).forEach(([category, count]) => {
      actions.push({
        description: `Fix ${count} ${category} error(s) in documentation`,
        priority: 'high',
        source: '/compliance',
        category: 'compliance'
      });
    });
  }

  if (warningViolations.length > 3) {
    actions.push({
      description: `Review ${warningViolations.length} compliance warnings`,
      priority: 'medium',
      source: '/compliance',
      category: 'compliance'
    });
  }

  // 2. Get coverage gaps from test-coverage data
  const coverageData = loadTestCoverageData();
  if (coverageData?.remaining_gaps) {
    const gaps = coverageData.remaining_gaps as string[];
    if (gaps.length > 0) {
      actions.push({
        description: `Address ${gaps.length} remaining test coverage gap(s)`,
        priority: 'medium',
        source: '/coverage',
        category: 'coverage'
      });
    }
  }

  // 3. Get draft/in-progress cards that need completion
  const cards = loadCardDocuments();
  const draftCards = cards.filter(c => c.metadata.status === 'Ready' || c.metadata.status === 'Draft');
  const inProgressCards = cards.filter(c => c.metadata.status === 'In Progress');

  if (inProgressCards.length > 0) {
    actions.push({
      description: `Complete ${inProgressCards.length} In Progress card(s)`,
      priority: 'high',
      source: '/cards',
      category: 'docs'
    });
  }

  if (draftCards.length > 3) {
    actions.push({
      description: `Move ${draftCards.length} Draft/Ready cards to In Progress or mark as deprecated`,
      priority: 'low',
      source: '/cards',
      category: 'docs'
    });
  }

  // 4. Production readiness checks
  const testStats = (coverageData?.coverage_summary as any)?.test_statistics || {};
  const successRate = testStats.success_rate || '0%';
  if (successRate !== '100%') {
    actions.push({
      description: `Fix failing tests (current: ${successRate} pass rate)`,
      priority: 'high',
      source: 'npm run test:prd',
      category: 'production'
    });
  }

  // Check for PRDs without test coverage
  const prdCoverageRegistry = (coverageData as any)?.coverage_registry || [];
  const prdsWithGaps = prdCoverageRegistry.filter((p: any) =>
    p.coverage_gaps && p.coverage_gaps.length > 0 && !p.deprecated
  );
  if (prdsWithGaps.length > 0) {
    actions.push({
      description: `Review ${prdsWithGaps.length} PRD(s) with known test gaps`,
      priority: 'medium',
      source: '/coverage',
      category: 'production'
    });
  }

  return actions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ============ Production Readiness Score ============
// Calculates production readiness based on multiple factors
function calculateProductionReadiness(): { score: number; details: string[] } {
  const details: string[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;

  // 1. Test pass rate (40 points)
  totalPoints += 40;
  const coverageData = loadTestCoverageData();
  const testStats = (coverageData?.coverage_summary as any)?.test_statistics || {};
  const successRate = testStats.success_rate === '100%' ? 100 : parseInt(testStats.success_rate || '0');
  const testPoints = Math.round(successRate * 0.4);
  earnedPoints += testPoints;
  details.push(`Tests: ${testPoints}/40 (${successRate}% pass rate)`);

  // 2. No critical compliance errors (30 points)
  totalPoints += 30;
  const complianceResult = runComplianceAudit();
  const criticalErrors = complianceResult.violations.filter(v => v.type === 'error').length;
  const compliancePoints = criticalErrors === 0 ? 30 : Math.max(0, 30 - (criticalErrors * 5));
  earnedPoints += compliancePoints;
  details.push(`Compliance: ${compliancePoints}/30 (${criticalErrors} critical errors)`);

  // 3. Documentation completeness (20 points)
  totalPoints += 20;
  const cardStats = getCardStats();
  const docsCompleteRate = cardStats.total > 0
    ? ((cardStats.byStatus.Done || 0) / cardStats.total) * 100
    : 0;
  const docsPoints = Math.round(docsCompleteRate * 0.2);
  earnedPoints += docsPoints;
  details.push(`Docs: ${docsPoints}/20 (${Math.round(docsCompleteRate)}% complete)`);

  // 4. No remaining coverage gaps (10 points)
  totalPoints += 10;
  const gaps = (coverageData?.remaining_gaps as string[] || []).length;
  const gapPoints = gaps === 0 ? 10 : Math.max(0, 10 - (gaps * 2));
  earnedPoints += gapPoints;
  details.push(`Coverage Gaps: ${gapPoints}/10 (${gaps} gaps)`);

  const score = Math.round((earnedPoints / totalPoints) * 100);
  return { score, details };
}

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

// ============ Memos Routes ============
router.get('/memos', handleMemosList);
router.get('/memos/:memoId', handleMemoDetail);

// ============ Visualization Routes ============

router.get('/sitemap', handleSitemap);

router.get('/graph', handleGraph);

router.get('/compliance', handleCompliance);

router.get('/architecture', handleArchitecture);

// ============ Foundation Evaluation Route ============
// Data-driven from docs/reference/evaluation-questions.yaml (zero hardcoding)
router.get('/evaluation', (_req: Request, res: Response) => {
  try {
    // Load evaluation config from YAML
    const evalConfigPath = path.join(process.cwd(), 'docs/reference/evaluation-questions.yaml');
    interface EvalQuestion { question: string; check_location: string; target: string; }
    interface EvalRole { id: string; title: string; icon: string; color: string; questions: EvalQuestion[]; }
    interface QuickCheck { name: string; description: string; command: string; }
    interface ActionItem { description: string; status: string; priority: string; }
    interface EvalConfig { last_updated: string; roles: EvalRole[]; quick_checks: QuickCheck[]; action_items: ActionItem[]; }

    const evalConfig = yaml.load(fs.readFileSync(evalConfigPath, 'utf-8')) as EvalConfig;

    // Load live metrics from actual data
    const prdStats = { total: loadPRDDocuments().length };
    const storyStats = { total: loadStoriesIndex().length };
    const cardStats = getCardStats();

    // Calculate Foundation Score from existing data sources
    const complianceResult = runComplianceAudit();
    const complianceScore = Math.max(0, complianceResult.overall_score); // Ensure non-negative

    // Test pass rate from test-coverage YAML
    const coverageData = loadTestCoverageData();
    const testStats = (coverageData?.coverage_summary as any)?.test_statistics || {};
    const testPassRate = testStats.success_rate === '100%' ? 100 :
      parseInt(testStats.success_rate || '0');

    // Documentation completeness (Cards Done / Total)
    const docsComplete = cardStats.total > 0
      ? Math.round(((cardStats.byStatus.Done || 0) / cardStats.total) * 100)
      : 0;

    // Production Readiness (new dimension)
    const prodReadiness = calculateProductionReadiness();

    // Overall Foundation Score (weighted average with 4 dimensions)
    // 30% Compliance + 30% Tests + 20% Docs + 20% Production Readiness
    const foundationScore = Math.round(
      (complianceScore * 0.3) + (testPassRate * 0.3) + (docsComplete * 0.2) + (prodReadiness.score * 0.2)
    );

    // Auto-generate action items from actual data (no more hardcoded YAML list!)
    const autoActionItems = generateAutoActionItems();

    const getBarColor = (score: number) => score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';

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

    // Build role sections dynamically from YAML config
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

    // Build quick checks dynamically from YAML
    const quickChecksHtml = evalConfig.quick_checks.map(check => `
      <div class="check-item">
        <div class="check-name">${check.name}</div>
        <div class="check-desc">${check.description}</div>
        <pre>${check.command.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\$/g, '&#36;')}</pre>
      </div>
    `).join('');

    // Build action items from AUTO-GENERATED data (not YAML!)
    // This is the key improvement: actions come from actual system state
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
              <td><code>docs/test-coverage/_index.yaml</code></td>
              <td class="arrow">→</td>
              <td><code>loadTestCoverageData()</code></td>
              <td class="arrow">→</td>
              <td>/coverage page</td>
            </tr>
            <tr>
              <td><code>postman/auto-generated/*.json</code></td>
              <td class="arrow">→</td>
              <td><code>extractPrdTestData()</code></td>
              <td class="arrow">→</td>
              <td>/test-results page</td>
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
});

router.get('/coverage', (req: Request, res: Response) => {
      try {
        const tab = (req.query.tab as string) || 'prd';

        // 加载 PRD 测试数据（Newman）- 过滤掉 Unknown
        const reportsDir = path.join(process.cwd(), 'reports/newman');
        const prdTestData = extractPrdTestData(reportsDir)
          .filter(p => p.prdId !== 'Unknown');

        // 加载 Story 测试数据（Runbook）- 过滤掉 Unknown
        const storyTestData = extractStoryTestData()
          .filter(s => s.storyId !== 'Unknown');

        // 按功能分组的测试数据（去重 + 过滤）
        const functionGroups = groupTestCasesByFunction(storyTestData);

        // 计算总统计
        const prdStats = prdTestData.reduce((acc, prd) => ({
          total: acc.total + prd.stats.total,
          passed: acc.passed + prd.stats.passed,
          failed: acc.failed + prd.stats.failed
        }), { total: 0, passed: 0, failed: 0 });

        // 按功能分组后的统计（去重后）
        const funcStats = functionGroups.reduce((acc, group) => ({
          total: acc.total + group.stats.total,
          checked: acc.checked + group.stats.checked,
          unchecked: acc.unchecked + group.stats.unchecked
        }), { total: 0, checked: 0, unchecked: 0 });

        const isPrdTab = tab === 'prd';
        const isStoryTab = tab === 'story';

        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Dashboard - 测试用例文档</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f7fa;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }

    /* 顶部标题栏 */
    .page-header {
      background: white;
      border-radius: 8px;
      padding: 24px 32px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .page-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .page-title h1 {
      font-size: 2em;
      color: #2c3e50;
      font-weight: 600;
    }
    .page-subtitle {
      color: #7f8c8d;
      font-size: 0.95em;
      margin-top: 4px;
    }
    .page-nav {
      display: flex;
      gap: 24px;
      align-items: center;
    }
    .page-nav a {
      color: #3498db;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }
    .page-nav a:hover {
      color: #2980b9;
    }

    /* Tab 导航 - 参考 mesh.synque.ai 设计 */
    .tabs {
      display: flex;
      gap: 4px;
      background: transparent;
      margin-bottom: 24px;
    }
    .tab {
      padding: 12px 24px;
      text-decoration: none;
      color: #7f8c8d;
      font-weight: 500;
      background: white;
      border-radius: 8px;
      transition: all 0.3s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    }
    .tab:hover {
      color: #3498db;
      box-shadow: 0 4px 8px rgba(0,0,0,0.08);
    }
    .tab.active {
      color: white;
      background: #3498db;
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
    }

    /* 头部 Banner - 移除渐变，使用简洁设计 */
    .header-banner {
      background: white;
      padding: 0;
      border-radius: 0;
      margin-bottom: 24px;
      display: none; /* 隐藏原有 banner，使用 page-header 替代 */
    }

    /* 统计卡片 - 参考 mesh.synque.ai 设计 */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      transition: transform 0.2s, box-shadow 0.2s;
      border: 1px solid #f0f0f0;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    }
    .stat-card .icon {
      font-size: 2em;
      margin-bottom: 12px;
    }
    .stat-card .number {
      font-size: 2.8em;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 8px;
      line-height: 1;
    }
    .stat-card .label {
      color: #7f8c8d;
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }
    .stat-card.success .number { color: #27ae60; }
    .stat-card.warning .number { color: #f39c12; }
    .stat-card.danger .number { color: #e74c3c; }
    .stat-card.primary .number { color: #3498db; }

    /* Section Header - 参考 mesh.synque.ai 设计 */
    .section-header {
      margin-bottom: 24px;
    }
    .section-header h2 {
      font-size: 1.5em;
      color: #2c3e50;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .section-header p {
      color: #7f8c8d;
      font-size: 0.9em;
    }

    /* Info Box - 说明框 */
    .info-box {
      background: #e8f4f8;
      border-left: 4px solid #3498db;
      padding: 20px 24px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .info-box h4 {
      color: #2c3e50;
      margin-bottom: 12px;
      font-size: 1.1em;
    }
    .info-box p {
      color: #34495e;
      line-height: 1.6;
      margin-bottom: 8px;
    }
    .info-box ul {
      color: #34495e;
      line-height: 1.8;
    }
    .info-box code {
      background: #34495e;
      color: #2ecc71;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }

    /* API Endpoint Section */
    .api-endpoint-section {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .api-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .api-title {
      font-weight: 600;
      color: #2c3e50;
      font-size: 1.05em;
    }
    .api-description {
      color: #555;
      line-height: 1.6;
    }
    .api-description code {
      background: #e67e22;
      color: white;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.9em;
    }
    .api-example {
      margin-top: 8px;
    }
    .api-example strong {
      color: #7f8c8d;
      font-size: 0.9em;
      display: block;
      margin-bottom: 6px;
    }
    .curl-example {
      display: block;
      background: #2c3e50;
      color: #2ecc71;
      padding: 10px 12px;
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.85em;
      overflow-x: auto;
      white-space: nowrap;
    }

    /* PRD/Story 列表 */
    .test-group {
      background: white;
      border-radius: 8px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      overflow: hidden;
    }
    .test-group-header {
      padding: 16px 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e8f4f8 100%);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.2s;
    }
    .test-group-header:hover {
      background: linear-gradient(135deg, #e8f4f8 0%, #d4edda 100%);
    }
    .test-group-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .test-group-title h3 {
      margin: 0;
      color: #2c3e50;
      font-size: 1.1em;
    }
    .test-group-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 500;
    }
    .badge-blue { background: #e6f7ff; color: #1890ff; }
    .badge-green { background: #f6ffed; color: #52c41a; }
    .badge-orange { background: #fff7e6; color: #fa8c16; }
    .badge-gray { background: #f5f5f5; color: #666; }
    .run-cmd {
      font-family: 'Monaco', 'Consolas', monospace;
      background: #2c3e50;
      color: #2ecc71;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 0.85em;
    }
    .copy-btn {
      background: #1890ff;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85em;
      transition: all 0.2s;
    }
    .copy-btn:hover { background: #40a9ff; }
    .copy-btn.copied { background: #52c41a; }
    .toggle-icon {
      font-size: 1.2em;
      transition: transform 0.3s;
      color: #999;
    }
    .toggle-icon.expanded { transform: rotate(90deg); }

    /* 测试用例列表 */
    .test-group-body {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out;
    }
    .test-group-body.expanded {
      max-height: 5000px;
    }

    /* Coverage Dashboard */
    .coverage-dashboard {
      padding: 20px;
    }
    .coverage-summary {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
    }
    .coverage-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 24px;
      background: #f8f9fa;
      border-radius: 8px;
      min-width: 120px;
    }
    .coverage-stat .stat-value {
      font-size: 1.5em;
      font-weight: 700;
      color: #2c3e50;
    }
    .coverage-stat .stat-label {
      font-size: 0.85em;
      color: #7f8c8d;
      margin-top: 4px;
    }
    .text-green { color: #27ae60 !important; }
    .text-orange { color: #f39c12 !important; }

    /* Feature Coverage */
    .feature-coverage,
    .tested-scenarios,
    .api-endpoints {
      margin-bottom: 20px;
    }
    .feature-coverage h5,
    .tested-scenarios h5,
    .api-endpoints h5 {
      font-size: 1em;
      color: #2c3e50;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eee;
    }
    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    .feature-status { font-size: 1em; }
    .feature-name { flex: 1; color: #2c3e50; }
    .feature-coverage-value {
      font-family: monospace;
      color: #27ae60;
      font-weight: 600;
    }

    /* Tested Scenarios */
    .scenario-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .scenario-list li {
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 6px;
      margin-bottom: 6px;
      font-size: 0.9em;
      color: #2c3e50;
    }

    /* API Endpoints */
    .endpoint-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .endpoint-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    .endpoint-item.tested { background: #f6ffed; }
    .endpoint-item.untested { background: #fffbe6; }
    .endpoint-status { font-size: 1em; }
    .endpoint-path {
      flex: 1;
      font-family: monospace;
      font-size: 0.9em;
      color: #2c3e50;
      background: transparent;
    }
    .endpoint-badge {
      font-size: 0.8em;
      color: #52c41a;
    }

    .test-cases-list {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* 测试用例卡片 */
    .test-case-card {
      background: #fafafa;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 16px;
      border-left: 4px solid #1890ff;
    }
    .test-case-card.p0 { border-left-color: #ff4d4f; }
    .test-case-card.p1 { border-left-color: #faad14; }
    .test-case-card.p2 { border-left-color: #52c41a; }
    .test-case-card.passed { background: #f6ffed; }
    .test-case-card.failed { background: #fff2f0; }

    .tc-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e8e8e8;
    }
    .tc-id {
      background: #2c3e50;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.85em;
    }
    .tc-name {
      flex: 1;
      font-weight: 600;
      color: #2c3e50;
    }
    .tc-priority {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.8em;
      font-weight: 600;
    }
    .tc-priority.p0 { background: #fff1f0; color: #cf1322; }
    .tc-priority.p1 { background: #fffbe6; color: #d48806; }
    .tc-priority.p2 { background: #f6ffed; color: #389e0d; }
    .tc-status {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.8em;
    }
    .tc-status.passed { background: #d9f7be; color: #389e0d; }
    .tc-status.failed { background: #ffccc7; color: #cf1322; }
    .tc-status.pending { background: #fff1b8; color: #d48806; }

    .tc-section {
      margin-bottom: 12px;
    }
    .tc-section h5 {
      color: #1890ff;
      font-size: 0.9em;
      margin-bottom: 6px;
    }
    .tc-section ul {
      margin: 0;
      padding-left: 20px;
      color: #555;
    }
    .tc-section li {
      margin: 4px 0;
      line-height: 1.5;
    }

    .tc-request {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 12px 0;
      padding: 10px;
      background: #f0f5ff;
      border-radius: 6px;
      font-family: monospace;
    }
    .tc-request .method {
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 0.85em;
      color: white;
    }
    .tc-request .method.get { background: #52c41a; }
    .tc-request .method.post { background: #1890ff; }
    .tc-request .method.put { background: #fa8c16; }
    .tc-request .method.delete { background: #ff4d4f; }
    .tc-request .method.patch { background: #722ed1; }
    .tc-request .endpoint {
      color: #262626;
      font-size: 0.9em;
    }

    .tc-body {
      background: #f9f9f9;
      padding: 10px;
      border-radius: 6px;
    }
    .request-body {
      margin: 0;
      font-size: 0.85em;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 10px;
      border-radius: 4px;
    }

    .steps-list {
      margin: 0;
      padding-left: 20px;
      color: #555;
    }
    .steps-list li {
      margin: 4px 0;
      line-height: 1.5;
    }

    /* AC Reference */
    .ac-ref {
      background: #e6f7ff;
      color: #1890ff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.8em;
      margin-left: 8px;
    }

    /* 验证点 */
    .checkpoints {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .checkpoint {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9em;
      color: #555;
    }
    .checkpoint-icon { color: #52c41a; }

    /* Given-When-Then */
    .gwt-block {
      background: white;
      border-radius: 4px;
      padding: 12px;
      margin-top: 8px;
    }
    .gwt-given { color: #722ed1; }
    .gwt-when { color: #1890ff; }
    .gwt-then { color: #52c41a; }
    .gwt-block strong {
      display: inline-block;
      width: 60px;
    }

    /* 执行命令块 */
    .command-block {
      background: #1e1e1e;
      color: #d4d4d4;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 8px 0 0 0;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .command-block code {
      background: transparent;
      color: inherit;
      padding: 0;
    }

    /* 空状态 */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }
    .empty-state .icon { font-size: 4em; margin-bottom: 16px; }

    /* 展开/收回按钮 */
    .btn-outline {
      padding: 8px 16px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9em;
      color: #555;
      transition: all 0.2s;
    }
    .btn-outline:hover {
      background: #f5f5f5;
      border-color: #3498db;
      color: #3498db;
    }

    /* 来源标签 */
    .source-tags, .source-tag {
      font-size: 0.75em;
      color: #7f8c8d;
      background: #f0f0f0;
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 8px;
    }
    .source-tags {
      background: #e8f4f8;
      color: #3498db;
    }

    /* 响应式 */
    @media (max-width: 768px) {
      .stats-row { flex-direction: column; }
      .tc-header { flex-wrap: wrap; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <div class="page-title">
        <h1>📊 Test Coverage</h1>
        <div class="page-subtitle">测试覆盖率统计和 Newman 测试报告</div>
      </div>
      <div class="page-nav">
        <a href="/docs">← Project Docs</a>
        <a href="/docs/prd">PRDs</a>
      </div>
    </div>

    <!-- Tab 导航 -->
    <div class="tabs">
      <a href="/coverage?tab=prd" class="tab ${isPrdTab ? 'active' : ''}">PRD Coverage</a>
      <a href="/coverage?tab=story" class="tab ${isStoryTab ? 'active' : ''}">测试用例</a>
    </div>

    <!-- Header Banner -->
    <div class="header-banner">
      <h1>${isPrdTab ? '🤖 PRD 自动化测试' : '📝 QA E2E 测试清单'}</h1>
      <p>${isPrdTab ? 'Newman 自动执行的 API 测试，基于 PRD 验收标准' : 'QA 手动端到端测试清单，按 Round 分组'}</p>
    </div>

    <!-- 统计卡片 -->
    ${isPrdTab || isStoryTab ? `
    <div class="stats-row">
      ${isPrdTab ? `
      <div class="stat-card">
        <div class="number">${prdTestData.length}</div>
        <div class="label">Total PRDs</div>
      </div>
      <div class="stat-card success">
        <div class="number">${prdTestData.filter(p => p.stats.failed === 0).length}</div>
        <div class="label">Fully Covered</div>
      </div>
      <div class="stat-card">
        <div class="number">${prdStats.total}</div>
        <div class="label">Assertions</div>
      </div>
      <div class="stat-card ${prdStats.total > 0 && prdStats.failed === 0 ? 'success' : 'danger'}">
        <div class="number">${prdStats.total > 0 ? ((prdStats.passed / prdStats.total * 100).toFixed(1)) : 0}%</div>
        <div class="label">Success Rate</div>
      </div>
      ` : `
      <div class="stat-card">
        <div class="number">${functionGroups.length}</div>
        <div class="label">功能分组</div>
      </div>
      <div class="stat-card">
        <div class="number">${funcStats.total}</div>
        <div class="label">测试用例</div>
      </div>
      <div class="stat-card success">
        <div class="number">${funcStats.checked}</div>
        <div class="label">已完成</div>
      </div>
      <div class="stat-card warning">
        <div class="number">${funcStats.unchecked}</div>
        <div class="label">待测试</div>
      </div>
      <div class="stat-card ${funcStats.total > 0 ? (funcStats.checked / funcStats.total * 100 >= 80 ? 'success' : 'warning') : ''}">
        <div class="number">${funcStats.total > 0 ? ((funcStats.checked / funcStats.total * 100).toFixed(0)) : 0}%</div>
        <div class="label">完成率</div>
      </div>
      `}
    </div>
    ` : ''}

    <!-- PRD 自动化测试 (Newman) -->
    ${isPrdTab ? `
    <div class="section-header">
      <h2>PRD Coverage Details</h2>
      <p>Click on PRD ID to view full documentation</p>
    </div>

    <!-- 测试说明 -->
    <div class="info-box">
      <h4>📘 测试覆盖说明</h4>
      <p><strong>断言（Assertion）</strong>：自动化测试中用来验证 API 响应是否符合预期的检查点。例如：</p>
      <ul style="margin-left: 20px; margin-top: 8px;">
        <li><code>Status code is 200</code> - 验证 HTTP 状态码为 200（成功）</li>
        <li><code>Response has products array</code> - 验证响应包含 products 数组</li>
        <li><code>Products have required fields</code> - 验证产品对象包含必需的字段（如 id, name, sku）</li>
      </ul>
      <p style="margin-top: 12px;"><strong>测试步骤</strong>：展示了每个测试用例要验证的具体断言内容。</p>
      <p><strong>预期结果</strong>：列出所有需要通过的断言检查点（✓ 表示已通过）。</p>
    </div>
    ` : ''}
    ${isPrdTab ? (prdTestData.length > 0 ? prdTestData.map((prd: PrdTestData, idx: number) => `
    <div class="test-group" data-group="prd-${idx}">
      <div class="test-group-header" data-group-id="prd-${idx}">
        <div class="test-group-title">
          <span class="toggle-icon" id="icon-prd-${idx}">▶</span>
          <h3>${prd.prdId}: ${prd.prdTitle}</h3>
        </div>
        <div class="test-group-meta">
          <span class="badge badge-blue">${prd.stats.total} 用例</span>
          <span class="badge ${prd.stats.failed > 0 ? 'badge-orange' : 'badge-green'}">${prd.stats.passed}/${prd.stats.total} 通过</span>
          <code class="run-cmd">${prd.runCommand}</code>
          <button class="copy-btn" data-cmd="${prd.runCommand}">复制</button>
        </div>
      </div>
      <div class="test-group-body" id="body-prd-${idx}">
        <div class="test-cases-list">
          ${prd.testCases.map((tc: TestCaseDetail) => `
          <div class="test-case-card ${tc.priority.toLowerCase()} ${tc.status}">
            <div class="tc-header">
              <span class="tc-id">${tc.id}</span>
              <span class="tc-name">${tc.name}</span>
              <span class="tc-priority ${tc.priority.toLowerCase()}">${tc.priority}</span>
              <span class="tc-status ${tc.status}">${tc.status === 'passed' ? '✅' : tc.status === 'failed' ? '❌' : '⏸️'}</span>
            </div>
            ${tc.method && tc.endpoint ? `
            <div class="tc-request">
              <span class="method ${tc.method.toLowerCase()}">${tc.method}</span>
              <code class="endpoint">${tc.endpoint}</code>
            </div>
            ` : ''}
            ${tc.requestBody ? `
            <div class="tc-section tc-body">
              <h5>📤 请求体</h5>
              <pre class="request-body">${tc.requestBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </div>
            ` : ''}
            <div class="tc-section">
              <h5>🧪 测试步骤 (${tc.steps.length})</h5>
              <ol class="steps-list">${tc.steps.map(s => `<li>${s}</li>`).join('')}</ol>
            </div>
            <div class="tc-section">
              <h5>✅ 断言结果 (${tc.expected.length})</h5>
              <ul class="assertions-list">${tc.expected.map(e => `<li>${e}</li>`).join('')}</ul>
            </div>
          </div>
          `).join('')}
        </div>
      </div>
    </div>
    `).join('') : '<div class="empty-state"><div class="icon">📭</div><p>暂无 PRD 测试数据，请先运行 Newman 测试</p></div>') : ''}

    <!-- QA E2E Checklist - 按功能分组 -->
    ${isStoryTab ? `
    <div class="section-header" style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2>QA 测试清单</h2>
        <p>按功能分组，去重合并后的测试用例</p>
      </div>
      <div class="bulk-actions" style="display: flex; gap: 8px;">
        <button id="expand-all" class="btn-outline">展开所有</button>
        <button id="collapse-all" class="btn-outline">收回所有</button>
      </div>
    </div>
    ` : ''}
    ${isStoryTab ? (functionGroups.length > 0 ? functionGroups.map((group: FunctionGroup, idx: number) => `
    <div class="test-group" data-group="func-${idx}">
      <div class="test-group-header" data-group-id="func-${idx}">
        <div class="test-group-title">
          <span class="toggle-icon" id="icon-func-${idx}">▶</span>
          <h3>${group.icon} ${group.displayName} (${group.category})</h3>
        </div>
        <div class="test-group-meta">
          <span class="badge badge-blue">${group.stats.total} 用例</span>
          <span class="badge ${group.stats.unchecked > 0 ? 'badge-gray' : 'badge-green'}">${group.stats.checked}/${group.stats.total} 完成</span>
        </div>
      </div>
      <div class="test-group-body" id="body-func-${idx}">
        <div class="test-cases-list">
          ${group.testCases.map((tc: MergedTestCase) => `
          <div class="test-case-card ${tc.checked ? 'passed' : 'pending'}">
            <div class="tc-header">
              <span class="tc-id">${tc.id}</span>
              <span class="tc-name">${tc.name}</span>
              ${tc.sourceStories.length > 1 ? `<span class="source-tags">来自: ${tc.sourceStories.join(', ')}</span>` : `<span class="source-tag">${tc.sourceStories[0]}</span>`}
              <span class="tc-status ${tc.checked ? 'passed' : 'pending'}">${tc.checked ? '已完成' : '待测试'}</span>
            </div>
            ${tc.operation || tc.expected ? `
            <div class="tc-section">
              ${tc.operation ? `<div class="tc-detail"><strong>操作:</strong> ${tc.operation}</div>` : ''}
              ${tc.expected ? `<div class="tc-detail"><strong>预期:</strong> ${tc.expected}</div>` : ''}
            </div>
            ` : ''}
          </div>
          `).join('')}
        </div>
      </div>
    </div>
    `).join('') : '<div class="empty-state"><div class="icon">📭</div><p>暂无 QA E2E 测试清单，请在 Runbook 中添加测试用例。</p></div>') : ''}

  </div>

  <script>
    // 折叠/展开功能 - 事件委托
    document.addEventListener('click', function(e) {
      // 折叠/展开
      var header = e.target.closest('.test-group-header');
      if (header && !e.target.closest('.copy-btn')) {
        var groupId = header.getAttribute('data-group-id');
        if (groupId) {
          var body = document.getElementById('body-' + groupId);
          var icon = document.getElementById('icon-' + groupId);
          if (body) body.classList.toggle('expanded');
          if (icon) icon.classList.toggle('expanded');
        }
        return;
      }

      // 复制按钮
      var copyBtn = e.target.closest('.copy-btn');
      if (copyBtn) {
        e.stopPropagation();
        var cmd = copyBtn.getAttribute('data-cmd');
        navigator.clipboard.writeText(cmd).then(function() {
          copyBtn.textContent = '已复制!';
          copyBtn.classList.add('copied');
          setTimeout(function() {
            copyBtn.textContent = '复制';
            copyBtn.classList.remove('copied');
          }, 2000);
        });
        return;
      }

    });

    // 展开所有
    var expandAllBtn = document.getElementById('expand-all');
    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', function() {
        document.querySelectorAll('.test-group-body').forEach(function(el) {
          el.classList.add('expanded');
        });
        document.querySelectorAll('.toggle-icon').forEach(function(el) {
          el.classList.add('expanded');
        });
      });
    }

    // 收回所有
    var collapseAllBtn = document.getElementById('collapse-all');
    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', function() {
        document.querySelectorAll('.test-group-body').forEach(function(el) {
          el.classList.remove('expanded');
        });
        document.querySelectorAll('.toggle-icon').forEach(function(el) {
          el.classList.remove('expanded');
        });
      });
    }
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

// ============ /tests - Live Test Collection Browser ============
// Purpose: Expose actual Postman test cases for AI and humans to search
// Data source: postman/auto-generated/*.json (source of truth, not YAML summaries)
router.get('/tests', (_req: Request, res: Response) => {
  try {
    const postmanDir = path.join(process.cwd(), 'postman/auto-generated');
    const collections: Array<{
      filename: string;
      name: string;
      type: 'prd' | 'story' | 'other';
      id: string;
      testCases: Array<{ name: string; folder: string }>;
      totalTests: number;
      apiSequence: Array<{ step: number; name: string; method: string; path: string; folder: string }>;
    }> = [];

    // Read all Postman collection JSON files
    if (fs.existsSync(postmanDir)) {
      const files = fs.readdirSync(postmanDir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(postmanDir, file), 'utf-8'));
          const testCases: Array<{ name: string; folder: string }> = [];
          const apiSequence: Array<{ step: number; name: string; method: string; path: string; folder: string }> = [];
          let stepCounter = 0;

          // Extract test names AND API sequence recursively from Postman collection structure
          const extractTests = (items: any[], folder = '') => {
            if (!items) return;
            for (const item of items) {
              if (item.item) {
                // It's a folder
                extractTests(item.item, item.name || folder);
              } else if (item.name) {
                // It's a test request
                testCases.push({ name: item.name, folder });

                // Extract API method and path for sequence visualization
                stepCounter++;
                const method = item.request?.method || 'GET';
                let path = '';
                if (item.request?.url) {
                  if (typeof item.request.url === 'string') {
                    path = item.request.url.replace(/\{\{[^}]+\}\}/g, '').replace(/^https?:\/\/[^/]+/, '') || '/';
                  } else if (item.request.url.path) {
                    path = '/' + item.request.url.path.join('/');
                  } else if (item.request.url.raw) {
                    path = item.request.url.raw.replace(/\{\{[^}]+\}\}/g, '').replace(/^https?:\/\/[^/]+/, '') || '/';
                  }
                }
                apiSequence.push({ step: stepCounter, name: item.name, method, path, folder });
              }
            }
          };

          extractTests(content.item);

          // Determine type and ID from filename
          let type: 'prd' | 'story' | 'other' = 'other';
          let id = '';

          if (file.startsWith('prd-')) {
            type = 'prd';
            const match = file.match(/prd-(\d+)/);
            id = match ? `PRD-${match[1].padStart(3, '0')}` : file;
          } else if (file.startsWith('us-')) {
            type = 'story';
            const match = file.match(/us-(\d+)/);
            id = match ? `US-${match[1].padStart(3, '0')}` : file;
          }

          collections.push({
            filename: file,
            name: content.info?.name || file,
            type,
            id,
            testCases,
            totalTests: testCases.length,
            apiSequence
          });
        } catch (e) {
          logger.warn(`Failed to parse ${file}:`, e);
        }
      }
    }

    // Sort: PRDs first, then Stories, then Others
    collections.sort((a, b) => {
      const typeOrder = { prd: 0, story: 1, other: 2 };
      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.id.localeCompare(b.id);
    });

    // Calculate stats
    const prdCollections = collections.filter(c => c.type === 'prd');
    const storyCollections = collections.filter(c => c.type === 'story');
    const totalTests = collections.reduce((sum, c) => sum + c.totalTests, 0);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Collections - Live Source of Truth</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f7fa;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }

    .page-header {
      background: white;
      border-radius: 8px;
      padding: 24px 32px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .page-header h1 { font-size: 2em; color: #2c3e50; margin-bottom: 8px; }
    .page-header .subtitle { color: #7f8c8d; font-size: 1.1em; }
    .page-nav { margin-top: 16px; display: flex; gap: 16px; }
    .page-nav a { color: #3498db; text-decoration: none; }
    .page-nav a:hover { text-decoration: underline; }

    /* AI Guide Box */
    .ai-guide {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }
    .ai-guide h2 { font-size: 1.2em; margin-bottom: 12px; }
    .ai-guide p { opacity: 0.95; margin-bottom: 8px; }
    .ai-guide code { background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; }
    .ai-guide ul { margin-left: 20px; margin-top: 8px; }
    .ai-guide li { margin-bottom: 4px; }

    /* Stats Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    }
    .stat-card .number { font-size: 2.5em; font-weight: 700; color: #3498db; }
    .stat-card .label { color: #7f8c8d; font-size: 0.9em; margin-top: 4px; }

    /* Search Box */
    .search-box {
      background: white;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    }
    .search-box input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1em;
    }
    .search-box input:focus { outline: none; border-color: #3498db; }
    .search-hint { color: #7f8c8d; font-size: 0.85em; margin-top: 8px; }

    /* Collection Cards */
    .collection-card {
      background: white;
      border-radius: 8px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
      overflow: hidden;
    }
    .collection-header {
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      border-bottom: 1px solid #eee;
    }
    .collection-header:hover { background: #f8f9fa; }
    .collection-title { font-weight: 600; color: #2c3e50; }
    .collection-meta { display: flex; gap: 12px; align-items: center; }
    .badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.8em;
      font-weight: 500;
    }
    .badge-prd { background: #e8f4fd; color: #2980b9; }
    .badge-story { background: #e8fdf4; color: #27ae60; }
    .badge-other { background: #fdf4e8; color: #e67e22; }
    .test-count { color: #7f8c8d; font-size: 0.9em; }

    /* Test List */
    .test-list {
      display: none;
      padding: 16px 20px;
      background: #fafbfc;
    }
    .test-list.expanded { display: block; }
    .test-item {
      padding: 8px 12px;
      border-left: 3px solid #e0e0e0;
      margin-bottom: 6px;
      background: white;
      border-radius: 0 4px 4px 0;
    }
    .test-item.ac-test { border-left-color: #3498db; }
    .test-item .folder { color: #7f8c8d; font-size: 0.8em; margin-bottom: 2px; }
    .test-item .name { color: #2c3e50; }
    .test-item.highlight { background: #fff3cd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="page-header">
      <h1>🧪 Test Collections</h1>
      <p class="subtitle">Live source of truth - dynamically parsed from Postman JSON files</p>
      <div class="page-nav">
        <a href="/project-docs">← Documentation Hub</a>
        <a href="/coverage">Coverage Summary</a>
        <a href="/evaluation">Foundation Score</a>
      </div>
    </div>

    <!-- Why This Page Exists -->
    <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
      <h2 style="color: #856404; margin-bottom: 12px;">⚠️ Why This Page Exists (vs /coverage)</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
        <tr style="background: #ffeeba;">
          <th style="padding: 8px; text-align: left; border: 1px solid #ffc107;">Page</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #ffc107;">Data Source</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #ffc107;">Problem</th>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ffc107;"><strong>/coverage</strong></td>
          <td style="padding: 8px; border: 1px solid #ffc107;"><code>docs/test-coverage/_index.yaml</code></td>
          <td style="padding: 8px; border: 1px solid #ffc107;">❌ Summary written by humans - <em>may be outdated</em></td>
        </tr>
        <tr style="background: #d4edda;">
          <td style="padding: 8px; border: 1px solid #ffc107;"><strong>/tests</strong> (this page)</td>
          <td style="padding: 8px; border: 1px solid #ffc107;"><code>postman/auto-generated/*.json</code></td>
          <td style="padding: 8px; border: 1px solid #ffc107;">✅ Parsed from actual test files - <em>always current</em></td>
        </tr>
      </table>
      <p style="color: #856404;"><strong>Lesson learned (2025-12-22):</strong> When asked "Can operator scan QR from miniprogram?", the YAML summary said "covered" but actual tests showed individual steps tested, not the full E2E chain. This page exposes the <em>actual</em> test names so you can verify coverage yourself.</p>
    </div>

    <!-- Where Test Cases Come From -->
    <div style="background: #e8f4f8; border: 2px solid #17a2b8; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
      <h2 style="color: #0c5460; margin-bottom: 12px;">📂 Where These Test Cases Come From</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
        <tr style="background: #bee5eb;">
          <th style="padding: 8px; text-align: left; border: 1px solid #17a2b8;">Source</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #17a2b8;">Location</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #17a2b8;">Description</th>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #17a2b8;"><strong>Postman Collections</strong></td>
          <td style="padding: 8px; border: 1px solid #17a2b8;"><code>postman/auto-generated/*.json</code></td>
          <td style="padding: 8px; border: 1px solid #17a2b8;">AI-generated test collections for PRD and Story acceptance criteria</td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 8px; border: 1px solid #17a2b8;"><strong>Naming Convention</strong></td>
          <td style="padding: 8px; border: 1px solid #17a2b8;"><code>prd-NNN-*.json</code> or <code>us-NNN-*.json</code></td>
          <td style="padding: 8px; border: 1px solid #17a2b8;">PRD tests vs Story (User Story) tests</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #17a2b8;"><strong>Test Runner</strong></td>
          <td style="padding: 8px; border: 1px solid #17a2b8;"><code>npm run test:prd</code></td>
          <td style="padding: 8px; border: 1px solid #17a2b8;">Newman executes these collections against the running server</td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 8px; border: 1px solid #17a2b8;"><strong>Test Reports</strong></td>
          <td style="padding: 8px; border: 1px solid #17a2b8;"><code>reports/newman/*.xml</code></td>
          <td style="padding: 8px; border: 1px solid #17a2b8;">JUnit XML reports from test runs (pass/fail results)</td>
        </tr>
      </table>
      <div style="background: #fff; padding: 12px; border-radius: 4px; margin-top: 12px;">
        <p style="margin: 0 0 8px 0; color: #0c5460;"><strong>🔄 Test Lifecycle:</strong></p>
        <code style="display: block; color: #155724; background: #d4edda; padding: 8px; border-radius: 4px;">
PRD/Story doc → AI generates Postman collection → This page parses JSON → Newman runs tests → XML reports
        </code>
      </div>
    </div>

    <div class="ai-guide">
      <h2>🤖 For AI Agents & Humans</h2>
      <p>This page shows <strong>actual test case names</strong> parsed from <code>postman/auto-generated/*.json</code>.</p>
      <p><strong>Use this to answer questions like:</strong></p>
      <ul>
        <li>"Is feature X tested?" → Search for keywords in test names below</li>
        <li>"What does PRD-006 test?" → Expand the PRD-006 collection to see all tests</li>
        <li>"Is there an E2E test for [flow]?" → Look for tests that chain multiple steps</li>
        <li>"Does the QR scan flow have coverage?" → Search "QR" or "scan" to find actual tests</li>
      </ul>
      <p style="margin-top: 12px;"><strong>Trust level:</strong> ✅ These are the actual executable tests from Newman/Postman collections.</p>
    </div>

    <!-- E2E API Flows - Dynamically Parsed from Postman Collections -->
    <div style="background: #f0f7ff; border: 2px solid #3498db; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
      <h2 style="color: #2980b9; margin-bottom: 12px;">🔄 E2E API Flows (Parsed from Postman JSON)</h2>
      <p style="color: #34495e; margin-bottom: 16px;">Each test collection runs these API calls in sequence. This is the actual E2E chain that Newman executes.</p>

      <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
        <button id="showAllFlowsBtn" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Show All Flows</button>
        <button id="hideAllFlowsBtn" style="padding: 8px 16px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer;">Hide All</button>
        <span style="color: #7f8c8d; margin-left: 12px; align-self: center;">Click a collection to see its API sequence</span>
      </div>

      ${collections.filter(c => c.type === 'prd' || c.type === 'story').map(c => `
      <div style="background: white; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px; overflow: hidden;" class="flow-card">
        <div class="flow-header" data-target="flow-${c.filename.replace(/[^a-zA-Z0-9]/g, '-')}"
             style="padding: 12px 16px; background: ${c.type === 'prd' ? '#e8f4fd' : '#e8fdf4'}; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-weight: 600; color: #2c3e50;">${c.id}</span>
            <span style="color: #7f8c8d; margin-left: 8px; font-size: 0.9em;">${c.name}</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="background: ${c.type === 'prd' ? '#2980b9' : '#27ae60'}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8em;">${c.apiSequence.length} API calls</span>
            <span style="color: #7f8c8d;">▼</span>
          </div>
        </div>
        <div id="flow-${c.filename.replace(/[^a-zA-Z0-9]/g, '-')}" style="display: none; padding: 16px; background: #fafbfc;">
          <div style="font-family: monospace; font-size: 0.85em;">
            ${c.apiSequence.map((api, idx) => `
            <div style="display: flex; align-items: flex-start; margin-bottom: 8px; ${idx < c.apiSequence.length - 1 ? 'border-left: 2px solid #3498db; padding-left: 16px; margin-left: 8px;' : 'padding-left: 16px; margin-left: 8px;'}">
              <span style="background: ${api.method === 'GET' ? '#27ae60' : api.method === 'POST' ? '#3498db' : api.method === 'PUT' ? '#f39c12' : api.method === 'DELETE' ? '#e74c3c' : '#95a5a6'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.75em; min-width: 50px; text-align: center; margin-right: 8px;">${api.method}</span>
              <div style="flex: 1;">
                <code style="color: #2c3e50;">${api.path || '/'}</code>
                <div style="color: #7f8c8d; font-size: 0.85em; margin-top: 2px;">${api.name}</div>
              </div>
            </div>
            `).join('')}
          </div>
        </div>
      </div>
      `).join('')}

      <div style="background: #d4edda; padding: 12px; border-radius: 4px; margin-top: 16px;">
        <p style="margin: 0; color: #155724;"><strong>✅ Key insight:</strong> Each collection above represents a complete E2E flow. Newman runs the requests in order, passing variables between steps (e.g., order_id from creation → payment → QR generation).</p>
      </div>
    </div>

    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // Show All Flows button
        var showBtn = document.getElementById('showAllFlowsBtn');
        if (showBtn) {
          showBtn.addEventListener('click', function() {
            document.querySelectorAll('[id^="flow-"]').forEach(function(el) { el.style.display = 'block'; });
          });
        }

        // Hide All Flows button
        var hideBtn = document.getElementById('hideAllFlowsBtn');
        if (hideBtn) {
          hideBtn.addEventListener('click', function() {
            document.querySelectorAll('[id^="flow-"]').forEach(function(el) { el.style.display = 'none'; });
          });
        }

        // Flow headers (toggle individual flows)
        document.querySelectorAll('.flow-header').forEach(function(header) {
          header.addEventListener('click', function() {
            var targetId = this.getAttribute('data-target');
            var target = document.getElementById(targetId);
            if (target) {
              target.style.display = target.style.display === 'none' ? 'block' : 'none';
            }
          });
        });
      });
    </script>

    <div class="stats-row">
      <div class="stat-card">
        <div class="number">${collections.length}</div>
        <div class="label">Test Collections</div>
      </div>
      <div class="stat-card">
        <div class="number">${totalTests}</div>
        <div class="label">Total Test Cases</div>
      </div>
      <div class="stat-card">
        <div class="number">${prdCollections.length}</div>
        <div class="label">PRD Collections</div>
      </div>
      <div class="stat-card">
        <div class="number">${storyCollections.length}</div>
        <div class="label">Story Collections</div>
      </div>
    </div>

    <div class="search-box">
      <div style="display: flex; gap: 12px; align-items: center;">
        <input type="text" id="searchInput" placeholder="Search test cases... (e.g., 'operator scan', 'QR', 'AC-3.2')" style="flex: 1;">
        <button id="expandAllBtn" style="padding: 10px 16px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; white-space: nowrap;">Expand All</button>
        <button id="collapseAllBtn" style="padding: 10px 16px; background: #95a5a6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; white-space: nowrap;">Collapse All</button>
      </div>
      <p class="search-hint">Search across all ${totalTests} test cases. Matching tests will be highlighted.</p>
    </div>

    ${collections.map(c => `
    <div class="collection-card" data-collection="${c.filename}">
      <div class="collection-header" data-filename="${c.filename}">
        <span class="collection-title">${c.id || c.name}</span>
        <div class="collection-meta">
          <span class="badge badge-${c.type}">${c.type.toUpperCase()}</span>
          <span class="test-count">${c.totalTests} tests</span>
        </div>
      </div>
      <div class="test-list" id="list-${c.filename.replace(/\./g, '-')}">
        ${c.testCases.map(t => `
        <div class="test-item ${t.name.includes('AC-') ? 'ac-test' : ''}" data-name="${t.name.toLowerCase()}">
          ${t.folder ? `<div class="folder">📁 ${t.folder}</div>` : ''}
          <div class="name">${t.name}</div>
        </div>
        `).join('')}
      </div>
    </div>
    `).join('')}
  </div>

  <script>
    // Track which collections user has manually toggled
    const userToggledCollections = new Set();

    function expandAll() {
      document.querySelectorAll('.test-list').forEach(list => {
        list.classList.add('expanded');
      });
      // Also show all test items (in case search had hidden some)
      document.querySelectorAll('.test-item').forEach(item => {
        item.style.display = '';
      });
      // Clear the toggle tracking since user explicitly expanded all
      userToggledCollections.clear();
    }

    function collapseAll() {
      document.querySelectorAll('.test-list').forEach(list => {
        list.classList.remove('expanded');
      });
      // Clear the toggle tracking since user explicitly collapsed all
      userToggledCollections.clear();
    }

    function toggleCollection(filename) {
      const listId = 'list-' + filename.replace(/\\./g, '-');
      const list = document.getElementById(listId);
      const isExpanded = list.classList.contains('expanded');

      // Track user's manual toggle
      if (isExpanded) {
        userToggledCollections.add(filename + '-collapsed');
        userToggledCollections.delete(filename + '-expanded');
      } else {
        userToggledCollections.add(filename + '-expanded');
        userToggledCollections.delete(filename + '-collapsed');
      }

      list.classList.toggle('expanded');
    }

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase();
      const testItems = document.querySelectorAll('.test-item');
      const collections = document.querySelectorAll('.collection-card');

      if (!query) {
        // Clear search: remove highlights and collapse all (unless user manually expanded)
        testItems.forEach(item => {
          item.classList.remove('highlight');
          item.style.display = '';
        });
        collections.forEach(c => {
          const filename = c.getAttribute('data-collection');
          // Only collapse if user hasn't manually expanded this one
          if (!userToggledCollections.has(filename + '-expanded')) {
            c.querySelector('.test-list').classList.remove('expanded');
          }
        });
        return;
      }

      // During search: show/hide items and auto-expand matching collections
      collections.forEach(c => {
        const filename = c.getAttribute('data-collection');
        const list = c.querySelector('.test-list');
        const items = c.querySelectorAll('.test-item');
        let hasMatch = false;

        items.forEach(item => {
          const name = item.getAttribute('data-name');
          if (name.includes(query)) {
            item.classList.add('highlight');
            item.style.display = '';
            hasMatch = true;
          } else {
            item.classList.remove('highlight');
            item.style.display = 'none';
          }
        });

        // Auto-expand collections with matches, collapse those without
        // But respect user's manual toggle
        if (hasMatch) {
          if (!userToggledCollections.has(filename + '-collapsed')) {
            list.classList.add('expanded');
          }
        } else {
          if (!userToggledCollections.has(filename + '-expanded')) {
            list.classList.remove('expanded');
          }
        }
      });
    });

    // Attach event listeners (CSP-compliant, no inline handlers)
    document.getElementById('expandAllBtn').addEventListener('click', expandAll);
    document.getElementById('collapseAllBtn').addEventListener('click', collapseAll);

    // Collection header click handlers
    document.querySelectorAll('.collection-header').forEach(header => {
      header.addEventListener('click', function() {
        const filename = this.getAttribute('data-filename');
        toggleCollection(filename);
      });
    });

    // Expand all if URL has ?expand=all
    if (window.location.search.includes('expand=all')) {
      document.querySelectorAll('.test-list').forEach(list => list.classList.add('expanded'));
    }
  </script>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    logger.error('Error loading tests page:', error);
    res.status(500).json({ error: 'Failed to load tests page' });
  }
});

// Helper function to get purpose description for reference files
function getReferenceFilePurpose(filename: string): string {
  const purposes: Record<string, string> = {
    'AI-TEST-GENERATION.md': 'Guide for AI to generate Postman test collections',
    'API-CHANGE-MANAGEMENT.md': 'Breaking vs non-breaking API changes workflow',
    'CEO-CONTEXT.md': 'CEO evaluation framework and questions',
    'DOCUMENT-LAYER-DECISION.md': 'When to create PRD vs Story vs Card',
    'DOCUMENT-SPEC.md': 'Document templates and lifecycle',
    'DOCUMENTATION-SITE.md': 'Documentation site implementation details',
    'DUPLICATE-PREVENTION.md': 'How to avoid duplicate stories/cards',
    'EXPERIENCE-LEARNING.md': 'Lessons learned and best practices',
    'KNOWLEDGE-GRAPH.md': 'Cross-story dependency tracking',
    'NATURAL-LANGUAGE-OPTIMIZATION.md': 'Converting user requests to specs',
    'NEWMAN-REPORT-STANDARD.md': 'Test report naming conventions',
    'PRODUCT-ARCHITECTURE.md': 'Multi-platform product flowcharts',
    'REFACTORING-IMPACT.md': 'Impact analysis for code changes',
    'RESEARCH-CONTEXT.md': 'Strategic memo system and research workflow',
    'RESTFUL-API-DESIGN.md': 'RESTful API design standards',
    'RUNBOOK-TEMPLATE.md': 'E2E test runbook template',
    'TC-REGISTRY-SPEC.md': 'Test coverage registry specification',
    'TROUBLESHOOTING.md': 'Common issues and solutions',
    'developer-rules.md': 'Developer guidelines and rules',
    'evaluation-questions.yaml': 'Foundation evaluation questions by role',
  };
  return purposes[filename] || 'Reference documentation';
}

// ============ AI Site Directory / Knowledge Base ============
// Comprehensive project knowledge base for AI agents and external systems
router.get('/ai-sitemap', (_req: Request, res: Response) => {
  try {
    const prdDocs = loadPRDDocuments();
    const stories = loadStoriesIndex();
    const cardStats = getCardStats();
    const coverageStats = getCoverageStats();

    // Read test collections
    const postmanDir = path.join(process.cwd(), 'postman/auto-generated');
    const testCollections: string[] = [];
    if (fs.existsSync(postmanDir)) {
      testCollections.push(...fs.readdirSync(postmanDir).filter(f => f.endsWith('.json')));
    }

    // Load cards for detailed listing
    const cards = loadCardDocuments();

    // Load reference documents
    const referenceDir = path.join(process.cwd(), 'docs/reference');
    const referenceFiles = fs.existsSync(referenceDir)
      ? fs.readdirSync(referenceDir).filter(f => f.endsWith('.md') || f.endsWith('.yaml'))
      : [];

    // Load case studies
    const casesDir = path.join(process.cwd(), 'docs/cases');
    const caseFiles = fs.existsSync(casesDir)
      ? fs.readdirSync(casesDir).filter(f => f.endsWith('.md'))
      : [];

    // Load integration runbooks
    const integrationDir = path.join(process.cwd(), 'docs/integration');
    const runbookFiles = fs.existsSync(integrationDir)
      ? fs.readdirSync(integrationDir).filter(f => f.endsWith('.md'))
      : [];

    // Load memos
    const memosDir = path.join(process.cwd(), 'docs/memos');
    const memoFiles = fs.existsSync(memosDir)
      ? fs.readdirSync(memosDir).filter(f => f.endsWith('.md'))
      : [];

    // Load source modules
    const modulesDir = path.join(process.cwd(), 'src/modules');
    const moduleNames = fs.existsSync(modulesDir)
      ? fs.readdirSync(modulesDir).filter(f => fs.statSync(path.join(modulesDir, f)).isDirectory())
      : [];

    const sitemap = {
      _meta: {
        description: 'Machine-readable institutional knowledge of the Synque project',
        generated: new Date().toISOString(),
        version: '3.0',
        significance: {
          problem: 'AI context is ephemeral. Conversations reset. Knowledge is lost.',
          solution: 'The project itself exposes its complete state as structured data.',
        },
        capabilities: [
          'AI Onboarding - Any AI agent can understand the entire project in one request',
          'Knowledge Continuity - When context is lost, fetch this endpoint to reconstruct understanding',
          'Verification - Answer "Is X ready?" by checking actual sources, not summaries',
          'External Integration - Other systems can programmatically navigate the project',
        ],
        recovery_protocol: [
          '1. Fetch /ai-sitemap',
          '2. Read project.description and summary',
          '3. For specific questions, navigate knowledge_sources',
          '4. For "Is X ready?" questions, follow verification_guide',
        ],
      },
      project: {
        name: 'Synque Express API',
        description: 'Cruise ticketing platform with B2B/B2C integration, mini-program support, and venue operations',
        tech_stack: {
          runtime: 'Node.js 24+',
          framework: 'Express 5.1',
          language: 'TypeScript',
          database: 'MySQL (TypeORM)',
          testing: 'Newman/Postman',
          docs: 'OpenAPI 3.0.3',
        },
      },
      knowledge_sources: {
        documentation: {
          description: 'Structured documentation following PRD → Story → Card hierarchy',
          sources: [
            {
              type: 'PRD',
              description: 'Product Requirements Documents - business goals, success metrics',
              location: 'docs/prd/*.md',
              web_path: '/prd',
              count: prdDocs.length,
              items: prdDocs.map(p => ({
                id: p.metadata.prd_id,
                title: p.title,
                status: p.metadata.status,
                path: `/prd/${p.metadata.prd_id}`,
                file: `docs/prd/${p.metadata.prd_id}.md`,
              })),
            },
            {
              type: 'Story',
              description: 'User Stories - user capabilities, acceptance criteria (black box)',
              location: 'docs/stories/_index.yaml + docs/stories/*.md',
              web_path: '/stories',
              count: stories.length,
              items: stories.map(s => ({
                id: s.id,
                title: s.title,
                status: s.status,
                prd: s.business_requirement,
                path: `/stories/${s.id}`,
              })),
            },
            {
              type: 'Card',
              description: 'Implementation Cards - API contracts, technical specs (white box)',
              location: 'docs/cards/*.md',
              web_path: '/cards',
              count: cardStats.total,
              stats: cardStats,
              items: cards.map(c => ({
                slug: c.metadata.slug,
                title: c.title,
                status: c.metadata.status,
                related_stories: c.metadata.related_stories,
                path: `/cards/${c.metadata.slug}`,
                file: `docs/cards/${c.metadata.slug}.md`,
              })),
            },
            {
              type: 'Memo',
              description: 'Strategic Memos - synthesized thinking, value propositions',
              location: 'docs/memos/*.md',
              web_path: '/memos',
              count: memoFiles.length,
              items: memoFiles.map(f => ({
                file: f,
                path: `/memos/${f.replace('.md', '')}`,
              })),
            },
          ],
        },
        reference_guides: {
          description: 'Developer guides, standards, and workflows',
          location: 'docs/reference/',
          files: referenceFiles.map(f => ({
            name: f,
            file: `docs/reference/${f}`,
            purpose: getReferenceFilePurpose(f),
          })),
        },
        case_studies: {
          description: 'Real-world implementation examples and lessons learned',
          location: 'docs/cases/',
          files: caseFiles.map(f => ({
            name: f,
            file: `docs/cases/${f}`,
          })),
        },
        integration_runbooks: {
          description: 'Step-by-step E2E test flows for each user story',
          location: 'docs/integration/',
          count: runbookFiles.length,
          files: runbookFiles.map(f => ({
            name: f,
            file: `docs/integration/${f}`,
            story_id: f.match(/US-(\d+)/)?.[0] || null,
          })),
        },
        testing: {
          description: 'Test collections and coverage tracking',
          sources: [
            {
              type: 'Postman Collections',
              description: 'Actual executable tests (SOURCE OF TRUTH)',
              location: 'postman/auto-generated/*.json',
              web_path: '/tests',
              trust_level: 'HIGH - parsed from actual test files',
              count: testCollections.length,
              collections: testCollections,
            },
            {
              type: 'Coverage Summary',
              description: 'YAML summary of test coverage (may be outdated)',
              location: 'docs/test-coverage/_index.yaml',
              web_path: '/coverage',
              trust_level: 'MEDIUM - manually maintained',
              stats: coverageStats,
            },
            {
              type: 'Newman Reports',
              description: 'JUnit XML test results',
              location: 'reports/newman/*.xml',
            },
          ],
        },
        codebase: {
          description: 'Source code organization',
          modules: moduleNames.map(m => ({
            name: m,
            path: `src/modules/${m}/`,
            typical_files: ['router.ts', 'service.ts', 'types.ts'],
          })),
          key_files: [
            { file: 'src/types/domain.ts', purpose: 'Core type definitions (Single Source of Truth)' },
            { file: 'src/core/mock/', purpose: 'Mock data for development' },
            { file: 'openapi/openapi.json', purpose: 'OpenAPI specification' },
            { file: 'CLAUDE.md', purpose: 'AI development guide and rules' },
          ],
        },
      },
      web_endpoints: {
        description: 'Available HTTP endpoints (see knowledge_sources for detailed item listings)',
        navigation: [
          { path: '/project-docs', title: 'Documentation Hub', type: 'html' },
          { path: '/ai-sitemap', title: 'AI Knowledge Base', type: 'json' },
        ],
        documentation: [
          { path: '/prd', title: 'PRD List', pattern: '/prd/:prdId' },
          { path: '/stories', title: 'User Stories', pattern: '/stories/:storyId' },
          { path: '/cards', title: 'Implementation Cards', pattern: '/cards/:cardSlug' },
          { path: '/memos', title: 'Strategic Memos', pattern: '/memos/:memoId' },
        ],
        testing: [
          { path: '/tests', title: 'Test Collections (Source of Truth)', trust: 'HIGH' },
          { path: '/coverage', title: 'Coverage Summary', trust: 'MEDIUM - may be outdated' },
        ],
        evaluation: [
          { path: '/compliance', title: 'Compliance Dashboard' },
          { path: '/evaluation', title: 'Foundation Score' },
        ],
        visualization: [
          { path: '/sitemap', title: 'Documentation Sitemap' },
          { path: '/graph', title: 'Relationship Graph' },
          { path: '/architecture', title: 'Product Architecture' },
        ],
        api: [
          { path: '/docs', title: 'Swagger UI (OpenAPI)' },
          { path: '/healthz', title: 'Health Check', type: 'json' },
        ],
        external: [
          { path: '/prd-docs', title: 'Directus PRD Viewer', pattern: '/prd-docs/:fileId' },
        ],
      },
      verification_guide: {
        description: 'How to answer "Is feature X ready?" questions',
        steps: [
          '1. TRACE CODE: Search src/modules/**/*.ts for implementation',
          '2. FIND TESTS: Check /tests page or parse postman/auto-generated/*.json',
          '3. CHECK COVERAGE: Individual steps tested? Full E2E chain tested?',
          '4. RUN TEST: npm run test:prd {N} for actual pass/fail',
        ],
        trust_levels: {
          'docs/test-coverage/_index.yaml': 'Summary - may be outdated',
          'postman/auto-generated/*.json': 'Source of truth - actual tests',
          'src/modules/**/*.ts': 'Source of truth - actual implementation',
        },
        example: {
          question: 'Can operator scan QR from miniprogram?',
          checks: [
            { step: 'Code exists?', method: 'grep scan/qr in src/', result: 'Found in qr-generation/, operatorValidation/' },
            { step: 'Tests exist?', method: 'Check /tests for AC-3.2, A7.1', result: 'Individual steps tested' },
            { step: 'E2E chain?', method: 'Look for chained test', result: 'Gap - no full chain test' },
          ],
        },
      },
      summary: {
        documentation: {
          total_prds: prdDocs.length,
          total_stories: stories.length,
          total_cards: cardStats.total,
          total_memos: memoFiles.length,
          cards_done: cardStats.byStatus.Done || 0,
          cards_in_progress: cardStats.byStatus['In Progress'] || 0,
        },
        testing: {
          total_test_collections: testCollections.length,
          total_runbooks: runbookFiles.length,
        },
        reference: {
          total_reference_docs: referenceFiles.length,
          total_case_studies: caseFiles.length,
        },
        codebase: {
          total_modules: moduleNames.length,
        },
      },
    };

    res.json(sitemap);
  } catch (error) {
    logger.error('Error generating AI sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});

// Documentation Hub - Main landing page
router.get('/project-docs', (_req, res) => {
  try {
    const prdStats = { total: loadPRDDocuments().length };
    const storyStats = { total: loadStoriesIndex().length };
    const cardStats = getCardStats();
    const memoStats = getMemoStats();
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
      { href: '/memos', icon: '💡', title: 'Strategic Memos', desc: 'Synthesized thinking, value propositions, and strategic analysis', stats: `Total: ${memoStats.total} memos` },
      { href: '/prd', icon: '📋', title: 'PRD Documents', desc: 'Product Requirements Documents with detailed specifications', stats: `Total: ${prdStats.total} documents` },
      { href: '/stories', icon: '📖', title: 'User Stories', desc: 'User stories linking business requirements to technical implementation', stats: `Total: ${storyStats.total} stories` },
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
