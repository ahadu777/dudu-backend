/**
 * Tests Handler
 * 处理 /tests 路由 - 测试集合展示页面
 */

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '../../../utils/logger';
import { loadPRDDocuments, loadStoriesIndex } from '../../../utils/prdParser';
import { discoverCrossPRDHandoffs } from '../../../utils/handoffDiscovery';
import { parseAllNewmanReports, NewmanReport } from '../../../utils/newmanParser';

// 断言标签映射文件路径
const ASSERTION_LABELS_PATH = path.join(process.cwd(), 'docs/test-coverage/assertion-labels.yaml');
// 手动验证记录文件路径
const MANUAL_CHECKS_PATH = path.join(process.cwd(), 'docs/test-coverage/manual-checks.yaml');

// 断言标签缓存
let assertionLabelsCache: Map<string, string> | null = null;
let assertionLabelsCacheTime = 0;
const CACHE_TTL = 5000; // 5秒缓存

// 手动验证记录类型
interface ManualCheck {
  id: string;
  description: string;
  verified_by: string;
  date: string;
  status: 'passed' | 'failed' | 'pending';
}

interface ManualChecksData {
  checks: Record<string, ManualCheck[]>;
}

// 手动验证缓存
let manualChecksCache: ManualChecksData | null = null;
let manualChecksCacheTime = 0;

/**
 * 加载手动验证记录
 */
function loadManualChecks(): ManualChecksData {
  const now = Date.now();
  if (manualChecksCache && (now - manualChecksCacheTime) < CACHE_TTL) {
    return manualChecksCache;
  }

  let data: ManualChecksData = { checks: {} };
  try {
    if (fs.existsSync(MANUAL_CHECKS_PATH)) {
      const content = fs.readFileSync(MANUAL_CHECKS_PATH, 'utf-8');
      const parsed = yaml.load(content) as ManualChecksData;
      if (parsed?.checks) {
        data = parsed;
      }
    }
  } catch (e) {
    logger.warn('Failed to load manual checks:', e);
  }

  manualChecksCache = data;
  manualChecksCacheTime = now;
  return data;
}

/**
 * 保存手动验证记录
 */
function saveManualChecks(data: ManualChecksData): void {
  const yamlContent = `# Manual Checks - QA 手动验证记录
#
# 此文件由 /tests 页面维护，记录 QA 手动测试的验证点
#
# 格式:
#   checks:
#     PRD-XXX:
#       - id: "唯一ID"
#         description: "验证描述"
#         verified_by: "验证人"
#         date: "验证日期"
#         status: "passed | failed | pending"

checks:
${Object.entries(data.checks)
  .filter(([, items]) => items.length > 0)
  .map(([prd, items]) => `  ${prd}:
${items.map(item => `    - id: "${item.id}"
      description: "${item.description.replace(/"/g, '\\"')}"
      verified_by: "${item.verified_by}"
      date: "${item.date}"
      status: "${item.status}"`).join('\n')}`).join('\n') || '  {}'}
`;
  fs.writeFileSync(MANUAL_CHECKS_PATH, yamlContent, 'utf-8');
  manualChecksCache = null; // 清除缓存
}

/**
 * 生成唯一ID
 */
function generateCheckId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * 加载断言标签映射
 */
function loadAssertionLabels(): Map<string, string> {
  const now = Date.now();
  if (assertionLabelsCache && (now - assertionLabelsCacheTime) < CACHE_TTL) {
    return assertionLabelsCache;
  }

  const labels = new Map<string, string>();
  try {
    if (fs.existsSync(ASSERTION_LABELS_PATH)) {
      const content = fs.readFileSync(ASSERTION_LABELS_PATH, 'utf-8');
      const data = yaml.load(content) as { labels?: Record<string, string> };
      if (data?.labels) {
        for (const [key, value] of Object.entries(data.labels)) {
          labels.set(key, value);
        }
      }
    }
  } catch (e) {
    logger.warn('Failed to load assertion labels:', e);
  }

  assertionLabelsCache = labels;
  assertionLabelsCacheTime = now;
  return labels;
}

/**
 * 获取断言的人性化标签
 */
function getAssertionLabel(name: string): string {
  const labels = loadAssertionLabels();
  return labels.get(name) || name;
}

// ============ 类型定义 ============

interface TestCase {
  name: string;
  folder: string;
}

interface Assertion {
  name: string;
  passed: boolean;
}

interface ApiCall {
  step: number;
  name: string;
  method: string;
  path: string;
  folder: string;
  userAction: string;
  flow?: {
    sequence: number;
    page: string;
    trigger: string;
    produces: string[];
    consumes: string[];
  };
  assertions?: Assertion[];
}

interface TestResult {
  passed: number;
  failed: number;
  total: number;
  timestamp: string;
}

interface CollectionAssertions {
  total: number;
  passed: number;
  failed: number;
  items: Assertion[];
}

interface Collection {
  filename: string;
  name: string;
  type: 'prd' | 'story' | 'other';
  id: string;
  testCases: TestCase[];
  totalTests: number;
  apiSequence: ApiCall[];
  testResult: TestResult | null;
  assertions?: CollectionAssertions;
}

interface TestCaseWithoutDescription {
  collectionId: string;
  collectionName: string;
  testName: string;
}

// ============ 辅助函数 ============

/**
 * 解析 Newman XML 报告获取测试结果
 */
function parseNewmanReport(reportPath: string): TestResult | null {
  try {
    if (!fs.existsSync(reportPath)) return null;
    const xml = fs.readFileSync(reportPath, 'utf-8');

    const testsuitesMatch = xml.match(/<testsuites[^>]*tests="(\d+)"[^>]*>/);
    const timestampMatch = xml.match(/timestamp="([^"]+)"/);

    const failuresMatches = xml.match(/failures="(\d+)"/g) || [];
    const errorsMatches = xml.match(/errors="(\d+)"/g) || [];

    const totalFailures = failuresMatches.reduce((sum, m) => {
      const match = m.match(/failures="(\d+)"/);
      return sum + (match ? parseInt(match[1], 10) : 0);
    }, 0);

    const totalErrors = errorsMatches.reduce((sum, m) => {
      const match = m.match(/errors="(\d+)"/);
      return sum + (match ? parseInt(match[1], 10) : 0);
    }, 0);

    const total = testsuitesMatch ? parseInt(testsuitesMatch[1], 10) : 0;
    const failed = totalFailures + totalErrors;
    const passed = total - failed;

    let timestamp = '';
    if (timestampMatch) {
      const date = new Date(timestampMatch[1]);
      timestamp = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    return { passed, failed, total, timestamp };
  } catch {
    return null;
  }
}

/**
 * 从 Postman 集合项中提取测试用例和 API 序列
 */
