import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// PRD 测试统计
export interface PrdTestStatistics {
  totalRequests: number;
  totalAssertions: number;
  passedAssertions: number;
  failedAssertions: number;
}

// Feature 覆盖率
export interface FeatureCoverage {
  name: string;
  coverage: string;  // "5/5 = 100%"
  tested: number;
  total: number;
  percent: number;
}

// API 端点状态
export interface ApiEndpointStatus {
  endpoint: string;
  status: string;  // "✅ Tested" 等
  tested: boolean;
}

// PRD 覆盖数据
export interface PrdCoverageData {
  prdId: string;
  title: string;
  status: string;
  lastUpdated: string;
  primaryCollection: string;
  testStatistics: PrdTestStatistics;
  features: FeatureCoverage[];
  testedScenarios: string[];       // 测试场景列表
  apiEndpoints: ApiEndpointStatus[]; // API 端点状态
  runCommand: string;
}

// 完整覆盖率数据
export interface CoverageYamlData {
  prds: PrdCoverageData[];
  summary: {
    totalPrds: number;
    fullyCovered: number;
    totalAssertions: number;
    passedAssertions: number;
  };
}

/**
 * 解析 coverage 字符串，提取数字
 * "5/5 = 100%" -> { tested: 5, total: 5, percent: 100 }
 */
function parseCoverageString(coverage: string): { tested: number; total: number; percent: number } {
  const match = coverage.match(/(\d+)\/(\d+)\s*=\s*(\d+)%/);
  if (match) {
    return {
      tested: parseInt(match[1], 10),
      total: parseInt(match[2], 10),
      percent: parseInt(match[3], 10)
    };
  }
  return { tested: 0, total: 0, percent: 0 };
}

/**
 * 从 PRD ID 提取数字用于运行命令
 * "PRD-006" -> "006"
 */
function extractPrdNumber(prdId: string): string {
  const match = prdId.match(/PRD-(\d+)/i);
  return match ? match[1].padStart(3, '0') : '000';
}

/**
 * 解析 _index.yaml 文件
 */
export function parseCoverageYaml(): CoverageYamlData | null {
  const yamlPath = path.resolve(process.cwd(), 'docs', 'test-coverage', '_index.yaml');

  if (!fs.existsSync(yamlPath)) {
    console.warn('Coverage YAML not found:', yamlPath);
    return null;
  }

  try {
    const content = fs.readFileSync(yamlPath, 'utf-8');
    const data = yaml.load(content) as any;

    if (!data || !data.coverage_registry) {
      return null;
    }

    const prds: PrdCoverageData[] = [];
    let totalAssertions = 0;
    let passedAssertions = 0;

    for (const prd of data.coverage_registry) {
      // 解析 test_statistics
      const stats = prd.test_statistics || {};
      const testStatistics: PrdTestStatistics = {
        totalRequests: stats.total_requests || 0,
        totalAssertions: stats.total_assertions || 0,
        passedAssertions: stats.passed_assertions || 0,
        failedAssertions: stats.failed_assertions || 0
      };

      totalAssertions += testStatistics.totalAssertions;
      passedAssertions += testStatistics.passedAssertions;

      // 解析 by_feature
      const features: FeatureCoverage[] = [];
      const byFeature = prd.coverage_analysis?.by_feature || {};

      for (const [name, coverage] of Object.entries(byFeature)) {
        const parsed = parseCoverageString(coverage as string);
        features.push({
          name,
          coverage: coverage as string,
          ...parsed
        });
      }

      // 解析 tested_scenarios
      const testedScenarios: string[] = prd.tested_scenarios || [];

      // 解析 api_endpoint_status
      const apiEndpoints: ApiEndpointStatus[] = [];
      const apiStatus = prd.coverage_analysis?.api_endpoint_status || {};
      for (const [endpoint, status] of Object.entries(apiStatus)) {
        apiEndpoints.push({
          endpoint,
          status: status as string,
          tested: (status as string).includes('✅')
        });
      }

      const prdNum = extractPrdNumber(prd.prd_id);

      prds.push({
        prdId: prd.prd_id,
        title: prd.title,
        status: prd.status || '',
        lastUpdated: prd.last_updated || '',
        primaryCollection: prd.primary_collection || '',
        testStatistics,
        features,
        testedScenarios,
        apiEndpoints,
        runCommand: `npm run test:prd ${prdNum}`
      });
    }

    // 计算 summary
    const fullyCovered = prds.filter(p =>
      p.testStatistics.failedAssertions === 0 &&
      p.testStatistics.totalAssertions > 0
    ).length;

    return {
      prds,
      summary: {
        totalPrds: prds.length,
        fullyCovered,
        totalAssertions,
        passedAssertions
      }
    };
  } catch (error) {
    console.error('Error parsing coverage YAML:', error);
    return null;
  }
}

/**
 * 获取指定 PRD 的覆盖数据
 */
export function getPrdCoverage(prdId: string): PrdCoverageData | null {
  const data = parseCoverageYaml();
  if (!data) return null;

  return data.prds.find(p =>
    p.prdId.toUpperCase() === prdId.toUpperCase()
  ) || null;
}

/**
 * 获取覆盖率统计摘要
 */
export function getCoverageSummary(): CoverageYamlData['summary'] | null {
  const data = parseCoverageYaml();
  return data?.summary || null;
}
