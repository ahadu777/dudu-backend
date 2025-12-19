import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface TestCase {
  id: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2';
  preconditions: string[];
  steps: string[];
  expected: string[];
}

export interface FeatureTestCases {
  prd_id: string;
  feature: string;
  description: string;
  test_command: string;
  test_cases: TestCase[];
}

/**
 * Load all test case files from docs/test-cases/
 */
export function loadAllTestCases(): FeatureTestCases[] {
  const testCasesDir = path.resolve(process.cwd(), 'docs', 'test-cases');

  if (!fs.existsSync(testCasesDir)) {
    console.warn('Test cases directory not found:', testCasesDir);
    return [];
  }

  const files = fs.readdirSync(testCasesDir)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .filter(f => !f.startsWith('_')) // Skip index files
    .sort();

  const allTestCases: FeatureTestCases[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(testCasesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = yaml.load(content) as FeatureTestCases;

      if (data && data.prd_id && data.test_cases) {
        allTestCases.push(data);
      }
    } catch (error) {
      console.error(`Error loading test case file ${file}:`, error);
    }
  }

  return allTestCases;
}

/**
 * Load test cases for a specific PRD
 */
export function loadTestCasesForPRD(prdId: string): FeatureTestCases | null {
  const allTestCases = loadAllTestCases();
  const normalizedId = prdId.toUpperCase().startsWith('PRD-') ? prdId.toUpperCase() : `PRD-${prdId}`;

  return allTestCases.find(tc =>
    tc.prd_id.toUpperCase() === normalizedId
  ) || null;
}

/**
 * Get test case statistics
 */
export function getTestCaseStats(): {
  total_features: number;
  total_cases: number;
  by_priority: { P0: number; P1: number; P2: number };
} {
  const allTestCases = loadAllTestCases();

  let totalCases = 0;
  const byPriority = { P0: 0, P1: 0, P2: 0 };

  for (const feature of allTestCases) {
    totalCases += feature.test_cases.length;
    for (const tc of feature.test_cases) {
      if (tc.priority in byPriority) {
        byPriority[tc.priority]++;
      }
    }
  }

  return {
    total_features: allTestCases.length,
    total_cases: totalCases,
    by_priority: byPriority
  };
}
