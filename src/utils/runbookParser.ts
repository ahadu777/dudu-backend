import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Runbook 测试用例状态
export type TCStatus = 'pending' | 'passed' | 'failed' | 'skipped';

// 优先级
export type TCPriority = 'P0' | 'P1' | 'P2';

// 单个测试用例
export interface RunbookTestCase {
  id: string;           // TC-CAT-001
  name: string;         // 获取商品列表
  acReference: string;  // catalog-endpoint.AC-1
  cardSlug: string;     // catalog-endpoint
  acId: string;         // AC-1
  status: TCStatus;     // pending | passed | failed | skipped
  priority: TCPriority; // P0 | P1 | P2
  given: string;
  when: string;
  then: string;
  command: string;      // curl 执行命令
  checkpoints: string[]; // 验证点列表
}

// 单个模块
export interface RunbookModule {
  name: string;         // Module 1: Catalog 商品目录
  relatedCard: string;  // catalog-endpoint
  coverage: string;     // 2/2 ACs (100%)
  testCases: RunbookTestCase[];
}

// Runbook 元数据
export interface RunbookMetadata {
  storyId: string;      // US-001
  prdId: string;        // PRD-001
  title: string;        // Ticket Purchase and Redemption
  status: string;       // Done / In Progress / Draft
  lastUpdated: string;  // 2025-12-17
  testType: string;     // API (Newman) + Manual
  automation: string;   // ⚠️ 部分自动化
  relatedCards: string[]; // [catalog-endpoint, order-create, ...]
}

// 完整 Runbook 数据
export interface RunbookData {
  filePath: string;
  fileName: string;
  metadata: RunbookMetadata;
  modules: RunbookModule[];
  totalTestCases: number;
  passedTestCases: number;
  failedTestCases: number;
  pendingTestCases: number;
}

/**
 * 解析状态文本为状态枚举
 * 支持文本格式: pending, passed, failed, skipped
 * 向后兼容图标格式: ⏸️, ✅, ❌, ⏭️
 */
function parseStatusIcon(statusText: string): TCStatus {
  const text = statusText.toLowerCase().trim();

  // 优先匹配文本格式
  if (text === 'passed') return 'passed';
  if (text === 'failed') return 'failed';
  if (text === 'skipped') return 'skipped';
  if (text === 'pending') return 'pending';

  // 向后兼容图标格式
  if (statusText.includes('✅')) return 'passed';
  if (statusText.includes('❌')) return 'failed';
  if (statusText.includes('⏭️')) return 'skipped';

  return 'pending'; // 默认
}

/**
 * 从 H1 标题提取 Runbook 标题
 * 格式: # US-001: Ticket Purchase and Redemption Runbook
 */