function extractTests(
  items: any[],
  testCases: TestCase[],
  apiSequence: ApiCall[],
  folder = '',
  stepCounter = { value: 0 }
): void {
  if (!items) return;

  for (const item of items) {
    if (item.item) {
      extractTests(item.item, testCases, apiSequence, item.name || folder, stepCounter);
    } else if (item.name) {
      testCases.push({ name: item.name, folder });

      stepCounter.value++;
      const method = item.request?.method || 'GET';
      let itemPath = '';

      if (item.request?.url) {
        if (typeof item.request.url === 'string') {
          itemPath = item.request.url.replace(/\{\{[^}]+\}\}/g, '').replace(/^https?:\/\/[^/]+/, '') || '/';
        } else if (item.request.url.path) {
          itemPath = '/' + item.request.url.path.join('/');
        } else if (item.request.url.raw) {
          itemPath = item.request.url.raw.replace(/\{\{[^}]+\}\}/g, '').replace(/^https?:\/\/[^/]+/, '') || '/';
        }
      }

      const userAction = item.description || '';
      const xFlow = item['x-flow'];
      const flow = xFlow ? {
        sequence: xFlow.sequence ?? 0,
        page: xFlow.page ?? '',
        trigger: xFlow.trigger ?? '',
        produces: xFlow.produces ?? [],
        consumes: xFlow.consumes ?? []
      } : undefined;

      apiSequence.push({
        step: stepCounter.value,
        name: item.name,
        method,
        path: itemPath,
        folder,
        userAction,
        flow
      });
    }
  }
}

/**
 * 从 Newman 报告中提取断言结果
 * 返回两个 Map：
 * - byId: 按 PRD/Story ID 索引的汇总结果
 * - byPath: 按 "folder / name" 路径索引的单个 API 断言
 */
function buildAssertionMaps(newmanReports: NewmanReport[]): {
  byId: Map<string, CollectionAssertions>;
  byPath: Map<string, Assertion[]>;
} {
  const byId = new Map<string, CollectionAssertions>();
  const byPath = new Map<string, Assertion[]>();

  for (const report of newmanReports) {
    const id = report.prdId || report.storyId;
    const allAssertions: Assertion[] = [];

    for (const suite of report.testSuites) {
      // suite.name 格式: "文件夹 / 请求名" 或 "文件夹 / 请求名 [AC-xxx]"
      const assertions: Assertion[] = suite.testCases.map(tc => ({
        name: tc.name,
        passed: tc.passed
      }));

      if (assertions.length > 0) {
        // 按完整路径存储（用于 API 级别匹配）
        byPath.set(suite.name, assertions);
        allAssertions.push(...assertions);
      }
    }

    // 按 PRD/Story ID 汇总（用于 Collection 级别显示）
    if (id && allAssertions.length > 0) {
      byId.set(id, {
        total: allAssertions.length,
        passed: allAssertions.filter(a => a.passed).length,
        failed: allAssertions.filter(a => !a.passed).length,
        items: allAssertions
      });
    }
  }

  return { byId, byPath };
}

/**
 * 加载所有 Postman 测试集合
 */
function loadCollections(): Collection[] {
  const postmanDir = path.join(process.cwd(), 'postman/auto-generated');
  const reportsDir = path.join(process.cwd(), 'reports/newman');
  const collections: Collection[] = [];

  if (!fs.existsSync(postmanDir)) return collections;

  // 加载所有 Newman 报告并构建断言映射
  const newmanReports = parseAllNewmanReports(reportsDir);
  const { byId: assertionById, byPath: assertionByPath } = buildAssertionMaps(newmanReports);

  const files = fs.readdirSync(postmanDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(postmanDir, file), 'utf-8'));
      const testCases: TestCase[] = [];
      const apiSequence: ApiCall[] = [];

      extractTests(content.item, testCases, apiSequence);

      // 为每个 API 调用匹配断言结果
      for (const api of apiSequence) {
        // 构建匹配路径: "folder / name"
        const matchPath = `${api.folder} / ${api.name}`;
        const assertions = assertionByPath.get(matchPath);
        if (assertions) {
          api.assertions = assertions;
        }
      }

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
      } else {
        // 其他类型使用文件名作为 id
        id = file.replace('.postman_collection.json', '').replace('.json', '');
      }

      const reportBaseName = file.replace('.postman_collection.json', '').replace('.json', '');
      const reportPath = path.join(reportsDir, `${reportBaseName}-e2e.xml`);
      const testResult = parseNewmanReport(reportPath);

      // 从 Newman 报告获取该 Collection 的断言结果
      const collectionAssertions = assertionById.get(id);

      collections.push({
        filename: file,
        name: content.info?.name || file,
        type,
        id,
        testCases,
        totalTests: testCases.length,
        apiSequence,
        testResult,
        assertions: collectionAssertions
      });
    } catch (e) {
      logger.warn(`Failed to parse ${file}:`, e);
    }
  }

  collections.sort((a, b) => {
    const typeOrder = { prd: 0, story: 1, other: 2 };
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return a.id.localeCompare(b.id);
  });

  return collections;
}

// ============ HTML 生成 ============

/**
 * 生成页面样式
 */
function getStyles(): string {
  return `
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
    .flow-card { transition: opacity 0.2s ease, transform 0.2s ease; }

    /* 弹窗样式 */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    }
    .modal-overlay.active { display: flex; }
    .modal {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 480px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.2s ease;
    }
    @keyframes modalSlideIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #eee;
    }
    .modal-header h3 { font-size: 1.1em; color: #2c3e50; margin: 0; }
    .modal-close {
      background: none;
      border: none;
      font-size: 1.5em;
      color: #999;
      cursor: pointer;
      line-height: 1;
    }
    .modal-close:hover { color: #e74c3c; }
    .modal-body { padding: 20px; }
    .form-group { margin-bottom: 16px; }
    .form-group label {
      display: block;
      font-size: 0.9em;
      color: #555;
      margin-bottom: 6px;
      font-weight: 500;
    }
    .form-group input, .form-group textarea {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 0.95em;
      transition: border-color 0.2s;
    }
    .form-group input:focus, .form-group textarea:focus {
      outline: none;
      border-color: #f39c12;
    }
    .form-group textarea { resize: vertical; min-height: 80px; }
    .radio-group {
      display: flex;
      gap: 16px;
      margin-top: 8px;
    }
    .radio-group label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-weight: normal;
    }
    .radio-group input[type="radio"] { margin: 0; }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid #eee;
      background: #fafafa;
      border-radius: 0 0 12px 12px;
    }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 0.95em;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-cancel { background: #e0e0e0; color: #555; }
    .btn-cancel:hover { background: #d0d0d0; }
    .btn-primary { background: #f39c12; color: white; }
    .btn-primary:hover { background: #e67e22; }
  `;
}

/**
 * 生成 E2E 流程卡片 HTML
 */
