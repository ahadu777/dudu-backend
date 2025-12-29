/**
 * Newman XML 报告解析器
 * 解析 Newman 生成的 JUnit XML 报告，提取测试结果
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadAllPrdCollections, findRequestByTestName } from './postmanParser';

export interface NewmanTestCase {
  name: string;
  time: number;
  passed: boolean;
  failure?: string;
}

export interface NewmanTestSuite {
  name: string;
  feature?: string;
  acId?: string;
  acDescription?: string;
  tests: number;
  failures: number;
  errors: number;
  time: number;
  testCases: NewmanTestCase[];
}

export interface NewmanReport {
  name: string;
  fileName: string;
  prdId?: string;
  storyId?: string;
  totalTests: number;
  totalFailures: number;
  totalTime: number;
  testSuites: NewmanTestSuite[];
  features: FeatureSummary[];
}

export interface FeatureSummary {
  name: string;
  passed: number;
  failed: number;
  total: number;
  acs: AcResult[];
}

export interface AcResult {
  acId: string;
  description: string;
  passed: boolean;
  testCount: number;
}

/**
 * 解析单个 Newman XML 报告
 */
export function parseNewmanXml(xmlContent: string, fileName: string): NewmanReport {
  const report: NewmanReport = {
    name: '',
    fileName,
    totalTests: 0,
    totalFailures: 0,
    totalTime: 0,
    testSuites: [],
    features: []
  };

  // 提取 PRD/Story ID - 优先从文件名，然后从 XML 内容
  const prdMatch = fileName.match(/prd-(\d+)/i);
  const storyMatch = fileName.match(/us-(\d+)/i);
  if (prdMatch) report.prdId = `PRD-${prdMatch[1].padStart(3, '0')}`;
  if (storyMatch) report.storyId = `US-${storyMatch[1].padStart(3, '0')}`;

  // 如果文件名没有匹配到，尝试从 XML testsuites name 中提取
  if (!report.prdId && !report.storyId) {
    const contentPrdMatch = xmlContent.match(/testsuites\s+name="[^"]*PRD-(\d+)/i);
    const contentStoryMatch = xmlContent.match(/testsuites\s+name="[^"]*US-(\d+)/i);
    if (contentPrdMatch) report.prdId = `PRD-${contentPrdMatch[1].padStart(3, '0')}`;
    if (contentStoryMatch) report.storyId = `US-${contentStoryMatch[1].padStart(3, '0')}`;
  }

  // 解析 testsuites 元素
  const testsuitesMatch = xmlContent.match(/<testsuites\s+name="([^"]*)"[^>]*tests="(\d+)"[^>]*>/);
  if (testsuitesMatch) {
    report.name = testsuitesMatch[1];
    report.totalTests = parseInt(testsuitesMatch[2], 10);
  }

  // 解析 time
  const timeMatch = xmlContent.match(/<testsuites[^>]*time="([\d.]+)"/);
  if (timeMatch) {
    report.totalTime = parseFloat(timeMatch[1]);
  }

  // 解析每个 testsuite
  const testsuiteRegex = /<testsuite\s+name="([^"]*)"[^>]*tests="(\d+)"\s+failures="(\d+)"\s+errors="(\d+)"\s+time="([\d.]+)"[^>]*>([\s\S]*?)<\/testsuite>/g;
  let suiteMatch;

  while ((suiteMatch = testsuiteRegex.exec(xmlContent)) !== null) {
    const suiteName = suiteMatch[1];
    const suiteContent = suiteMatch[6];

    const suite: NewmanTestSuite = {
      name: suiteName,
      tests: parseInt(suiteMatch[2], 10),
      failures: parseInt(suiteMatch[3], 10),
      errors: parseInt(suiteMatch[4], 10),
      time: parseFloat(suiteMatch[5]),
      testCases: []
    };

    // 解析 Feature 和 AC
    // 格式: "Feature 1: Ticket Activation System / AC-1.1: Description"
    const featureAcMatch = suiteName.match(/^(Feature \d+:[^/]+)\s*\/\s*(AC-[\d.]+):\s*(.+)$/);
    if (featureAcMatch) {
      suite.feature = featureAcMatch[1].trim();
      suite.acId = featureAcMatch[2].trim();
      suite.acDescription = featureAcMatch[3].trim();
    } else {
      // 尝试匹配其他格式
      const simpleAcMatch = suiteName.match(/(AC-[\d.]+):\s*(.+)/);
      if (simpleAcMatch) {
        suite.acId = simpleAcMatch[1].trim();
        suite.acDescription = simpleAcMatch[2].trim();
      }
    }

    // 解析 testcase
    const testcaseRegex = /<testcase\s+name="([^"]*)"[^>]*time="([\d.]+)"[^>]*(?:\/>|>([\s\S]*?)<\/testcase>)/g;
    let caseMatch;

    while ((caseMatch = testcaseRegex.exec(suiteContent)) !== null) {
      const tc: NewmanTestCase = {
        name: caseMatch[1],
        time: parseFloat(caseMatch[2]),
        passed: true
      };

      // 检查是否有 failure
      if (caseMatch[3] && caseMatch[3].includes('<failure')) {
        tc.passed = false;
        const failureMatch = caseMatch[3].match(/<failure[^>]*>([\s\S]*?)<\/failure>/);
        if (failureMatch) {
          tc.failure = failureMatch[1].trim();
        }
      }

      suite.testCases.push(tc);
    }

    report.testSuites.push(suite);
    report.totalFailures += suite.failures;
  }

  // 汇总 Feature 数据
  report.features = summarizeFeatures(report.testSuites);

  return report;
}

