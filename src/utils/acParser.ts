import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Test result from Newman XML
export interface TestResult {
  prdId: string;
  acId: string;
  name: string;
  passed: boolean;
  failures: number;
}

// Test case extracted from Newman Collection JSON
export interface TestCase {
  name: string;
  acId: string;
  prdId: string;
  method: string;
  url: string;
  body?: string;
  assertions: string[];
}

// PRD test statistics from _index.yaml
export interface PRDTestStats {
  prdId: string;
  totalRequests: number;
  totalAssertions: number;
  passedAssertions: number;
  failedAssertions: number;
  testedEndpoints: string[];
  testedScenarios: string[];
}

export interface AcceptanceCriteria {
  id: string;
  category: string;
  description: string;
  given: string;
  when: string;
  then: string;
  testId?: string;
  testStatus?: 'passed' | 'failed' | 'pending';
  testCase?: TestCase;  // Associated test case from Newman Collection
}

export interface CardAC {
  cardSlug: string;
  cardName: string;
  prdId: string;
  storyIds: string[];
  status: string;
  oasPaths: string[];
  categories: {
    name: string;
    acs: AcceptanceCriteria[];
  }[];
  totalACs: number;
  testedACs: number;
}

export interface PRDCoverage {
  prdId: string;
  prdTitle: string;
  cards: CardAC[];
  totalACs: number;
  testedACs: number;
  coveragePercent: number;
  // Newman test statistics (optional)
  newmanStats?: {
    totalRequests: number;
    totalAssertions: number;
    passedAssertions: number;
    failedAssertions: number;
    passRate: number;
  };
  // All test cases for this PRD
  testCases?: TestCase[];
}

/**
 * Parse Given/When/Then acceptance criteria from card markdown
 */
