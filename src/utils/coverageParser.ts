import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface CoverageEntry {
  prd_id: string;
  title: string;
  status: string;
  primary_collection?: string;
  story_collection?: string;
  e2e_report?: string;
  runbook?: string;
  test_report?: string;
  last_updated?: string;
  test_statistics?: {
    total_requests?: number;
    total_assertions?: number;
    passed_assertions?: number;
    failed_assertions?: number;
  };
  coverage_analysis?: {
    total_acceptance_criteria?: number | string;
    tested_acceptance_criteria?: number;
    coverage_by_ac?: string;
    by_feature?: Record<string, string>;
    by_category?: Record<string, string>;
    api_endpoint_status?: Record<string, string>;
  };
  tested_scenarios?: string[];
  coverage_gaps?: string[];
  coverage_notes?: string;
  supplementary_collections?: string[];
}

export interface CoverageSummary {
  overall_coverage: string;
  total_prds: number;
  fully_covered: number;
  partially_covered: number;
  draft_prds: number;
  primary_test_collection: string;
  by_prd?: Record<string, string>;
  test_statistics?: {
    total_test_requests?: string;
    total_assertions?: string;
    avg_response_time?: string;
    success_rate?: string;
  };
}

export interface TestCoverageData {
  unified_collection?: {
    name: string;
    location: string;
    description: string;
    total_tests: string;
    coverage_summary?: Record<string, string>;
  };
  coverage_registry?: CoverageEntry[];
  coverage_summary?: CoverageSummary;
  remaining_gaps?: string[];
}

/**
 * Load test coverage data from _index.yaml
 */
export function loadTestCoverageData(): TestCoverageData | null {
  const coveragePath = path.resolve(process.cwd(), 'docs', 'test-coverage', '_index.yaml');

  if (!fs.existsSync(coveragePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(coveragePath, 'utf-8');
    const data = yaml.load(content) as TestCoverageData;
    return data;
  } catch (error) {
    console.error('Error loading test coverage data:', error);
    return null;
  }
}

/**
 * Get coverage entry for a specific PRD
 */
export function getCoverageForPRD(prdId: string): CoverageEntry | null {
  const data = loadTestCoverageData();
  if (!data || !data.coverage_registry) {
    return null;
  }

  const normalizedId = prdId.startsWith('PRD-') ? prdId : `PRD-${prdId}`;

  return data.coverage_registry.find(entry =>
    entry.prd_id === prdId ||
    entry.prd_id === normalizedId ||
    entry.prd_id.toLowerCase() === prdId.toLowerCase()
  ) || null;
}

/**
 * Get all coverage entries
 */
export function getAllCoverageEntries(): CoverageEntry[] {
  const data = loadTestCoverageData();
  return data?.coverage_registry || [];
}

/**
 * Get coverage summary
 */
export function getCoverageSummary(): CoverageSummary | null {
  const data = loadTestCoverageData();
  return data?.coverage_summary || null;
}

/**
 * Get coverage statistics
 */
export function getCoverageStats(): {
  total_prds: number;
  complete: number;
  partial: number;
  draft: number;
  total_requests: number;
  total_assertions: number;
  pass_rate: string;
} {
  const entries = getAllCoverageEntries();

  let complete = 0;
  let partial = 0;
  let draft = 0;
  let totalRequests = 0;
  let totalAssertions = 0;
  let totalPassed = 0;

  entries.forEach(entry => {
    if (entry.status.includes('100%') || entry.status.includes('Complete')) {
      complete++;
    } else if (entry.status.includes('Draft')) {
      draft++;
    } else {
      partial++;
    }

    if (entry.test_statistics) {
      totalRequests += entry.test_statistics.total_requests || 0;
      totalAssertions += entry.test_statistics.total_assertions || 0;
      totalPassed += entry.test_statistics.passed_assertions || 0;
    }
  });

  const passRate = totalAssertions > 0
    ? `${((totalPassed / totalAssertions) * 100).toFixed(1)}%`
    : 'N/A';

  return {
    total_prds: entries.length,
    complete,
    partial,
    draft,
    total_requests: totalRequests,
    total_assertions: totalAssertions,
    pass_rate: passRate
  };
}