/**
 * 按 Feature 汇总测试结果
 */
function summarizeFeatures(suites: NewmanTestSuite[]): FeatureSummary[] {
  const featureMap = new Map<string, FeatureSummary>();

  for (const suite of suites) {
    const featureName = suite.feature || '其他测试';

    if (!featureMap.has(featureName)) {
      featureMap.set(featureName, {
        name: featureName,
        passed: 0,
        failed: 0,
        total: 0,
        acs: []
      });
    }

    const feature = featureMap.get(featureName)!;

    if (suite.acId) {
      const acPassed = suite.failures === 0 && suite.errors === 0;
      feature.acs.push({
        acId: suite.acId,
        description: suite.acDescription || suite.name,
        passed: acPassed,
        testCount: suite.tests
      });

      if (acPassed) {
        feature.passed++;
      } else {
        feature.failed++;
      }
      feature.total++;
    }
  }

  return Array.from(featureMap.values());
}

/**
 * 扫描并解析所有 Newman 报告
 */
export function parseAllNewmanReports(reportsDir: string): NewmanReport[] {
  const reports: NewmanReport[] = [];

  if (!fs.existsSync(reportsDir)) {
    return reports;
  }

  const files = fs.readdirSync(reportsDir);

  for (const file of files) {
    if (file.endsWith('.xml')) {
      const filePath = path.join(reportsDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const report = parseNewmanXml(content, file);
        reports.push(report);
      } catch (error) {
        console.error(`Error parsing ${file}:`, error);
      }
    }
  }

  return reports;
}

/**
 * 获取测试覆盖摘要
 */
export interface CoverageSummary {
  totalAcs: number;
  testedAcs: number;
  passedAcs: number;
  failedAcs: number;
  untestedAcs: number;
  coveragePercent: number;
  passRate: number;
  byPrd: Map<string, PrdCoverage>;
}

export interface PrdCoverage {
  prdId: string;
  name: string;
  totalTests: number;
  passed: number;
  failed: number;
  features: FeatureSummary[];
}

/**
 * 合并 Card AC 和 Newman 结果，生成覆盖报告
 */
export function generateCoverageSummary(
  cardAcs: Array<{ cardSlug: string; acId: string; description: string }>,
  newmanReports: NewmanReport[]
): CoverageSummary {
  // 收集所有 Newman 测试的 AC
  const testedAcSet = new Set<string>();
  const passedAcSet = new Set<string>();

  const byPrd = new Map<string, PrdCoverage>();

  for (const report of newmanReports) {
    const prdId = report.prdId || report.storyId || 'Unknown';

    if (!byPrd.has(prdId)) {
      byPrd.set(prdId, {
        prdId,
        name: report.name,
        totalTests: 0,
        passed: 0,
        failed: 0,
        features: []
      });
    }

    const prdCoverage = byPrd.get(prdId)!;
    prdCoverage.totalTests += report.totalTests;
    prdCoverage.features.push(...report.features);

    for (const feature of report.features) {
      for (const ac of feature.acs) {
        const acKey = `${prdId}.${ac.acId}`;
        testedAcSet.add(acKey);
        if (ac.passed) {
          passedAcSet.add(acKey);
          prdCoverage.passed++;
        } else {
          prdCoverage.failed++;
        }
      }
    }
  }

  const totalAcs = cardAcs.length;
  const testedAcs = testedAcSet.size;
  const passedAcs = passedAcSet.size;
  const failedAcs = testedAcs - passedAcs;
  const untestedAcs = totalAcs - testedAcs;

  return {
    totalAcs,
    testedAcs,
    passedAcs,
    failedAcs,
    untestedAcs,
    coveragePercent: totalAcs > 0 ? Math.round((testedAcs / totalAcs) * 100) : 0,
    passRate: testedAcs > 0 ? Math.round((passedAcs / testedAcs) * 100) : 0,
    byPrd
  };
}

// ============================================
// Dashboard 用测试用例详情接口
// ============================================

export interface TestCaseDetail {
  id: string;           // TC-006-01
  name: string;         // 非存在票券返回错误
  acId: string;         // AC-1.1
  feature: string;      // Feature 1: Ticket Activation
  priority: 'P0' | 'P1' | 'P2';
  status: 'passed' | 'failed' | 'pending';
  // 请求信息
  method?: string;      // GET, POST, PUT, DELETE
  endpoint?: string;    // /api/tickets/:id
  requestBody?: string; // JSON body (if any)
  // 测试信息
  preconditions: string[];
  steps: string[];
  expected: string[];
}