function generateFlowCardHtml(c: Collection, manualChecks: ManualCheck[]): string {
  const PAGE_STYLES: Record<string, { icon: string; color: string }> = {
    'system': { icon: '⚙️', color: '#6b7280' },
    'product-list': { icon: '🏠', color: '#3b82f6' },
    'product-detail': { icon: '📦', color: '#10b981' },
    'order-confirm': { icon: '💳', color: '#f59e0b' },
    'my-orders': { icon: '📋', color: '#8b5cf6' },
    'order-detail': { icon: '📄', color: '#6366f1' },
    'checkout': { icon: '💰', color: '#ef4444' },
    'my-tickets': { icon: '🎫', color: '#14b8a6' },
    'venue-scan': { icon: '📷', color: '#ec4899' }
  };

  const hasFlowData = c.apiSequence.some(api => api.flow?.page);
  const flowId = `flow-${c.filename.replace(/[^a-zA-Z0-9]/g, '-')}`;

  let flowContent: string;

  if (!hasFlowData) {
    // 原始列表视图
    flowContent = `
      <div style="font-family: monospace; font-size: 0.85em;">
        ${c.apiSequence.map((api, idx) => `
        <div style="display: flex; align-items: flex-start; margin-bottom: 8px; ${idx < c.apiSequence.length - 1 ? 'border-left: 2px solid #3498db; padding-left: 16px; margin-left: 8px;' : 'padding-left: 16px; margin-left: 8px;'}">
          <span style="background: ${api.method === 'GET' ? '#27ae60' : api.method === 'POST' ? '#3498db' : api.method === 'PUT' ? '#f39c12' : api.method === 'DELETE' ? '#e74c3c' : '#95a5a6'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.75em; min-width: 50px; text-align: center; margin-right: 8px;">${api.method}</span>
          <div style="flex: 1;">
            <code style="color: #2c3e50;">${api.path || '/'}</code>
            <div style="color: #7f8c8d; font-size: 0.85em; margin-top: 2px;">${api.name}</div>
            ${api.userAction ? `<div style="color: #8e44ad; font-size: 0.85em; margin-top: 4px; padding: 4px 8px; background: #f5eef8; border-radius: 3px; display: inline-block;">👤 ${api.userAction}</div>` : ''}
            ${api.assertions && api.assertions.length > 0 ? `
            <div style="margin-top: 6px; padding: 6px 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid ${api.assertions.every(a => a.passed) ? '#27ae60' : '#e74c3c'};">
              <div style="font-size: 0.85em; color: #666; margin-bottom: 4px;">断言 (${api.assertions.filter(a => a.passed).length}/${api.assertions.length})</div>
              ${api.assertions.map(a => {
                const label = getAssertionLabel(a.name);
                const isCustom = label !== a.name;
                return `<div class="assertion-item" style="font-size: 0.85em; color: ${a.passed ? '#27ae60' : '#e74c3c'}; display: flex; align-items: center; gap: 4px;">
                  <span>${a.passed ? '✓' : '✗'} ${label}</span>
                  <button class="edit-label-btn" data-original="${a.name}" data-current="${label}" style="background: none; border: none; cursor: pointer; font-size: 0.8em; color: #999; padding: 0 4px;" title="编辑标签">✏️</button>
                  ${isCustom ? `<span style="font-size: 0.7em; color: #999;" title="原始: ${a.name}">*</span>` : ''}
                </div>`;
              }).join('')}
            </div>
            ` : ''}
          </div>
        </div>
        `).join('')}
      </div>
    `;
  } else {
    // 页面分组视图
    const pageGroups = new Map<string, ApiCall[]>();
    for (const api of c.apiSequence) {
      const page = api.flow?.page || 'unknown';
      if (!pageGroups.has(page)) pageGroups.set(page, []);
      pageGroups.get(page)!.push(api);
    }

    const sortedPages = Array.from(pageGroups.entries()).sort((a, b) => {
      const seqA = a[1][0]?.flow?.sequence ?? 0;
      const seqB = b[1][0]?.flow?.sequence ?? 0;
      return seqA - seqB;
    });

    // 数据流
    const dataFlowMap = new Map<string, { producedBy: string[]; consumedBy: string[] }>();
    for (const api of c.apiSequence) {
      if (!api.flow) continue;
      for (const v of api.flow.produces || []) {
        if (!dataFlowMap.has(v)) dataFlowMap.set(v, { producedBy: [], consumedBy: [] });
        dataFlowMap.get(v)!.producedBy.push(api.name);
      }
      for (const v of api.flow.consumes || []) {
        if (!dataFlowMap.has(v)) dataFlowMap.set(v, { producedBy: [], consumedBy: [] });
        dataFlowMap.get(v)!.consumedBy.push(api.name);
      }
    }

    const dataFlowHtml = dataFlowMap.size > 0 ? `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 16px; margin-bottom: 16px; color: white;">
        <div style="font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>🔗</span> 数据流 Data Flow
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${Array.from(dataFlowMap.entries()).map(([variable, data]) => `
            <div style="background: rgba(255,255,255,0.2); border-radius: 6px; padding: 8px 12px; font-size: 0.85em;">
              <code style="background: rgba(255,255,255,0.3); padding: 2px 6px; border-radius: 3px; font-weight: 600;">${variable}</code>
              <div style="margin-top: 4px; opacity: 0.9; font-size: 0.85em;">
                ${data.producedBy.length > 0 ? `<span title="Produced by">⬆️ ${data.producedBy.length}</span>` : ''}
                ${data.consumedBy.length > 0 ? `<span style="margin-left: 8px;" title="Consumed by">⬇️ ${data.consumedBy.length}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    const pagesHtml = sortedPages.map(([page, apis], pageIdx) => {
      const style = PAGE_STYLES[page] || { icon: '📄', color: '#6b7280' };
      return `
        <div style="margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 8px 12px; background: ${style.color}15; border-left: 4px solid ${style.color}; border-radius: 0 6px 6px 0;">
            <span style="font-size: 1.2em;">${style.icon}</span>
            <span style="font-weight: 600; color: ${style.color};">${page}</span>
            <span style="color: #95a5a6; font-size: 0.9em;">(${apis.length} requests)</span>
          </div>
          ${apis.map((api, idx) => `
          <div style="display: flex; align-items: flex-start; margin-bottom: 8px; padding-left: 24px; ${idx < apis.length - 1 ? 'border-left: 2px solid ' + style.color + '40; margin-left: 16px;' : 'margin-left: 16px;'}">
            <div style="display: flex; flex-direction: column; align-items: center; margin-right: 12px;">
              <span style="background: ${api.method === 'GET' ? '#27ae60' : api.method === 'POST' ? '#3498db' : api.method === 'PUT' ? '#f39c12' : api.method === 'DELETE' ? '#e74c3c' : '#95a5a6'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.75em; min-width: 50px; text-align: center;">${api.method}</span>
              ${api.flow?.sequence !== undefined ? `<span style="color: #95a5a6; font-size: 0.7em; margin-top: 2px;">#${api.flow.sequence}</span>` : ''}
            </div>
            <div style="flex: 1;">
              <code style="color: #2c3e50;">${api.path || '/'}</code>
              <div style="color: #7f8c8d; font-size: 0.85em; margin-top: 2px;">${api.name}</div>
              ${api.userAction ? `<div style="color: #8e44ad; font-size: 0.85em; margin-top: 4px; padding: 4px 8px; background: #f5eef8; border-radius: 3px; display: inline-block;">👤 ${api.userAction}</div>` : ''}
              ${api.flow?.trigger ? `<div style="color: #2980b9; font-size: 0.8em; margin-top: 4px;"><span style="background: #e8f4fd; padding: 2px 6px; border-radius: 3px;">🖱️ ${api.flow.trigger}</span></div>` : ''}
              ${(api.flow?.produces?.length || api.flow?.consumes?.length) ? `
              <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
                ${api.flow?.produces?.map(v => `<span style="background: #d4edda; color: #155724; padding: 2px 6px; border-radius: 3px; font-size: 0.75em;">⬆️ ${v}</span>`).join('') || ''}
                ${api.flow?.consumes?.map(v => `<span style="background: #cce5ff; color: #004085; padding: 2px 6px; border-radius: 3px; font-size: 0.75em;">⬇️ ${v}</span>`).join('') || ''}
              </div>
              ` : ''}
              ${api.assertions && api.assertions.length > 0 ? `
              <div style="margin-top: 6px; padding: 6px 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid ${api.assertions.every(a => a.passed) ? '#27ae60' : '#e74c3c'};">
                <div style="font-size: 0.75em; color: #666; margin-bottom: 4px;">断言 (${api.assertions.filter(a => a.passed).length}/${api.assertions.length})</div>
                ${api.assertions.map(a => {
                  const label = getAssertionLabel(a.name);
                  const isCustom = label !== a.name;
                  return `<div class="assertion-item" style="font-size: 0.75em; color: ${a.passed ? '#27ae60' : '#e74c3c'}; display: flex; align-items: center; gap: 4px;">
                    <span>${a.passed ? '✓' : '✗'} ${label}</span>
                    <button class="edit-label-btn" data-original="${a.name}" data-current="${label}" style="background: none; border: none; cursor: pointer; font-size: 0.8em; color: #999; padding: 0 4px;" title="编辑标签">✏️</button>
                    ${isCustom ? `<span style="font-size: 0.7em; color: #999;" title="原始: ${a.name}">*</span>` : ''}
                  </div>`;
                }).join('')}
              </div>
              ` : ''}
            </div>
          </div>
          `).join('')}
        </div>
        ${pageIdx < sortedPages.length - 1 ? `<div style="text-align: center; margin: 12px 0; color: #95a5a6;">↓</div>` : ''}
      `;
    }).join('');

    flowContent = `
      ${dataFlowHtml}
      <div style="font-family: monospace; font-size: 0.85em;">
        ${pagesHtml}
      </div>
    `;
  }

  const testResultIcon = c.testResult
    ? (c.testResult.failed === 0 ? '<span style="color: #27ae60; font-size: 1.2em;">✅</span>' : '<span style="color: #e74c3c; font-size: 1.2em;">❌</span>')
    : '<span style="color: #95a5a6; font-size: 1.2em;">⏸️</span>';

  const testResultBadge = c.testResult
    ? `<span style="background: ${c.testResult.failed === 0 ? '#27ae60' : '#e74c3c'}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8em;">${c.testResult.passed}/${c.testResult.total} pass</span>
       <span style="color: #95a5a6; font-size: 0.75em;" title="Last run">${c.testResult.timestamp}</span>`
    : `<span style="color: #95a5a6; font-size: 0.8em;">No results</span>`;

  // 断言统计 badge
  const assertionsBadge = c.assertions
    ? `<span style="background: ${c.assertions.failed === 0 ? '#8e44ad' : '#c0392b'}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8em;" title="Newman assertions">${c.assertions.passed}/${c.assertions.total} assertions</span>`
    : '';

  return `
    <div style="background: white; border: 1px solid ${c.testResult ? (c.testResult.failed === 0 ? '#27ae60' : '#e74c3c') : '#ddd'}; border-radius: 6px; margin-bottom: 12px; overflow: hidden;" class="flow-card">
      <div class="flow-header" data-target="${flowId}"
           style="padding: 12px 16px; background: ${c.type === 'prd' ? '#e8f4fd' : c.type === 'story' ? '#e8fdf4' : '#fdf4e8'}; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${testResultIcon}
          <span style="font-weight: 600; color: #2c3e50;">${c.id}</span>
          <span style="color: #7f8c8d; font-size: 0.9em;">${c.name}</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${testResultBadge}
          ${assertionsBadge}
          <span style="background: ${c.type === 'prd' ? '#2980b9' : c.type === 'story' ? '#27ae60' : '#e67e22'}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8em;">${c.apiSequence.length} API calls</span>
          <span style="color: #7f8c8d;">▼</span>
        </div>
      </div>
      <div id="${flowId}" style="display: none; padding: 16px; background: #fafbfc;">
        ${flowContent}
        ${c.assertions && c.assertions.items.length > 0 ? `
        <div style="margin-top: 16px; padding: 12px; background: #f8f4fc; border-radius: 6px; border-left: 4px solid ${c.assertions.failed === 0 ? '#8e44ad' : '#c0392b'};">
          <div style="font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
            Newman 断言结果 (${c.assertions.passed}/${c.assertions.total})
          </div>
          <div style="max-height: 200px; overflow-y: auto; font-size: 0.85em;">
            ${c.assertions.items.map(a => `
              <div style="padding: 2px 0; color: ${a.passed ? '#27ae60' : '#e74c3c'};">
                ${a.passed ? '✓' : '✗'} ${a.name}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- 手动验证区域 -->
        <div style="margin-top: 16px; padding: 12px; background: #fff8e6; border-radius: 6px; border-left: 4px solid #f39c12;" class="manual-checks-section" data-prd="${c.id}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 600; color: #2c3e50;">📝 QA 手动验证 (${manualChecks.length})</span>
            <button class="add-check-btn" data-prd="${c.id}" style="background: #f39c12; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85em;">+ 添加</button>
          </div>
          ${manualChecks.length > 0 ? `
          <div class="manual-checks-list" style="font-size: 0.85em;">
            ${manualChecks.map(check => `
            <div class="manual-check-item" data-id="${check.id}" style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f0e6d3;">
              <button class="check-status-btn" data-id="${check.id}" data-status="${check.status}" style="background: none; border: none; cursor: pointer; font-size: 1.1em;" title="点击切换状态">
                ${check.status === 'passed' ? '✅' : check.status === 'failed' ? '❌' : '⏳'}
              </button>
              <span style="flex: 1; color: #2c3e50;">${check.description}</span>
              <span style="color: #999; font-size: 0.8em;">${check.verified_by} · ${check.date}</span>
              <button class="delete-check-btn" data-id="${check.id}" data-prd="${c.id}" style="background: none; border: none; cursor: pointer; color: #e74c3c; font-size: 0.9em;" title="删除">🗑️</button>
            </div>
            `).join('')}
          </div>
          ` : `
          <div style="color: #999; font-size: 0.85em; text-align: center; padding: 12px;">
            暂无手动验证记录，点击"+ 添加"开始记录
          </div>
          `}
        </div>
      </div>
    </div>
  `;
}

/**
 * 生成脚本
 */
function getScripts(): string {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      var showBtn = document.getElementById('showAllFlowsBtn');
      if (showBtn) {
        showBtn.addEventListener('click', function() {
          document.querySelectorAll('[id^="flow-"]').forEach(function(el) { el.style.display = 'block'; });
        });
      }

      var hideBtn = document.getElementById('hideAllFlowsBtn');
      if (hideBtn) {
        hideBtn.addEventListener('click', function() {
          document.querySelectorAll('[id^="flow-"]').forEach(function(el) { el.style.display = 'none'; });
        });
      }

      document.querySelectorAll('.flow-header').forEach(function(header) {
        header.addEventListener('click', function() {
          var targetId = this.getAttribute('data-target');
          var target = document.getElementById(targetId);
          if (target) {
            target.style.display = target.style.display === 'none' ? 'block' : 'none';
          }
        });
      });

      var searchInput = document.getElementById('flowSearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          var query = this.value.toLowerCase().trim();
          var flowCards = document.querySelectorAll('.flow-card');

          flowCards.forEach(function(card) {
            var cardText = card.textContent.toLowerCase();
            if (query === '' || cardText.includes(query)) {
              card.style.opacity = '1';
              card.style.transform = 'scale(1)';
              if (query !== '') {
                var flowContent = card.querySelector('[id^="flow-"]');
                if (flowContent) flowContent.style.display = 'block';
              }
            } else {
              card.style.opacity = '0.3';
              card.style.transform = 'scale(0.98)';
            }
          });
        });
      }

      // 断言标签编辑功能
      document.querySelectorAll('.edit-label-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var original = this.getAttribute('data-original');
          var current = this.getAttribute('data-current');
          var newLabel = prompt('编辑断言标签:\\n\\n原始: ' + original + '\\n\\n输入新标签 (留空恢复原始):', current);

          if (newLabel !== null) {
            var labelToSave = newLabel.trim() || original;
            fetch('/api/assertion-labels', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ original: original, label: labelToSave })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data.success) {
                alert('已保存! 刷新页面查看更新。');
                location.reload();
              } else {
                alert('保存失败: ' + (data.error || '未知错误'));
              }
            })
            .catch(function(err) {
              alert('保存失败: ' + err.message);
            });
          }
        });
      });

      // 弹窗元素
      var modal = document.getElementById('addCheckModal');
      var modalClose = document.getElementById('modalClose');
      var modalCancel = document.getElementById('modalCancel');
      var modalSave = document.getElementById('modalSave');
      var checkPrd = document.getElementById('checkPrd');
      var checkDescription = document.getElementById('checkDescription');
      var checkVerifiedBy = document.getElementById('checkVerifiedBy');

      console.log('Modal elements:', {
        modal: !!modal,
        checkPrd: !!checkPrd,
        checkDescription: !!checkDescription,
        checkVerifiedBy: !!checkVerifiedBy
      });

      function openModal(prd) {
        console.log('openModal called with prd:', prd);
        // 直接从 DOM 获取元素
        var prdInput = document.getElementById('checkPrd');
        var descInput = document.getElementById('checkDescription');
        var verifiedByInput = document.getElementById('checkVerifiedBy');
        var modalEl = document.getElementById('addCheckModal');
        var pendingRadio = document.querySelector('input[name="checkStatus"][value="pending"]');

        console.log('openModal elements:', { prdInput: !!prdInput, descInput: !!descInput, modalEl: !!modalEl });

        if (prdInput) {
          prdInput.value = prd || '';
          console.log('Set prdInput.value to:', prdInput.value);
        }
        if (descInput) {
          descInput.value = '';
        }
        if (verifiedByInput) {
          verifiedByInput.value = 'QA';
        }
        if (pendingRadio) {
          pendingRadio.checked = true;
        }
        if (modalEl) {
          modalEl.classList.add('active');
        }
        if (descInput) {
          descInput.focus();
        }
      }

      function closeModal() {
        modal.classList.remove('active');
      }

      function saveCheck() {
        // 直接从 DOM 获取元素，避免变量作用域问题
        var prdInput = document.getElementById('checkPrd');
        var descInput = document.getElementById('checkDescription');
        var verifiedByInput = document.getElementById('checkVerifiedBy');
        var statusRadio = document.querySelector('input[name="checkStatus"]:checked');
        var saveBtn = document.getElementById('modalSave');

        var prd = prdInput ? prdInput.value : '';
        var description = descInput ? descInput.value.trim() : '';
        var verifiedBy = verifiedByInput ? verifiedByInput.value.trim() || 'QA' : 'QA';
        var status = statusRadio ? statusRadio.value : 'pending';

        console.log('saveCheck:', { prd: prd, description: description, verifiedBy: verifiedBy, status: status });
        console.log('Elements found:', { prdInput: !!prdInput, descInput: !!descInput });

        if (!prd) {
          alert('系统错误：无法获取 PRD ID，请刷新页面重试');
          return;
        }

        if (!description) {
          alert('请输入验证描述');
          if (descInput) descInput.focus();
          return;
        }

        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = '保存中...';
        }

        fetch('/api/manual-checks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prd: prd,
            description: description,
            verified_by: verifiedBy,
            status: status
          })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.success) {
            // 动态添加到列表，不刷新页面
            var check = data.check;
            var section = document.querySelector('.manual-checks-section[data-prd="' + prd + '"]');
            if (section) {
              var list = section.querySelector('.manual-checks-list');
              var emptyMsg = section.querySelector('div[style*="text-align: center"]');

              // 如果是空状态，创建列表容器
              if (!list) {
                if (emptyMsg) emptyMsg.remove();
                list = document.createElement('div');
                list.className = 'manual-checks-list';
                list.style.fontSize = '0.85em';
                section.appendChild(list);
              }

              // 创建新的验证项
              var statusIcon = check.status === 'passed' ? '✅' : check.status === 'failed' ? '❌' : '⏳';
              var newItem = document.createElement('div');
              newItem.className = 'manual-check-item';
              newItem.setAttribute('data-id', check.id);
              newItem.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f0e6d3;';
              newItem.innerHTML = '<button class="check-status-btn" data-id="' + check.id + '" data-status="' + check.status + '" style="background: none; border: none; cursor: pointer; font-size: 1.1em;" title="点击切换状态">' + statusIcon + '</button>' +
                '<span style="flex: 1; color: #2c3e50;">' + check.description + '</span>' +
                '<span style="color: #999; font-size: 0.8em;">' + check.verified_by + ' · ' + check.date + '</span>' +
                '<button class="delete-check-btn" data-id="' + check.id + '" data-prd="' + prd + '" style="background: none; border: none; cursor: pointer; color: #e74c3c; font-size: 0.9em;" title="删除">🗑️</button>';
              list.appendChild(newItem);

              // 绑定新按钮的事件
              bindCheckEvents(newItem);

              // 更新计数
              var countSpan = section.querySelector('span[style*="font-weight: 600"]');
              if (countSpan) {
                var count = section.querySelectorAll('.manual-check-item').length;
                countSpan.textContent = '📝 QA 手动验证 (' + count + ')';
              }
            }

            // 关闭弹窗
            closeModal();
            if (saveBtn) {
              saveBtn.disabled = false;
              saveBtn.textContent = '保存';
            }
          } else {
            alert('添加失败: ' + (data.error || '未知错误'));
            if (saveBtn) {
              saveBtn.disabled = false;
              saveBtn.textContent = '保存';
            }
          }
        })
        .catch(function(err) {
          alert('添加失败: ' + err.message);
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '保存';
          }
        });
      }

      // 绑定验证项的事件
      function bindCheckEvents(item) {
        var statusBtn = item.querySelector('.check-status-btn');
        var deleteBtn = item.querySelector('.delete-check-btn');

        if (statusBtn) {
          statusBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var id = this.getAttribute('data-id');
            var currentStatus = this.getAttribute('data-status');
            var statusMap = { 'pending': 'passed', 'passed': 'failed', 'failed': 'pending' };
            var newStatus = statusMap[currentStatus] || 'pending';
            var btn = this;

            fetch('/api/manual-checks/' + id, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data.success) {
                btn.setAttribute('data-status', newStatus);
                btn.textContent = newStatus === 'passed' ? '✅' : newStatus === 'failed' ? '❌' : '⏳';
              } else {
                alert('更新失败: ' + (data.error || '未知错误'));
              }
            })
            .catch(function(err) {
              alert('更新失败: ' + err.message);
            });
          });
        }

        if (deleteBtn) {
          deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!confirm('确定删除此验证记录？')) return;
            var id = this.getAttribute('data-id');
            var prd = this.getAttribute('data-prd');
            var itemEl = this.closest('.manual-check-item');

            fetch('/api/manual-checks/' + id + '?prd=' + encodeURIComponent(prd), {
              method: 'DELETE'
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data.success) {
                if (itemEl) itemEl.remove();
                // 更新计数
                var section = document.querySelector('.manual-checks-section[data-prd="' + prd + '"]');
                if (section) {
                  var countSpan = section.querySelector('span[style*="font-weight: 600"]');
                  if (countSpan) {
                    var count = section.querySelectorAll('.manual-check-item').length;
                    countSpan.textContent = '📝 QA 手动验证 (' + count + ')';
                  }
                }
              } else {
                alert('删除失败: ' + (data.error || '未知错误'));
              }
            })
            .catch(function(err) {
              alert('删除失败: ' + err.message);
            });
          });
        }
      }

      // 弹窗事件绑定
      if (modalClose) modalClose.addEventListener('click', closeModal);
      if (modalCancel) modalCancel.addEventListener('click', closeModal);
      if (modalSave) modalSave.addEventListener('click', saveCheck);
      if (modal) {
        modal.addEventListener('click', function(e) {
          if (e.target === modal) closeModal();
        });
      }

      // 键盘事件
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
          closeModal();
        }
      });

      // 手动验证 - 添加按钮
      document.querySelectorAll('.add-check-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var prd = this.getAttribute('data-prd');
          openModal(prd);
        });
      });

      // 绑定已有验证项的事件（不刷新页面）
      document.querySelectorAll('.manual-check-item').forEach(function(item) {
        bindCheckEvents(item);
      });
    });
  `;
}

// ============ Route Handler ============

/**
 * 处理 /tests 路由
 */
export function handleTests(_req: Request, res: Response): void {
  try {
    const collections = loadCollections();
    const manualChecksData = loadManualChecks();

    // 加载文档统计
    const prdDocs = loadPRDDocuments();
    const storyDocs = loadStoriesIndex();

    const prdDocsCount = prdDocs.length;
    const prdCollectionsCount = collections.filter(c => c.type === 'prd').length;

    const storyDocsCount = storyDocs.length;
    const storyCollectionsCount = collections.filter(c => c.type === 'story').length;

    // 提取 PRD IDs
    const prdDocIds = prdDocs.map(doc => {
      const match = doc.filename?.match(/^PRD-(\d+)/i);
      return match ? match[1] : null;
    }).filter(Boolean) as string[];

    const prdTestIds = collections
      .filter(c => c.type === 'prd')
      .map(c => {
        const match = c.filename.match(/^prd-(\d+)/i);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];

    const missingTestPrds = prdDocIds.filter(id => !prdTestIds.includes(id));
    const prdGap = missingTestPrds.length;

    // 提取 Story IDs
    const storyDocIds = storyDocs.map(story => story.id).filter(Boolean) as string[];
    const storyTestIds = collections
      .filter(c => c.type === 'story')
      .map(c => {
        const match = c.filename.match(/^us-(\d+[a-zA-Z]?)/i);
        return match ? 'US-' + match[1].toUpperCase() : null;
      })
      .filter(Boolean) as string[];

    const missingTestStories = storyDocIds.filter(id => !storyTestIds.includes(id));
    const storyGap = missingTestStories.length;

    // 检测缺少描述的测试用例
    const testCasesWithoutDescription: TestCaseWithoutDescription[] = [];
    collections.forEach(c => {
      c.apiSequence.forEach(api => {
        if (!api.userAction || api.userAction.trim() === '') {
          testCasesWithoutDescription.push({
            collectionId: c.id,
            collectionName: c.name,
            testName: api.name
          });
        }
      });
    });

    const totalApiCalls = collections.reduce((sum, c) => sum + c.apiSequence.length, 0);
    const missingDescriptionCount = testCasesWithoutDescription.length;
    const descriptionCoverage = totalApiCalls > 0 ? Math.round((totalApiCalls - missingDescriptionCount) / totalApiCalls * 100) : 100;

    // 跨 PRD 分析
    const discoveredHandoffs = discoverCrossPRDHandoffs();
    const testedHandoffs = discoveredHandoffs.map(h => {
      const sourcePaths = h.source.paths || [];
      const targetPaths = h.target.paths || [];

      const hasChainedTest = collections.some(c => {
        const collectionPaths = c.apiSequence.map(a => a.path.toLowerCase());
        const hasSource = sourcePaths.some(sp =>
          collectionPaths.some(cp => cp.includes(sp.split('/').pop()?.toLowerCase() || ''))
        );
        const hasTarget = targetPaths.some(tp =>
          collectionPaths.some(cp => cp.includes(tp.split('/').pop()?.toLowerCase() || ''))
        );
        return hasSource && hasTarget;
      });

      return {
        source: { prd: h.source.prd, output: sourcePaths[0] || h.source.story || '', desc: h.source.action || h.source.story || '' },
        target: { prd: h.target.prd, input: targetPaths[0] || h.target.story || '', desc: h.target.action || h.target.story || '' },
        userFlow: h.userFlow,
        gapQuestion: h.gapQuestion,
        isTested: hasChainedTest
      };
    });

    const gaps = testedHandoffs.filter(h => !h.isTested);
    const covered = testedHandoffs.filter(h => h.isTested);

    // 生成 HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Collections - Live Source of Truth</title>
  <style>${getStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="page-header">
      <h1>🧪 Test Collections</h1>
      <p class="subtitle">Live source of truth - dynamically parsed from Postman JSON files</p>
      <div class="page-nav">
        <a href="/project-docs">← Documentation Hub</a>
        <a href="/evaluation">Foundation Score</a>
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
      </ul>
      <p style="margin-top: 12px;"><strong>Trust level:</strong> ✅ These are the actual executable tests from Newman/Postman collections.</p>
    </div>

    <div class="stats-row">
      <div class="stat-card" style="border: 2px solid ${prdGap === 0 ? '#27ae60' : '#e74c3c'};">
        <div class="number" style="color: ${prdGap === 0 ? '#27ae60' : '#e74c3c'};">${prdCollectionsCount}/${prdDocsCount}</div>
        <div class="label">PRD Test Coverage</div>
        ${prdGap > 0
          ? `<div style="color: #e74c3c; font-size: 0.8em; margin-top: 4px;">⚠️ Missing: ${missingTestPrds.map(id => 'PRD-' + id).join(', ')}</div>`
          : `<div style="color: #27ae60; font-size: 0.8em; margin-top: 4px;">✅ All PRDs have tests</div>`}
      </div>
      <div class="stat-card" style="border: 2px solid ${storyGap === 0 ? '#27ae60' : '#e74c3c'};">
        <div class="number" style="color: ${storyGap === 0 ? '#27ae60' : '#e74c3c'};">${storyCollectionsCount}/${storyDocsCount}</div>
        <div class="label">Story Test Coverage</div>
        ${storyGap > 0
          ? `<div style="color: #e74c3c; font-size: 0.8em; margin-top: 4px;">⚠️ ${storyGap} stories missing tests</div>`
          : `<div style="color: #27ae60; font-size: 0.8em; margin-top: 4px;">✅ All Stories have tests</div>`}
      </div>
      <div class="stat-card" style="border: 2px solid ${descriptionCoverage >= 80 ? '#27ae60' : descriptionCoverage >= 50 ? '#f39c12' : '#e74c3c'};">
        <div class="number" style="color: ${descriptionCoverage >= 80 ? '#27ae60' : descriptionCoverage >= 50 ? '#f39c12' : '#e74c3c'};">${descriptionCoverage}%</div>
        <div class="label">User Action Context</div>
      </div>
      <div class="stat-card">
        <div class="number" style="color: #9b59b6;">${totalApiCalls}</div>
        <div class="label">Total API Calls</div>
      </div>
    </div>

    <div class="search-box">
      <input type="text" id="flowSearchInput" placeholder="Search API calls, test names, or descriptions..." />
      <div class="search-hint">💡 Type to filter. Matching cards will be highlighted, non-matching will be dimmed.</div>
    </div>

    <div style="background: #f0f7ff; border: 2px solid #3498db; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
      <h2 style="color: #2980b9; margin-bottom: 12px;">🔄 E2E API Flows (Parsed from Postman JSON)</h2>
      <p style="color: #34495e; margin-bottom: 16px;">Each test collection runs these API calls in sequence.</p>

      <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
        <button id="showAllFlowsBtn" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Show All Flows</button>
        <button id="hideAllFlowsBtn" style="padding: 8px 16px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer;">Hide All</button>
      </div>

      ${collections.map(c => generateFlowCardHtml(c, manualChecksData.checks[c.id] || [])).join('')}
    </div>

    <!-- Cross-PRD Gap Analysis -->
    <div style="background: #fff5f5; border: 2px solid #e74c3c; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
      <h2 style="color: #c0392b; margin-bottom: 12px;">🔴 Cross-PRD Gap Analysis (Handoff Points)</h2>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 20px;">
        <div style="background: white; padding: 16px; border-radius: 6px; text-align: center; border: 2px solid ${gaps.length > 0 ? '#e74c3c' : '#27ae60'};">
          <div style="font-size: 2em; font-weight: 700; color: ${gaps.length > 0 ? '#e74c3c' : '#27ae60'};">${gaps.length}</div>
          <div style="color: #7f8c8d; font-size: 0.85em;">Untested Gaps</div>
        </div>
        <div style="background: white; padding: 16px; border-radius: 6px; text-align: center;">
          <div style="font-size: 2em; font-weight: 700; color: #27ae60;">${covered.length}</div>
          <div style="color: #7f8c8d; font-size: 0.85em;">Covered Handoffs</div>
        </div>
        <div style="background: white; padding: 16px; border-radius: 6px; text-align: center;">
          <div style="font-size: 2em; font-weight: 700; color: #3498db;">${testedHandoffs.length}</div>
          <div style="color: #7f8c8d; font-size: 0.85em;">Total Handoffs</div>
        </div>
      </div>

      ${gaps.length > 0 ? `
      <div style="margin-bottom: 16px;">
        <h3 style="color: #e74c3c; font-size: 1.1em; margin-bottom: 12px;">⚠️ Untested Cross-PRD Handoffs</h3>
        ${gaps.map(g => `
        <div style="background: white; border-left: 4px solid #e74c3c; padding: 16px; margin-bottom: 12px; border-radius: 0 6px 6px 0;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">${g.source.prd}</span>
            <span style="color: #7f8c8d;">→</span>
            <span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">${g.target.prd}</span>
          </div>
          <div style="font-weight: 600; color: #2c3e50; margin-bottom: 4px;">${g.userFlow}</div>
          <div style="background: #fff3cd; color: #856404; padding: 8px 12px; border-radius: 4px; font-size: 0.9em;">
            <strong>Gap Question:</strong> ${g.gapQuestion}
          </div>
        </div>
        `).join('')}
      </div>
      ` : ''}

      ${covered.length > 0 ? `
      <div>
        <h3 style="color: #27ae60; font-size: 1.1em; margin-bottom: 12px;">✅ Covered Cross-PRD Handoffs</h3>
        ${covered.map(g => `
        <div style="background: white; border-left: 4px solid #27ae60; padding: 12px 16px; margin-bottom: 8px; border-radius: 0 6px 6px 0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">${g.source.prd}</span>
            <span style="color: #7f8c8d;">→</span>
            <span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">${g.target.prd}</span>
            <span style="color: #7f8c8d; font-size: 0.9em; margin-left: 8px;">${g.userFlow}</span>
          </div>
        </div>
        `).join('')}
      </div>
      ` : ''}
    </div>

    <!-- 添加手动验证弹窗 -->
    <div id="addCheckModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>📝 添加手动验证</h3>
          <button class="modal-close" id="modalClose">&times;</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="checkPrd" value="">
          <div class="form-group">
            <label for="checkDescription">验证描述 *</label>
            <textarea id="checkDescription" placeholder="例如：周末价格在移动端正确显示"></textarea>
          </div>
          <div class="form-group">
            <label for="checkVerifiedBy">验证人</label>
            <input type="text" id="checkVerifiedBy" placeholder="QA" value="QA">
          </div>
          <div class="form-group">
            <label>状态</label>
            <div class="radio-group">
              <label><input type="radio" name="checkStatus" value="pending" checked> ⏳ 待验证</label>
              <label><input type="radio" name="checkStatus" value="passed"> ✅ 通过</label>
              <label><input type="radio" name="checkStatus" value="failed"> ❌ 失败</label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" id="modalCancel">取消</button>
          <button class="btn btn-primary" id="modalSave">保存</button>
        </div>
      </div>
    </div>

    <script>${getScripts()}</script>
  </div>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    logger.error('Error loading tests page:', error);
    res.status(500).json({ error: 'Failed to load tests page' });
  }
}

// ============ Assertion Labels API ============

/**
 * 保存断言标签
 * POST /api/assertion-labels
 * Body: { original: string, label: string }
 */
export function handleSaveAssertionLabel(req: Request, res: Response): void {
  try {
    const { original, label } = req.body;

    if (!original || typeof original !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "original" field' });
      return;
    }

    if (!label || typeof label !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "label" field' });
      return;
    }

    // 读取现有 YAML
    let labelsData: { labels: Record<string, string> } = { labels: {} };
    if (fs.existsSync(ASSERTION_LABELS_PATH)) {
      const content = fs.readFileSync(ASSERTION_LABELS_PATH, 'utf-8');
      labelsData = yaml.load(content) as { labels: Record<string, string> } || { labels: {} };
    }

    // 更新标签
    const trimmedLabel = label.trim();
    if (trimmedLabel === original) {
      // 如果标签与原始名称相同，删除自定义标签
      delete labelsData.labels[original];
    } else {
      labelsData.labels[original] = trimmedLabel;
    }

    // 写回 YAML
    const yamlContent = `# Assertion Labels - QA 维护的断言人性化描述