function extractRunbookTitle(content: string): string {
  const h1Match = content.match(/^#\s+(?:US-\d+[A-Z]?:?\s*)?(.+?)(?:\s+Runbook)?$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  return '';
}

/**
 * 解析 Runbook frontmatter
 */
function parseRunbookFrontmatter(content: string): Partial<RunbookMetadata> & { title?: string } {
  const metadata: Partial<RunbookMetadata> & { title?: string } = {};

  // 提取标题
  metadata.title = extractRunbookTitle(content);

  // 解析 Metadata 表格
  const metadataMatch = content.match(/## 📋 Metadata[\s\S]*?\|[^|]+\|[^|]+\|[\s\S]*?(?=---|\n##)/);
  if (metadataMatch) {
    const metadataSection = metadataMatch[0];

    // 提取 Story ID
    const storyMatch = metadataSection.match(/\*\*Story\*\*\s*\|\s*([^\n|]+)/);
    if (storyMatch) metadata.storyId = storyMatch[1].trim();

    // 提取 PRD ID
    const prdMatch = metadataSection.match(/\*\*PRD\*\*\s*\|\s*([^\n|]+)/);
    if (prdMatch) metadata.prdId = prdMatch[1].trim();

    // 提取 Status
    const statusMatch = metadataSection.match(/\*\*Status\*\*\s*\|\s*([^\n|]+)/);
    if (statusMatch) metadata.status = statusMatch[1].trim();

    // 提取 Last Updated
    const updatedMatch = metadataSection.match(/\*\*Last Updated\*\*\s*\|\s*([^\n|]+)/);
    if (updatedMatch) metadata.lastUpdated = updatedMatch[1].trim();

    // 提取 Test Type
    const typeMatch = metadataSection.match(/\*\*Test Type\*\*\s*\|\s*([^\n|]+)/);
    if (typeMatch) metadata.testType = typeMatch[1].trim();

    // 提取 Automation
    const autoMatch = metadataSection.match(/\*\*Automation\*\*\s*\|\s*([^\n|]+)/);
    if (autoMatch) metadata.automation = autoMatch[1].trim();
  }

  // 解析关联的 Cards
  const cardsMatch = content.match(/Related Cards\s*\|\s*([^\n]+)/);
  if (cardsMatch) {
    metadata.relatedCards = cardsMatch[1]
      .split(',')
      .map(c => c.trim().replace(/`/g, ''))
      .filter(c => c.length > 0);
  }

  return metadata;
}

/**
 * 解析单个测试用例
 */
function parseTestCase(tcBlock: string, moduleCard: string): RunbookTestCase | null {
  // 解析 TC ID 和名称: #### TC-CAT-001: 获取商品列表
  const headerMatch = tcBlock.match(/####\s+(TC-[A-Z]+-\d+):\s*(.+)/);
  if (!headerMatch) return null;

  const id = headerMatch[1];
  const name = headerMatch[2].trim();

  // 解析 AC Reference: **AC Reference**: `catalog-endpoint.AC-1`
  const acRefMatch = tcBlock.match(/\*\*AC Reference\*\*:\s*`([^`]+)`/);
  let acReference = '';
  let cardSlug = moduleCard;
  let acId = '';

  if (acRefMatch) {
    acReference = acRefMatch[1];
    const parts = acReference.split('.');
    if (parts.length >= 2) {
      cardSlug = parts[0];
      acId = parts.slice(1).join('.');
    }
  }

  // 解析 Given-When-Then 表格
  // | 状态 | Given | When | Then |
  // |------|-------|------|------|
  // | ⏸️ | 服务运行中 | GET /catalog | 返回 200 |
  //
  // 需要跳过分隔行 (|------|-------|------|------|)
  const tableMatch = tcBlock.match(/\|\s*状态\s*\|\s*Given\s*\|\s*When\s*\|\s*Then\s*\|\s*\n\|[-\s|]+\|\s*\n\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);

  let status: TCStatus = 'pending';
  let given = '';
  let when = '';
  let then = '';

  if (tableMatch) {
    status = parseStatusIcon(tableMatch[1].trim());
    given = tableMatch[2].trim();
    when = tableMatch[3].trim();
    then = tableMatch[4].trim();
  }

  // 解析执行命令 (```bash ... ```)
  let command = '';
  const commandMatch = tcBlock.match(/\*\*执行命令\*\*:\s*\n```(?:bash|shell)?\n([\s\S]*?)```/);
  if (commandMatch) {
    command = commandMatch[1].trim();
  }

  // 解析验证点 checkboxes
  const checkpoints: string[] = [];
  const checkpointMatches = tcBlock.matchAll(/- \[[ x]\]\s*(.+)/g);
  for (const match of checkpointMatches) {
    checkpoints.push(match[1].trim());
  }

  // 根据 AC 编号推断优先级
  // AC-1, AC-2 -> P0; AC-3, AC-4 -> P1; AC-5+ -> P2
  let priority: TCPriority = 'P2';
  const acNumMatch = acId.match(/AC-(\d+)/);
  if (acNumMatch) {
    const acNum = parseInt(acNumMatch[1], 10);
    if (acNum <= 2) priority = 'P0';
    else if (acNum <= 4) priority = 'P1';
  }

  return {
    id,
    name,
    acReference,
    cardSlug,
    acId,
    status,
    priority,
    given,
    when,
    then,
    command,
    checkpoints
  };
}

/**
 * 解析 Runbook 模块
 */
function parseModules(content: string): RunbookModule[] {
  const modules: RunbookModule[] = [];

  // 匹配所有 Module 部分: ### Module N: Name
  const moduleRegex = /###\s+Module\s+\d+:\s*([^\n]+)([\s\S]*?)(?=###\s+Module\s+\d+:|## 📊|$)/g;
  let moduleMatch;

  while ((moduleMatch = moduleRegex.exec(content)) !== null) {
    const moduleName = moduleMatch[1].trim();
    const moduleContent = moduleMatch[2];

    // 解析 Related Card
    const cardMatch = moduleContent.match(/\*\*Related Card\*\*:\s*`([^`]+)`/);
    const relatedCard = cardMatch ? cardMatch[1] : '';

    // 解析 Coverage
    const coverageMatch = moduleContent.match(/\*\*Coverage\*\*:\s*([^\n]+)/);
    const coverage = coverageMatch ? coverageMatch[1].trim() : '';

    // 解析测试用例
    const testCases: RunbookTestCase[] = [];
    const tcBlocks = moduleContent.split(/(?=####\s+TC-)/);

    for (const tcBlock of tcBlocks) {
      if (!tcBlock.includes('#### TC-')) continue;
      const tc = parseTestCase(tcBlock, relatedCard);
      if (tc) testCases.push(tc);
    }

    if (testCases.length > 0) {
      modules.push({
        name: `Module: ${moduleName}`,
        relatedCard,
        coverage,
        testCases
      });
    }
  }

  return modules;
}

/**
 * 解析单个 Runbook 文件
 */
export function parseRunbook(filePath: string): RunbookData | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    // 解析 metadata
    const metadata = parseRunbookFrontmatter(content);

    // 从文件名提取 Story ID (如果 metadata 中没有)
    if (!metadata.storyId) {
      const storyMatch = fileName.match(/(US-\d+[A-Z]?)/i);
      if (storyMatch) metadata.storyId = storyMatch[1].toUpperCase();
    }

    // 解析 modules
    const modules = parseModules(content);

    // 统计测试用例
    let totalTestCases = 0;
    let passedTestCases = 0;
    let failedTestCases = 0;
    let pendingTestCases = 0;

    for (const module of modules) {
      for (const tc of module.testCases) {
        totalTestCases++;
        switch (tc.status) {
          case 'passed': passedTestCases++; break;
          case 'failed': failedTestCases++; break;
          default: pendingTestCases++; break;
        }
      }
    }

    return {
      filePath,
      fileName,
      metadata: {
        storyId: metadata.storyId || '',
        prdId: metadata.prdId || '',
        title: metadata.title || '',
        status: metadata.status || 'Draft',
        lastUpdated: metadata.lastUpdated || '',
        testType: metadata.testType || '',
        automation: metadata.automation || '',
        relatedCards: metadata.relatedCards || []
      },
      modules,
      totalTestCases,
      passedTestCases,
      failedTestCases,
      pendingTestCases
    };
  } catch (error) {
    console.error(`Error parsing runbook ${filePath}:`, error);
    return null;
  }
}

/**
 * 加载所有 Runbook 文件
 */
export function loadAllRunbooks(): RunbookData[] {
  const runbooksDir = path.resolve(process.cwd(), 'docs', 'integration');
  const runbooks: RunbookData[] = [];

  if (!fs.existsSync(runbooksDir)) {
    console.warn('Integration directory not found:', runbooksDir);
    return runbooks;
  }

  const files = fs.readdirSync(runbooksDir)
    .filter(f => f.endsWith('-runbook.md'))
    .sort();

  for (const file of files) {
    const filePath = path.join(runbooksDir, file);
    const runbook = parseRunbook(filePath);
    if (runbook && runbook.totalTestCases > 0) {
      runbooks.push(runbook);
    }
  }

  return runbooks;
}

/**
 * 获取指定 Story 的 Runbook
 */
export function getRunbookForStory(storyId: string): RunbookData | null {
  const runbooks = loadAllRunbooks();
  const normalizedId = storyId.toUpperCase();

  return runbooks.find(rb =>
    rb.metadata.storyId.toUpperCase() === normalizedId
  ) || null;
}

/**
 * 获取指定 Card 的所有 Runbook 测试用例
 */
export function getRunbookTCsForCard(cardSlug: string): RunbookTestCase[] {
  const runbooks = loadAllRunbooks();
  const testCases: RunbookTestCase[] = [];

  for (const runbook of runbooks) {
    for (const module of runbook.modules) {
      for (const tc of module.testCases) {
        if (tc.cardSlug === cardSlug) {
          testCases.push(tc);
        }
      }
    }
  }

  return testCases;
}

/**
 * 构建 Card -> Runbook TC 映射
 */
export function buildCardToRunbookTCMap(): Map<string, RunbookTestCase[]> {
  const runbooks = loadAllRunbooks();
  const cardMap = new Map<string, RunbookTestCase[]>();

  for (const runbook of runbooks) {
    for (const module of runbook.modules) {
      for (const tc of module.testCases) {
        const cardSlug = tc.cardSlug;
        if (!cardSlug) continue;

        if (!cardMap.has(cardSlug)) {
          cardMap.set(cardSlug, []);
        }
        cardMap.get(cardSlug)!.push(tc);
      }
    }
  }

  return cardMap;
}

/**
 * 获取 Runbook 统计摘要
 */
export function getRunbookStats(): {
  totalRunbooks: number;
  totalTestCases: number;
  passedTestCases: number;
  failedTestCases: number;
  pendingTestCases: number;
  coveragePercent: number;
} {
  const runbooks = loadAllRunbooks();

  let totalTestCases = 0;
  let passedTestCases = 0;
  let failedTestCases = 0;
  let pendingTestCases = 0;

  for (const runbook of runbooks) {
    totalTestCases += runbook.totalTestCases;
    passedTestCases += runbook.passedTestCases;
    failedTestCases += runbook.failedTestCases;
    pendingTestCases += runbook.pendingTestCases;
  }

  const coveragePercent = totalTestCases > 0
    ? Math.round((passedTestCases / totalTestCases) * 100)
    : 0;

  return {
    totalRunbooks: runbooks.length,
    totalTestCases,
    passedTestCases,
    failedTestCases,
    pendingTestCases,
    coveragePercent
  };
}

// ============================================
// QA E2E Checklist 数据结构
// ============================================

// QA E2E 单个测试用例
export interface QaE2eTestCase {
  id: string;           // TC-PROD-001
  name: string;         // 浏览商品目录
  operation: string;    // 操作步骤
  expected: string;     // 预期结果
  checked: boolean;     // 是否已完成 [x] vs [ ]
}

// QA E2E Round（测试轮次）
export interface QaE2eRound {
  name: string;         // Round 1: 核心功能
  scenarioCount: number; // N scenarios
  testCases: QaE2eTestCase[];
}

// QA E2E Checklist 完整数据
export interface QaE2eChecklist {
  rounds: QaE2eRound[];
  stats: {
    total: number;
    checked: number;
    unchecked: number;
  };
}

/**
 * 解析 QA E2E Checklist 部分
 * 支持两种标题格式：
 * - ## 🧪 QA E2E Checklist
 * - ## 🧪 Test Execution Checklist
 */
function parseQaE2eChecklist(content: string): QaE2eChecklist {
  const rounds: QaE2eRound[] = [];

  // 查找 QA E2E Checklist 部分
  const checklistMatch = content.match(/##\s*🧪\s*(QA E2E Checklist|Test Execution Checklist)([\s\S]*?)(?=\n## [^#]|$)/);
  if (!checklistMatch) {
    return { rounds: [], stats: { total: 0, checked: 0, unchecked: 0 } };
  }

  const checklistContent = checklistMatch[2];

  // 匹配所有 Round 部分
  const roundRegex = /###\s*(Round\s*\d+[^(\n]*)\s*\((\d+)\s*scenarios?\)/g;
  let roundMatch;
  const roundPositions: { name: string; count: number; start: number }[] = [];

  while ((roundMatch = roundRegex.exec(checklistContent)) !== null) {
    roundPositions.push({
      name: roundMatch[1].trim(),
      count: parseInt(roundMatch[2], 10),
      start: roundMatch.index
    });
  }

  // 解析每个 Round 的测试用例
  for (let i = 0; i < roundPositions.length; i++) {
    const round = roundPositions[i];
    const nextStart = roundPositions[i + 1]?.start ?? checklistContent.length;
    const roundContent = checklistContent.substring(round.start, nextStart);

    const testCases: QaE2eTestCase[] = [];

    // 匹配测试用例：- [ ] **TC-XXX-NNN**: 名称 或 - [x] **TC-XXX-NNN**: 名称
    const tcRegex = /-\s*\[([ x])\]\s*\*\*([^*]+)\*\*:\s*([^\n]+)([\s\S]*?)(?=-\s*\[[ x]\]|\n###|\n##|$)/g;
    let tcMatch;

    while ((tcMatch = tcRegex.exec(roundContent)) !== null) {
      const checked = tcMatch[1].toLowerCase() === 'x';
      const id = tcMatch[2].trim();
      const name = tcMatch[3].trim();
      const details = tcMatch[4];

      // 提取操作步骤 - 匹配第一个 "  - 描述" 格式行（排除 **Expected**）
      // 格式: "  - 启动小程序 → 点击需要登录..." 或 "  - 操作: 选择商品..."
      const opMatch = details.match(/^\s*[-*]\s+(?!\*\*Expected\*\*)([^\n]+)/m);
      let operation = opMatch ? opMatch[1].trim() : '';
      // 移除冗余的 "操作:" 前缀（有些 runbook 文件使用这个格式）
      operation = operation.replace(/^操作[:：]\s*/, '');

      // 提取预期结果 - 匹配 "  - **Expected**: 描述" 格式
      const expMatch = details.match(/[-*]\s*\*\*Expected\*\*[:：]\s*([^\n]+)/);
      const expected = expMatch ? expMatch[1].trim() : '';

      testCases.push({ id, name, operation, expected, checked });
    }

    rounds.push({
      name: round.name,
      scenarioCount: round.count,
      testCases
    });
  }

  // 计算统计
  let total = 0;
  let checked = 0;
  for (const round of rounds) {
    for (const tc of round.testCases) {
      total++;
      if (tc.checked) checked++;
    }
  }

  return {
    rounds,
    stats: {
      total,
      checked,
      unchecked: total - checked
    }
  };
}

// ============================================
// Dashboard 用 Story 测试数据接口
// ============================================

export interface StoryTestData {
  storyId: string;
  storyTitle: string;
  prdId: string;
  runCommand: string;   // npm run test:story 001
  modules: RunbookModule[];
  qaE2eChecklist: QaE2eChecklist;  // QA E2E 测试清单
  stats: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
  };
}

/**
 * 提取 Dashboard 用的 Story 测试数据
 */
export function extractStoryTestData(): StoryTestData[] {
  const runbooksDir = path.resolve(process.cwd(), 'docs', 'integration');
  const storyDataList: StoryTestData[] = [];

  if (!fs.existsSync(runbooksDir)) {
    return storyDataList;
  }

  const files = fs.readdirSync(runbooksDir)
    .filter(f => f.endsWith('-runbook.md'))
    .sort();

  for (const file of files) {
    const filePath = path.join(runbooksDir, file);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // 解析 QA E2E Checklist
      const qaE2eChecklist = parseQaE2eChecklist(content);

      // 只处理有 QA E2E Checklist 的 runbook
      if (qaE2eChecklist.stats.total === 0) {
        continue;
      }

      // 提取 Story ID
      const storyMatch = file.match(/(US-\d+[A-Z]?)/i);
      const storyId = storyMatch ? storyMatch[1].toUpperCase() : 'Unknown';
      const storyNum = storyId.replace(/\D/g, '').padStart(3, '0');

      // 提取标题
      const titleMatch = content.match(/^#\s+(?:US-\d+[A-Z]?:?\s*)?(.+?)(?:\s+Runbook)?$/m);
      const storyTitle = titleMatch ? titleMatch[1].trim() :
        file.replace('-runbook.md', '').replace(/^US-\d+[A-Z]?-?/i, '').replace(/-/g, ' ').trim();

      // 提取 PRD ID
      const prdMatch = content.match(/\*\*PRD\*\*\s*\|\s*([^\n|]+)/);
      const prdId = prdMatch ? prdMatch[1].trim() : '';

      storyDataList.push({
        storyId,
        storyTitle,
        prdId,
        runCommand: `npm run test:story ${storyNum}`,
        modules: [], // 不再需要 Card AC 测试模块
        qaE2eChecklist,
        stats: {
          total: qaE2eChecklist.stats.total,
          passed: qaE2eChecklist.stats.checked,
          failed: 0,
          pending: qaE2eChecklist.stats.unchecked
        }
      });
    } catch (error) {
      console.error(`Error parsing runbook ${filePath}:`, error);
    }
  }

  return storyDataList;
}

// ============================================
// 按功能分组的测试数据 (QA Dashboard 优化)
// ============================================

// 功能分类映射表
export const FUNCTION_CATEGORIES: Record<string, { name: string; icon: string }> = {
  'PAY': { name: '支付', icon: '💳' },
  'REFUND': { name: '退款', icon: '↩️' },
  'OTA': { name: 'OTA 渠道', icon: '🔗' },
  'VERIFY': { name: '核销', icon: '✓' },
  'ORDER': { name: '订单', icon: '📋' },
  'ORD': { name: '订单', icon: '📋' },
  'TKT': { name: '票券', icon: '🎫' },
  'TICKET': { name: '票券', icon: '🎫' },
  'RSV': { name: '预约', icon: '📅' },
  'ACT': { name: '激活', icon: '⚡' },
  'VEN': { name: '场馆', icon: '🏢' },
  'WX': { name: '微信', icon: '💬' },
  'AUTH': { name: '认证', icon: '🔐' },
  'LOGIN': { name: '登录', icon: '🔑' },
  'ADM': { name: '管理后台', icon: '⚙️' },
  'ADMIN': { name: '管理后台', icon: '⚙️' },
  'RPT': { name: '报表', icon: '📊' },
  'REPORT': { name: '报表', icon: '📊' },
  'PRC': { name: '定价', icon: '💰' },
  'CAN': { name: '取消', icon: '❌' },
  'PRO': { name: '产品', icon: '📦' },
  'PROD': { name: '产品', icon: '📦' },
  'PRODUCT': { name: '产品', icon: '📦' },
  'CAT': { name: '商品目录', icon: '📦' },
  'QR': { name: 'QR 码', icon: '📱' },
  'PRF': { name: '配置', icon: '⚙️' },
  'OPR': { name: '操作', icon: '🔧' },
  'OP': { name: '操作', icon: '🔧' },
  'NOTIFY': { name: '通知', icon: '🔔' },
};

// 要过滤的前缀（不展示给 QA）
const FILTER_PREFIXES = ['ENV', 'DAEMON', 'CONFIG'];

// 技术性内容检测 - 操作/预期描述中的技术术语
const TECH_PATTERNS_DETAIL = [
  /\b(GET|POST|PUT|DELETE|PATCH)\s+\//i,     // API 路径: GET /api/xxx
  /返回\s*\d{3}/,                             // HTTP 状态码: 返回 200
  /\b\d{3}\b.*(?:状态|code|response)/i,       // 状态码相关
  /\w+_\w+/,                                   // 下划线字段名: ticket_code
  /(?:数组|对象|字段|参数)/,                   // JSON 术语
  /(?:header|body|payload|response|request)/i, // HTTP 术语
  /(?:api|endpoint)/i,                        // API 术语 (不包含 token/url)
  /`[^`]+`/,                                   // 代码引用: `onHide`
];

// 技术性内容检测 - 名称中的代码审查/开发术语
const TECH_PATTERNS_NAME = [
  /(?:try-catch|catch|定时器|内存泄漏)/,       // 代码质量术语
  /(?:缩进|注释|命名规范)/,                    // 代码风格
  /(?:监听器?|回调|异步)/,                     // 编程概念
  /(?:存储操作|异常捕获)/,                     // 代码实现细节
];

// 合并后的测试用例
export interface MergedTestCase {
  id: string;
  name: string;
  operation: string;
  expected: string;
  checked: boolean;
  sourceStories: string[];  // 来源 Story 列表
}

// 功能分组
export interface FunctionGroup {
  category: string;       // "PAY"
  displayName: string;    // "支付"
  icon: string;           // "💳"
  testCases: MergedTestCase[];
  stats: {
    total: number;
    checked: number;
    unchecked: number;
  };
}

// 前缀合并映射（将相似前缀合并到主前缀）
const PREFIX_ALIASES: Record<string, string> = {
  'TICKET': 'TKT',
  'ADMIN': 'ADM',
  'PRODUCT': 'PROD',
  'PRO': 'PROD',       // PRO 也合并到 PROD
  'REPORT': 'RPT',
  'OP': 'OPR',
  'ORD': 'ORDER',
  'CAT': 'PROD',       // CAT (商品目录) 合并到 PROD
};

/**
 * 从测试用例 ID 提取功能前缀
 * TC-PAY-001 -> PAY
 * TC-TICKET-001 -> TKT (合并)
 */
function extractPrefix(tcId: string): string {
  const match = tcId.match(/^TC-([A-Z]+)-/);
  if (!match) return 'OTHER';

  const rawPrefix = match[1];
  // 应用别名合并
  return PREFIX_ALIASES[rawPrefix] || rawPrefix;
}

/**
 * 判断是否需要过滤（不展示给 QA）
 * 过滤技术性描述：API 路径、状态码、字段名等
 */
function shouldFilterTestCase(tc: QaE2eTestCase): boolean {
  const prefix = extractPrefix(tc.id);

  // 前缀黑名单
  if (FILTER_PREFIXES.includes(prefix)) {
    return true;
  }

  // 检查 ID 是否是代码审查类
  if (tc.id.includes('审查')) {
    return true;
  }

  // 检查名称中的代码审查/开发术语
  const nameText = tc.name || '';
  for (const pattern of TECH_PATTERNS_NAME) {
    if (pattern.test(nameText)) {
      return true;
    }
  }

  // 检查操作和预期中的技术性内容
  const detailText = `${tc.operation || ''} ${tc.expected || ''}`;
  for (const pattern of TECH_PATTERNS_DETAIL) {
    if (pattern.test(detailText)) {
      return true;
    }
  }

  return false;
}

/**
 * 按功能分组测试用例
 * - 遍历所有 Story 的 QA E2E Checklist
 * - 按 TC 前缀分组
 * - 去重合并（相同 ID 只保留一个，记录来源 Story）
 * - 过滤技术性测试
 */
export function groupTestCasesByFunction(storyTestData: StoryTestData[]): FunctionGroup[] {
  // 使用 Map 按 TC ID 去重，同时记录来源
  const tcMap = new Map<string, {
    tc: QaE2eTestCase;
    sources: Set<string>;
  }>();

  // 收集所有测试用例
  for (const story of storyTestData) {
    for (const round of story.qaE2eChecklist.rounds) {
      for (const tc of round.testCases) {
        // 过滤技术性测试
        if (shouldFilterTestCase(tc)) {
          continue;
        }

        if (tcMap.has(tc.id)) {
          // 已存在，添加来源
          tcMap.get(tc.id)!.sources.add(story.storyId);
          // 如果任一来源已 checked，则标记为 checked
          if (tc.checked) {
            tcMap.get(tc.id)!.tc.checked = true;
          }
        } else {
          // 新增
          tcMap.set(tc.id, {
            tc: { ...tc },
            sources: new Set([story.storyId])
          });
        }
      }
    }
  }

  // 按功能前缀分组
  const groupMap = new Map<string, MergedTestCase[]>();

  for (const [tcId, { tc, sources }] of tcMap) {
    const prefix = extractPrefix(tcId);

    if (!groupMap.has(prefix)) {
      groupMap.set(prefix, []);
    }

    groupMap.get(prefix)!.push({
      id: tc.id,
      name: tc.name,
      operation: tc.operation,
      expected: tc.expected,
      checked: tc.checked,
      sourceStories: Array.from(sources).sort()
    });
  }

  // 构建返回结构
  const groups: FunctionGroup[] = [];

  for (const [prefix, testCases] of groupMap) {
    // 按 ID 排序
    testCases.sort((a, b) => a.id.localeCompare(b.id));

    const category = FUNCTION_CATEGORIES[prefix];
    const displayName = category?.name || prefix;
    const icon = category?.icon || '📝';

    const checked = testCases.filter(tc => tc.checked).length;

    groups.push({
      category: prefix,
      displayName,
      icon,
      testCases,
      stats: {
        total: testCases.length,
        checked,
        unchecked: testCases.length - checked
      }
    });
  }

  // 按用例数量降序排序
  groups.sort((a, b) => b.testCases.length - a.testCases.length);

  return groups;
}