function parseACSection(content: string): { categories: { name: string; acs: AcceptanceCriteria[] }[] } {
  const categories: { name: string; acs: AcceptanceCriteria[] }[] = [];

  // Find the Acceptance section (flexible section number: 7, 8, etc.)
  const acceptanceMatch = content.match(/##\s*\d+\)\s*Acceptance[^\n]*\n([\s\S]*?)(?=##\s*\d+\)|$)/i);
  if (!acceptanceMatch) {
    return { categories };
  }

  const acceptanceSection = acceptanceMatch[1];

  // Split by ### headers to get categories
  let categoryBlocks = acceptanceSection.split(/###\s+/);

  // Check if there are ### subcategories or just direct ACs
  const hasSubcategories = acceptanceSection.match(/###\s+\w/);

  let acCounter = 1;

  for (const block of categoryBlocks) {
    if (!block.trim()) continue;

    const lines = block.split('\n');
    let categoryName = lines[0].trim();

    // If first line starts with **Given** or is empty, this is a direct AC block without subcategory
    // Use a default category name
    if (!categoryName || categoryName.startsWith('**Given**') || categoryName.startsWith('- Given')) {
      categoryName = 'General';
    }

    const acs: AcceptanceCriteria[] = [];

    // Parse format 1: "- Given X, When Y, Then Z"
    const acLines1 = block.match(/^-\s*Given\s+.+$/gm) || [];
    for (const acLine of acLines1) {
      const match = acLine.match(/^-\s*Given\s+(.+?)[,，]\s*When\s+(.+?)[,，]\s*Then\s+(.+)$/i);
      if (match) {
        acs.push({
          id: `AC-${acCounter++}`,
          category: categoryName,
          description: `${match[2].trim()} → ${match[3].trim()}`,
          given: match[1].trim(),
          when: match[2].trim(),
          then: match[3].trim(),
          testStatus: 'pending'
        });
      }
    }

    // Parse format 2: "**Given** X ... **When** Y ... **Then** Z" (single line)
    const boldMatches = block.matchAll(/\*\*Given\*\*\s+(.+?)\s*[,，]?\s*\*\*When\*\*\s+(.+?)\s*[,，]?\s*\*\*Then\*\*\s+([^\n]+)/gi);
    for (const match of boldMatches) {
      acs.push({
        id: `AC-${acCounter++}`,
        category: categoryName,
        description: `${match[2].trim()} → ${match[3].trim()}`,
        given: match[1].trim(),
        when: match[2].trim(),
        then: match[3].trim(),
        testStatus: 'pending'
      });
    }

    // Parse format 3: Multi-line format where Given/When/Then are on separate lines
    // Example:
    // **Given** User has never logged in
    // **When** User taps "Login with WeChat"
    // **Then** New account is created
    const multiLineMatches = block.matchAll(/\*\*Given\*\*\s+([^\n]+)\n\s*\*\*When\*\*\s+([^\n]+)\n\s*\*\*Then\*\*:?\s*([^\n]*)/gi);
    for (const match of multiLineMatches) {
      // Skip if already matched by format 2 (single line)
      const given = match[1].trim();
      const when = match[2].trim();
      let then = match[3].trim();

      // If Then is empty or just ":", look for bullet points after
      if (!then || then === ':') {
        // Find the text after **Then**: until next **Given** or end of block
        const thenMatch = block.match(new RegExp(`\\*\\*Then\\*\\*:?\\s*\\n([\\s\\S]*?)(?=\\*\\*Given\\*\\*|$)`, 'i'));
        if (thenMatch) {
          // Extract first bullet point or first line
          const thenContent = thenMatch[1].trim();
          const firstBullet = thenContent.match(/^-\s*(.+)$/m);
          then = firstBullet ? firstBullet[1].trim() : thenContent.split('\n')[0].trim();
        }
      }

      if (given && when && then) {
        acs.push({
          id: `AC-${acCounter++}`,
          category: categoryName,
          description: `${when} → ${then}`,
          given: given,
          when: when,
          then: then,
          testStatus: 'pending'
        });
      }
    }

    if (acs.length > 0) {
      categories.push({ name: categoryName, acs });
    }
  }

  return { categories };
}

/**
 * Extract frontmatter from card markdown
 */
function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  try {
    return yaml.load(match[1]) as Record<string, any> || {};
  } catch {
    return {};
  }
}

/**
 * Load all cards and extract AC information
 */
export function loadAllCardsWithAC(): CardAC[] {
  const cardsDir = path.resolve(process.cwd(), 'docs', 'cards');

  if (!fs.existsSync(cardsDir)) {
    console.warn('Cards directory not found:', cardsDir);
    return [];
  }

  const files = fs.readdirSync(cardsDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))
    .sort();

  const cards: CardAC[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(cardsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      const frontmatter = parseFrontmatter(content);
      const { categories } = parseACSection(content);

      // Skip cards without AC
      const totalACs = categories.reduce((sum, cat) => sum + cat.acs.length, 0);
      if (totalACs === 0) continue;

      // Extract PRD ID from related_stories or filename
      let prdId = '';
      const relatedStories = frontmatter.related_stories || [];
      if (relatedStories.length > 0) {
        // Map story to PRD (simplified mapping)
        const storyId = relatedStories[0];
        prdId = mapStoryToPRD(storyId);
      }

      cards.push({
        cardSlug: frontmatter.slug || file.replace('.md', ''),
        cardName: frontmatter.card || file.replace('.md', ''),
        prdId,
        storyIds: relatedStories,
        status: frontmatter.status || 'Draft',
        oasPaths: frontmatter.oas_paths || [],
        categories,
        totalACs,
        testedACs: 0 // Will be updated when mapping tests
      });
    } catch (error) {
      console.error(`Error parsing card ${file}:`, error);
    }
  }

  return cards;
}

/**
 * Map story ID to PRD ID
 */
function mapStoryToPRD(storyId: string): string {
  // Complete mapping based on PRD related_stories
  const storyMap: Record<string, string> = {
    // PRD-001: Cruise Ticketing Platform
    'US-001': 'PRD-001',
    'US-003': 'PRD-001',
    'US-004': 'PRD-001',
    'US-007': 'PRD-001',
    'US-008': 'PRD-001',
    'US-009': 'PRD-001',
    'US-011': 'PRD-001',
    // PRD-002: OTA Platform Integration
    'US-012': 'PRD-002',
    // PRD-003: Event Venue Operations
    'US-002': 'PRD-003',
    'US-005': 'PRD-003',
    'US-006': 'PRD-003',
    'US-013': 'PRD-003',
    // PRD-004: WeChat MiniProgram Auth
    'US-014': 'PRD-004',
    // PRD-006: Ticket Activation
    'US-016': 'PRD-006',
    // PRD-007: Ticket Reservation Validation
    'US-015': 'PRD-007',
    // PRD-008: DeepTravel Mini-Program
    'US-010': 'PRD-008',
    'US-010A': 'PRD-008',
    'US-010B': 'PRD-008',
  };

  return storyMap[storyId] || '';
}

/**
 * Load PRD coverage data with AC mapping
 */
export function loadPRDCoverage(): PRDCoverage[] {
  const cards = loadAllCardsWithAC();

  // Group cards by PRD
  const prdMap = new Map<string, CardAC[]>();

  for (const card of cards) {
    const prdId = card.prdId || 'Unknown';
    if (!prdMap.has(prdId)) {
      prdMap.set(prdId, []);
    }
    prdMap.get(prdId)!.push(card);
  }

  // Load PRD titles
  const prdTitles = loadPRDTitles();

  // Build coverage data
  const coverage: PRDCoverage[] = [];

  for (const [prdId, prdCards] of prdMap) {
    const totalACs = prdCards.reduce((sum, c) => sum + c.totalACs, 0);
    const testedACs = prdCards.reduce((sum, c) => sum + c.testedACs, 0);

    coverage.push({
      prdId,
      prdTitle: prdTitles[prdId] || prdId,
      cards: prdCards,
      totalACs,
      testedACs,
      coveragePercent: totalACs > 0 ? Math.round((testedACs / totalACs) * 100) : 0
    });
  }

  // Sort by PRD ID
  coverage.sort((a, b) => a.prdId.localeCompare(b.prdId));

  return coverage;
}

/**
 * Load PRD titles from PRD files
 */
function loadPRDTitles(): Record<string, string> {
  const prdsDir = path.resolve(process.cwd(), 'docs', 'prd');
  const titles: Record<string, string> = {};

  if (!fs.existsSync(prdsDir)) return titles;

  const files = fs.readdirSync(prdsDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(prdsDir, file), 'utf-8');

      // Extract PRD ID from filename (PRD-001-xxx.md -> PRD-001)
      const prdIdMatch = file.match(/^(PRD-\d+)/);
      if (!prdIdMatch) continue;
      const prdId = prdIdMatch[1];

      // Extract title from first heading
      const titleMatch = content.match(/^#\s+PRD-\d+:\s*(.+)$/m);
      if (titleMatch) {
        titles[prdId] = titleMatch[1].trim();
      }
    } catch (error) {
      // Ignore errors
    }
  }

  return titles;
}

