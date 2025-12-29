/**
 * 测试用例 HTML 渲染服务
 * 将测试用例和 AC 覆盖数据转换为 HTML
 */

import { loadAllTestCases, FeatureTestCases } from '../../../utils/testCaseParser';
import { loadPRDCoverageWithTests } from '../../../utils/acParser';

// ============ 测试用例 HTML 生成 ============

/**
 * 为 QA 生成详细的测试用例 HTML
 * 从 docs/test-cases/ 目录的 YAML 文件加载
 */
export function generateTestCasesHTML(): string {
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

// ============ AC 覆盖率 HTML 生成 ============

/**
 * 生成 AC 覆盖 HTML
 * PRD → Card → AC 层级结构，包含测试结果
 */
export function generateACCoverageHTML(): string {
  const prdCoverage = loadPRDCoverageWithTests();

  if (prdCoverage.length === 0) {
    return '<p style="color: #666;">暂无 AC 覆盖数据。请确保 docs/cards/ 目录下有包含验收标准的 Card 文件。</p>';
  }

  // 计算总数
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
