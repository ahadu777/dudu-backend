/**
 * Coverage Handler
 * 处理 /coverage 路由 - 测试覆盖率统计和 Newman 测试报告
 */

import { Request, Response } from 'express';
import * as path from 'path';
import { logger } from '../../../utils/logger';
import { extractPrdTestData, PrdTestData, TestCaseDetail } from '../../../utils/newmanParser';
import { extractStoryTestData, groupTestCasesByFunction, FunctionGroup, MergedTestCase } from '../../../utils/runbookParser';

// ============ 页面样式 ============

const coverageStyles = `
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

    /* Tab 导航 */
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

    /* 头部 Banner */
    .header-banner {
      background: white;
      padding: 0;
      border-radius: 0;
      margin-bottom: 24px;
      display: none;
    }

    /* 统计卡片 */
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

    /* Section Header */
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

    /* Info Box */
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

    /* Test Group */
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

    /* 响应式 */
    @media (max-width: 768px) {
      .stats-row { flex-direction: column; }
      .tc-header { flex-wrap: wrap; }
    }
`;

// ============ HTML 生成函数 ============

function generatePrdTestCards(prdTestData: PrdTestData[]): string {
  if (prdTestData.length === 0) {
    return '<div class="empty-state"><div class="icon">📭</div><p>暂无 PRD 测试数据，请先运行 Newman 测试</p></div>';
  }

  return prdTestData.map((prd: PrdTestData, idx: number) => `
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
  `).join('');
}

function generateFunctionGroupCards(functionGroups: FunctionGroup[]): string {
  if (functionGroups.length === 0) {
    return '<div class="empty-state"><div class="icon">📭</div><p>暂无 QA E2E 测试清单，请在 Runbook 中添加测试用例。</p></div>';
  }

  return functionGroups.map((group: FunctionGroup, idx: number) => `
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
  `).join('');
}

function generateClientScript(): string {
  return `
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
  </script>`;
}

// ============ Route Handler ============

/**
 * 处理 /coverage 路由
 */
export function handleCoverage(req: Request, res: Response): void {
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
  <style>${coverageStyles}</style>
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
    ${isPrdTab ? generatePrdTestCards(prdTestData) : ''}

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
    ${isStoryTab ? generateFunctionGroupCards(functionGroups) : ''}

  </div>

  ${generateClientScript()}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error loading coverage data:', error);
    res.status(500).json({ error: 'Failed to load coverage data' });
  }
}