/**
 * Map test results to ACs
 */
export function mapTestsToACs(coverage: PRDCoverage[], testMapping: Record<string, string[]>): PRDCoverage[] {
  // testMapping: { 'card-slug': ['AC-1', 'AC-2', ...] }

  for (const prd of coverage) {
    for (const card of prd.cards) {
      const testedACIds = testMapping[card.cardSlug] || [];
      let testedCount = 0;

      for (const category of card.categories) {
        for (const ac of category.acs) {
          if (testedACIds.includes(ac.id)) {
            ac.testStatus = 'passed';
            testedCount++;
          }
        }
      }

      card.testedACs = testedCount;
    }

    // Recalculate PRD totals
    prd.testedACs = prd.cards.reduce((sum, c) => sum + c.testedACs, 0);
    prd.coveragePercent = prd.totalACs > 0
      ? Math.round((prd.testedACs / prd.totalACs) * 100)
      : 0;
  }

  return coverage;
}

/**
 * Parse Newman JUnit XML report to extract test results
 */
export function parseNewmanXML(xmlPath: string): TestResult[] {
  const results: TestResult[] = [];

  if (!fs.existsSync(xmlPath)) {
    return results;
  }

  try {
    const content = fs.readFileSync(xmlPath, 'utf-8');

    // Extract PRD ID from filename (prd-006-xxx.xml -> PRD-006)
    const prdMatch = xmlPath.match(/prd-(\d+)/i);
    const prdId = prdMatch ? `PRD-${prdMatch[1].padStart(3, '0')}` : '';

    // Parse testsuites - match AC IDs in testsuite names
    const testsuiteRegex = /<testsuite\s+name="([^"]+)"[^>]*tests="(\d+)"[^>]*failures="(\d+)"[^>]*>/g;
    let match;

    while ((match = testsuiteRegex.exec(content)) !== null) {
      const suiteName = match[1];
      const failures = parseInt(match[3], 10);

      // Extract AC ID from suite name (e.g., "AC-1.1:", "AC-2.3:")
      const acMatch = suiteName.match(/AC-(\d+)\.(\d+)/i);
      if (acMatch) {
        results.push({
          prdId,
          acId: `AC-${acMatch[1]}.${acMatch[2]}`,
          name: suiteName,
          passed: failures === 0,
          failures
        });
      }
    }
  } catch (error) {
    console.error(`Error parsing Newman XML ${xmlPath}:`, error);
  }

  return results;
}

/**
 * Load all Newman test results from reports directory
 */