#
# 格式: "原始断言名称": "人性化描述"
#
# 可以在 /tests 页面上直接编辑，保存后自动更新此文件
#
# 示例:
#   "Status code is 200": "接口响应正常"
#   "Response has products array": "返回产品列表数据"

labels:
${Object.entries(labelsData.labels)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  "${k}": "${v}"`)
  .join('\n')}
`;
    fs.writeFileSync(ASSERTION_LABELS_PATH, yamlContent, 'utf-8');

    // 清除缓存
    assertionLabelsCache = null;

    logger.info('Assertion label saved', { original, label: trimmedLabel });
    res.json({ success: true, original, label: trimmedLabel });
  } catch (error) {
    logger.error('Error saving assertion label:', error);
    res.status(500).json({ error: 'Failed to save assertion label' });
  }
}

// ============ Manual Checks API ============

/**
 * 添加手动验证
 * POST /api/manual-checks
 * Body: { prd: string, description: string, verified_by: string, status: string }
 */
export function handleAddManualCheck(req: Request, res: Response): void {
  try {
    const { prd, description, verified_by, status } = req.body;

    if (!prd || !description) {
      res.status(400).json({ error: 'Missing required fields: prd, description' });
      return;
    }

    const data = loadManualChecks();
    if (!data.checks[prd]) {
      data.checks[prd] = [];
    }

    const newCheck: ManualCheck = {
      id: generateCheckId(),
      description: description.trim(),
      verified_by: verified_by || 'QA',
      date: new Date().toISOString().split('T')[0],
      status: (status as 'passed' | 'failed' | 'pending') || 'pending'
    };

    data.checks[prd].push(newCheck);
    saveManualChecks(data);

    logger.info('Manual check added', { prd, id: newCheck.id });
    res.json({ success: true, check: newCheck });
  } catch (error) {
    logger.error('Error adding manual check:', error);
    res.status(500).json({ error: 'Failed to add manual check' });
  }
}

