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
// Dashboard 用 Story 测试数据接口
// ============================================

export interface StoryTestData {
  storyId: string;
  storyTitle: string;
  prdId: string;
  runCommand: string;   // npm run test:story 001
  modules: RunbookModule[];
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
  const runbooks = loadAllRunbooks();
  const storyDataList: StoryTestData[] = [];

  for (const runbook of runbooks) {
    const storyId = runbook.metadata.storyId || 'Unknown';
    const storyNum = storyId.replace(/\D/g, '').padStart(3, '0');

    // 使用 metadata.title，如果没有则从文件名生成
    const storyTitle = runbook.metadata.title ||
      runbook.fileName.replace('-runbook.md', '').replace(/^US-\d+[A-Z]?-?/i, '').replace(/-/g, ' ').trim() ||
      storyId;

    storyDataList.push({
      storyId,
      storyTitle,
      prdId: runbook.metadata.prdId || '',
      runCommand: `npm run test:story ${storyNum}`,
      modules: runbook.modules,
      stats: {
        total: runbook.totalTestCases,
        passed: runbook.passedTestCases,
        failed: runbook.failedTestCases,
        pending: runbook.pendingTestCases
      }
    });
  }

  return storyDataList;
}