export function loadAllTestResults(): Map<string, TestResult[]> {
  const resultsMap = new Map<string, TestResult[]>();
  const reportsDir = path.resolve(process.cwd(), 'reports', 'newman');

  if (!fs.existsSync(reportsDir)) {
    return resultsMap;
  }

  const xmlFiles = fs.readdirSync(reportsDir)
    .filter(f => f.endsWith('.xml') && f.startsWith('prd-'));

  for (const file of xmlFiles) {
    const xmlPath = path.join(reportsDir, file);
    const results = parseNewmanXML(xmlPath);

    // Group by PRD ID
    for (const result of results) {
      if (!resultsMap.has(result.prdId)) {
        resultsMap.set(result.prdId, []);
      }
      resultsMap.get(result.prdId)!.push(result);
    }
  }

  return resultsMap;
}

/**
 * Load test coverage stats from _index.yaml
 */
export function loadTestCoverageStats(): Map<string, PRDTestStats> {
  const statsMap = new Map<string, PRDTestStats>();
  const indexPath = path.resolve(process.cwd(), 'docs', 'test-coverage', '_index.yaml');

  if (!fs.existsSync(indexPath)) {
    return statsMap;
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf-8');
    const data = yaml.load(content) as any;

    if (data?.coverage_registry) {
      for (const prd of data.coverage_registry) {
        const prdId = prd.prd_id;
        const stats = prd.test_statistics || {};
        const coverage = prd.coverage_analysis || {};

        // Extract tested endpoints
        const testedEndpoints: string[] = [];
        if (coverage.api_endpoint_status) {
          for (const [endpoint, status] of Object.entries(coverage.api_endpoint_status)) {
            if (typeof status === 'string' && status.includes('✅')) {
              testedEndpoints.push(endpoint);
            }
          }
        }

        // Extract tested scenarios
        const testedScenarios: string[] = prd.tested_scenarios || [];

        statsMap.set(prdId, {
          prdId,
          totalRequests: parseInt(stats.total_requests || '0', 10),
          totalAssertions: parseInt(stats.total_assertions || '0', 10),
          passedAssertions: parseInt(stats.passed_assertions || '0', 10),
          failedAssertions: parseInt(stats.failed_assertions || '0', 10),
          testedEndpoints,
          testedScenarios
        });
      }
    }
  } catch (error) {
    console.error('Error loading test coverage stats:', error);
  }

  return statsMap;
}

/**
 * Load PRD coverage with test results mapped
 */
export function loadPRDCoverageWithTests(): PRDCoverage[] {
  const coverage = loadPRDCoverage();
  const testStats = loadTestCoverageStats();
  const testResults = loadAllTestResults();

  for (const prd of coverage) {
    const stats = testStats.get(prd.prdId);
    const results = testResults.get(prd.prdId) || [];

    if (!stats && results.length === 0) continue;

    // Create a set of tested endpoints for quick lookup
    const testedEndpoints = new Set(stats?.testedEndpoints || []);

    // Map test results to cards based on oasPaths
    for (const card of prd.cards) {
      let cardTested = false;

      // Check if any of the card's endpoints are tested
      for (const oasPath of card.oasPaths) {
        // Normalize path for comparison
        const normalizedPath = oasPath.replace(/\{[^}]+\}/g, ':');

        for (const testedEndpoint of testedEndpoints) {
          // Check if endpoint matches (normalize both)
          const normalizedTested = testedEndpoint.replace(/:\w+/g, ':');
          if (normalizedPath.includes(normalizedTested.split(' ').pop() || '') ||
              testedEndpoint.includes(oasPath.split('/').pop() || '')) {
            cardTested = true;
            break;
          }
        }
        if (cardTested) break;
      }

      // If card is tested, mark all its ACs as passed
      if (cardTested || card.status === 'Done') {
        let testedCount = 0;
        for (const category of card.categories) {
          for (const ac of category.acs) {
            // Check Newman results for this specific AC
            const acResult = results.find(r => {
              // Try to match AC IDs
              const acNum = ac.id.replace('AC-', '');
              return r.acId.includes(acNum) || r.name.toLowerCase().includes(ac.when.toLowerCase().substring(0, 20));
            });

            if (acResult) {
              ac.testStatus = acResult.passed ? 'passed' : 'failed';
              ac.testId = acResult.acId;
              if (acResult.passed) testedCount++;
            } else if (cardTested) {
              // Card is tested but specific AC not found - mark as passed if card status is Done
              ac.testStatus = card.status === 'Done' ? 'passed' : 'pending';
              if (card.status === 'Done') testedCount++;
            }
          }
        }
        card.testedACs = testedCount;
      }
    }

    // Recalculate PRD totals
    prd.testedACs = prd.cards.reduce((sum, c) => sum + c.testedACs, 0);
    prd.coveragePercent = prd.totalACs > 0
      ? Math.round((prd.testedACs / prd.totalACs) * 100)
      : 0;

    // Add Newman stats if available
    if (stats) {
      prd.newmanStats = {
        totalRequests: stats.totalRequests,
        totalAssertions: stats.totalAssertions,
        passedAssertions: stats.passedAssertions,
        failedAssertions: stats.failedAssertions,
        passRate: stats.totalAssertions > 0
          ? Math.round((stats.passedAssertions / stats.totalAssertions) * 100)
          : 0
      };
    }
  }

  // Load test cases and add to PRD level
  const allTestCases = loadAllTestCases();

  for (const prd of coverage) {
    const testCases = allTestCases.get(prd.prdId) || [];
    prd.testCases = testCases;
  }

  return coverage;
}