export interface PrdTestData {
  prdId: string;
  prdTitle: string;
  runCommand: string;   // npm run test:prd 006
  testCases: TestCaseDetail[];
  stats: {
    total: number;
    passed: number;
    failed: number;
  };
}

/**
 * 根据 AC 编号推断优先级
 * AC-1.x, AC-2.x -> P0 (核心功能)
 * AC-3.x, AC-4.x -> P1 (重要功能)
 * AC-5.x+ -> P2 (一般功能)
 */
function inferPriority(acId: string): 'P0' | 'P1' | 'P2' {
  const match = acId.match(/AC-(\d+)/);
  if (!match) return 'P2';
  const featureNum = parseInt(match[1], 10);
  if (featureNum <= 2) return 'P0';
  if (featureNum <= 4) return 'P1';
  return 'P2';
}

/**
 * 从 Newman 报告提取 Dashboard 用的测试用例数据
 */
export function extractPrdTestData(reportsDir: string): PrdTestData[] {
  const reports = parseAllNewmanReports(reportsDir);
  const prdDataList: PrdTestData[] = [];

  // 加载所有 Postman Collections 获取请求详情
  const collections = loadAllPrdCollections();

  for (const report of reports) {
    // 只处理真正的 PRD 测试，跳过 Story 测试（US-xxx）
    if (!report.prdId) {
      continue;
    }

    const prdId = report.prdId;
    const prdNum = prdId.replace(/\D/g, '').padStart(3, '0');
    const collection = collections.get(prdId);

    const testCases: TestCaseDetail[] = [];
    let tcIndex = 1;

    // 优先从 features/acs 提取（有 Feature/AC 格式的报告）
    if (report.features.length > 0 && report.features.some(f => f.acs.length > 0)) {
      for (const feature of report.features) {
        for (const ac of feature.acs) {
          // 从对应的 testSuite 提取具体的断言
          const matchingSuite = report.testSuites.find(s => s.acId === ac.acId);
          const assertions = matchingSuite
            ? matchingSuite.testCases.map(tc => `验证: ${tc.name}`)
            : [`执行 ${ac.acId} 测试`, '发送 API 请求', '验证响应'];
          const expectedResults = matchingSuite
            ? matchingSuite.testCases.map(tc => tc.passed ? `✓ ${tc.name}` : `✗ ${tc.name}`)
            : [ac.passed ? '响应状态码正确' : '测试失败，需修复', '数据格式符合预期'];

          // 查找对应的请求信息
          const request = collection ? findRequestByTestName(collection, ac.description) : undefined;

          testCases.push({
            id: `TC-${prdNum}-${String(tcIndex++).padStart(2, '0')}`,
            name: ac.description,
            acId: ac.acId,
            feature: feature.name,
            priority: inferPriority(ac.acId),
            status: ac.passed ? 'passed' : 'failed',
            method: request?.method,
            endpoint: request?.url,
            requestBody: request?.body,
            preconditions: ['服务已启动', '测试数据已准备'],
            steps: assertions,
            expected: expectedResults
          });
        }
      }
    } else {
      // 回退：从 testSuites 直接提取（无 Feature/AC 格式的报告）
      for (const suite of report.testSuites) {
        const suitePassed = suite.failures === 0 && suite.errors === 0;

        // 从测试用例名称生成更详细的预期结果
        const assertions = suite.testCases.map(tc => `✓ ${tc.name}`);

        // 查找对应的请求信息
        const request = collection ? findRequestByTestName(collection, suite.name) : undefined;

        testCases.push({
          id: `TC-${prdNum}-${String(tcIndex++).padStart(2, '0')}`,
          name: suite.name,
          acId: suite.acId || `Suite-${tcIndex}`,
          feature: report.name,
          priority: 'P1',
          status: suitePassed ? 'passed' : 'failed',
          method: request?.method,
          endpoint: request?.url,
          requestBody: request?.body,
          preconditions: ['服务已启动', '测试数据已准备'],
          steps: suite.testCases.map(tc => `验证: ${tc.name}`),
          expected: assertions
        });
      }
    }

    // 计算统计
    const passed = testCases.filter(tc => tc.status === 'passed').length;
    const failed = testCases.filter(tc => tc.status === 'failed').length;

    // 清理标题：移除 "Tests" 后缀和 PRD/US ID 前缀，避免重复显示
    let prdTitle = report.name.replace(/Tests?$/i, '').trim();
    // 移除 PRD-XXX 或 US-XXX 前缀（带或不带冒号）
    prdTitle = prdTitle.replace(/^(PRD-\d+|US-\d+[A-Z]?):?\s*/i, '').trim();
    // 移除标题末尾的 " - US-XXX" 或 " - PRD-XXX"
    prdTitle = prdTitle.replace(/\s*-\s*(US-\d+|PRD-\d+)$/i, '').trim();

    prdDataList.push({
      prdId,
      prdTitle: prdTitle || prdId,
      runCommand: `npm run test:prd ${prdNum}`,
      testCases,
      stats: {
        total: testCases.length,
        passed,
        failed
      }
    });
  }

  return prdDataList;
}