/**
 * 更新手动验证状态
 * PUT /api/manual-checks/:id
 * Body: { status: string }
 */
export function handleUpdateManualCheck(req: Request, res: Response): void {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['passed', 'failed', 'pending'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be: passed, failed, or pending' });
      return;
    }

    const data = loadManualChecks();
    let found = false;

    for (const prd of Object.keys(data.checks)) {
      const checks = data.checks[prd];
      const check = checks.find(c => c.id === id);
      if (check) {
        check.status = status;
        check.date = new Date().toISOString().split('T')[0];
        found = true;
        break;
      }
    }

    if (!found) {
      res.status(404).json({ error: 'Check not found' });
      return;
    }

    saveManualChecks(data);
    logger.info('Manual check updated', { id, status });
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating manual check:', error);
    res.status(500).json({ error: 'Failed to update manual check' });
  }
}

/**
 * 删除手动验证
 * DELETE /api/manual-checks/:id?prd=XXX
 */
export function handleDeleteManualCheck(req: Request, res: Response): void {
  try {
    const { id } = req.params;
    const prd = req.query.prd as string;

    if (!prd) {
      res.status(400).json({ error: 'Missing prd query parameter' });
      return;
    }

    const data = loadManualChecks();
    if (!data.checks[prd]) {
      res.status(404).json({ error: 'PRD not found' });
      return;
    }

    const initialLength = data.checks[prd].length;
    data.checks[prd] = data.checks[prd].filter(c => c.id !== id);

    if (data.checks[prd].length === initialLength) {
      res.status(404).json({ error: 'Check not found' });
      return;
    }

    saveManualChecks(data);
    logger.info('Manual check deleted', { id, prd });
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting manual check:', error);
    res.status(500).json({ error: 'Failed to delete manual check' });
  }
}
