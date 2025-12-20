/**
 * Compliance Dashboard Route Handler
 *
 * 显示文档合规性审计报告
 */

import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { runComplianceAudit, ComplianceReport, ComplianceViolation } from '../../../utils/complianceAuditor';
import { baseLayout, sharedStyles } from '../templates/base';
import { componentStyles } from '../templates/components';
import { complianceStyles } from '../styles';

/**
 * Compliance 页面专用样式
 */
const compliancePageStyles = `
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
`;

/**
 * 生成统计卡片
 */
function generateStatsGrid(report: ComplianceReport): string {
  const compliantFiles = report.stats.prds.compliant +
    report.stats.stories.compliant +
    report.stats.cards.compliant;

  return `
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
        <div class="stat-value">${compliantFiles}</div>
        <div class="stat-subtitle">Following all rules</div>
      </div>
    </div>`;
}

/**
 * 生成快速修复建议
 */
function generateQuickWins(quickWins: string[]): string {
  if (quickWins.length === 0) return '';

  const items = quickWins.map(win => `<li>${win}</li>`).join('');

  return `
    <div class="quick-wins">
      <h3>🚀 Quick Wins (Fix These First)</h3>
      <ul>${items}</ul>
    </div>`;
}

/**
 * 生成违规表格
 */
function generateViolationsTable(violations: ComplianceViolation[]): string {
  if (violations.length === 0) {
    return `
    <div class="empty-state">
      <h3>🎉 Perfect Compliance!</h3>
      <p>All documentation follows the standards. Great work!</p>
    </div>`;
  }

  const rows = violations.map(v => `
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
          </tr>`).join('');

  return `
    <div class="section">
      <h2 class="section-title">Compliance Violations (${violations.length})</h2>
      <table class="violations-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Category</th>
            <th>File</th>
            <th>Issue & Fix</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/**
 * 处理 /compliance 路由
 */
export function handleCompliance(_req: Request, res: Response): void {
  try {
    const report = runComplianceAudit();

    // 构建页面头部
    let content = `
    <div class="header">
      <h1>📊 Documentation Compliance Dashboard</h1>
      <a href="/project-docs" class="back-link">← Back to Docs Hub</a>
    </div>`;

    // 分数卡片
    content += `
    <div class="score-card">
      <div class="score-number">${report.overall_score}%</div>
      <div class="score-label">Overall Compliance Score</div>
    </div>`;

    // 统计网格
    content += generateStatsGrid(report);

    // 快速修复
    content += generateQuickWins(report.summary.quick_wins);

    // 违规表格
    content += generateViolationsTable(report.violations);

    // 时间戳
    content += `
    <div class="timestamp">
      Last updated: ${new Date(report.timestamp).toLocaleString()}
    </div>`;

    // 组装完整页面
    const html = baseLayout(
      {
        title: 'Documentation Compliance Dashboard',
        containerClass: 'wide',
        styles: `${componentStyles}\n${complianceStyles}\n${compliancePageStyles}`
      },
      content
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
}