/**
 * Parse Newman Collection JSON to extract test cases
 */
export function parseNewmanCollection(collectionPath: string): TestCase[] {
  const testCases: TestCase[] = [];

  if (!fs.existsSync(collectionPath)) {
    return testCases;
  }

  try {
    const content = fs.readFileSync(collectionPath, 'utf-8');
    const collection = JSON.parse(content);

    // Extract PRD ID from filename (prd-006-xxx.json -> PRD-006)
    const prdMatch = collectionPath.match(/prd-(\d+)/i);
    const prdId = prdMatch ? `PRD-${prdMatch[1].padStart(3, '0')}` : '';

    // Recursively extract test items
    function extractItems(items: any[], parentName = ''): void {
      for (const item of items) {
        if (item.item) {
          // Folder - recurse
          extractItems(item.item, item.name || parentName);
        } else if (item.request) {
          // Test request - extract test case
          const name = item.name || '';

          // Extract AC ID from name (e.g., "AC-1.1: Description")
          const acMatch = name.match(/AC-(\d+)\.(\d+)/i);
          const acId = acMatch ? `AC-${acMatch[1]}.${acMatch[2]}` : '';

          // Include all test items (not just those with AC IDs)

          // Extract request details
          const request = item.request;
          const method = request.method || 'GET';

          // Build URL
          let url = '';
          if (typeof request.url === 'string') {
            url = request.url;
          } else if (request.url?.raw) {
            url = request.url.raw.replace('{{base_url}}', '');
          }

          // Extract body
          let body = '';
          if (request.body?.raw) {
            try {
              // Try to parse and format JSON
              const parsed = JSON.parse(request.body.raw);
              body = JSON.stringify(parsed, null, 2);
            } catch {
              body = request.body.raw;
            }
          }

          // Extract assertions from test scripts
          const assertions: string[] = [];
          const testEvents = item.event?.filter((e: any) => e.listen === 'test') || [];
          for (const testEvent of testEvents) {
            const exec = testEvent.script?.exec || [];
            const scriptContent = Array.isArray(exec) ? exec.join('\n') : exec;

            // Extract pm.test() descriptions
            const testMatches = scriptContent.matchAll(/pm\.test\s*\(\s*['"`]([^'"`]+)['"`]/g);
            for (const match of testMatches) {
              assertions.push(match[1]);
            }
          }

          testCases.push({
            name,
            acId,
            prdId,
            method,
            url,
            body: body || undefined,
            assertions
          });
        }
      }
    }

    if (collection.item) {
      extractItems(collection.item);
    }
  } catch (error) {
    console.error(`Error parsing Newman collection ${collectionPath}:`, error);
  }

  return testCases;
}

/**
 * Load all test cases from Newman Collection files
 */
export function loadAllTestCases(): Map<string, TestCase[]> {
  const testCasesMap = new Map<string, TestCase[]>();
  const collectionsDir = path.resolve(process.cwd(), 'postman', 'auto-generated');

  if (!fs.existsSync(collectionsDir)) {
    return testCasesMap;
  }

  const jsonFiles = fs.readdirSync(collectionsDir)
    .filter(f => f.endsWith('.json') && f.startsWith('prd-'));

  for (const file of jsonFiles) {
    const collectionPath = path.join(collectionsDir, file);
    const testCases = parseNewmanCollection(collectionPath);

    // Group by PRD ID
    for (const testCase of testCases) {
      if (!testCasesMap.has(testCase.prdId)) {
        testCasesMap.set(testCase.prdId, []);
      }
      testCasesMap.get(testCase.prdId)!.push(testCase);
    }
  }

  return testCasesMap;
}
