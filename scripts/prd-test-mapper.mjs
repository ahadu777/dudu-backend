#!/usr/bin/env node

/**
 * PRD-to-Test Coverage Mapper
 *
 * Analyzes actual PRD requirements and maps them to existing Newman test collections
 * to provide real coverage analysis instead of hardcoded percentages.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class PRDTestMapper {
  constructor() {
    this.prdFiles = [];
    this.newmanCollections = [];
    this.testCoverage = new Map();
    this.requirementMap = new Map();
  }

  /**
   * Discover all PRD files in the project
   */
  async discoverPRDFiles() {
    const prdDir = path.join(rootDir, 'docs/prd');
    if (!fs.existsSync(prdDir)) {
      console.log(`${colors.yellow}Warning: PRD directory not found at docs/prd${colors.reset}`);
      return [];
    }

    const files = fs.readdirSync(prdDir)
      .filter(file => file.endsWith('.md'))
      .map(file => ({
        name: file,
        path: path.join(prdDir, file),
        id: file.replace('.md', '')
      }));

    this.prdFiles = files;
    console.log(`${colors.green}✓ Found ${files.length} PRD files${colors.reset}`);
    return files;
  }

  /**
   * Discover all Newman/Postman collections
   */
  async discoverNewmanCollections() {
    const collections = [];

    // Check multiple locations for collections
    const searchPaths = [
      'postman/auto-generated',
      'postman/collections',
      'reports/collections'
    ];

    for (const searchPath of searchPaths) {
      const fullPath = path.join(rootDir, searchPath);
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath)
          .filter(file => file.endsWith('.json') || file.includes('postman'))
          .map(file => ({
            name: file,
            path: path.join(fullPath, file),
            location: searchPath
          }));
        collections.push(...files);
      }
    }

    this.newmanCollections = collections;
    console.log(`${colors.green}✓ Found ${collections.length} Newman collections${colors.reset}`);
    return collections;
  }

  /**
   * Extract testable requirements from PRD content
   */
  extractPRDRequirements(prdContent, prdId) {
    const scenarios = [];
    const lines = prdContent.split('\n');

    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Track sections
      if (line.startsWith('#')) {
        currentSection = line.replace(/^#+\s*/, '');
        continue;
      }

      // Look for testable requirement patterns
      const requirementPatterns = [
        /user\s+(can|should|must)\s+(.+)/i,           // User capabilities
        /system\s+(should|must|will)\s+(.+)/i,        // System behaviors
        /when\s+(.+),\s*then\s+(.+)/i,               // Conditional behaviors
        /given\s+(.+),\s*when\s+(.+)/i,              // Context-action patterns
        /API\s+(should|must)\s+(.+)/i,               // API behaviors
        /^[-*+]\s*(.+)/,                             // Bullet point requirements
        /^\d+\.\s*(.+)/,                             // Numbered requirements
        /validate\s+(.+)/i,                          // Validation requirements
        /verify\s+(.+)/i,                            // Verification requirements
        /ensure\s+(.+)/i,                            // Ensure statements
        /confirm\s+(.+)/i,                           // Confirmation requirements
        /test\s+(.+)/i,                              // Explicit test requirements
        /(MUST|SHOULD|SHALL|WILL)\s+(.+)/i,          // RFC-style requirements
      ];

      for (const pattern of requirementPatterns) {
        const match = line.match(pattern);
        if (match) {
          scenarios.push({
            id: `${prdId}-REQ-${scenarios.length + 1}`,
            text: match[2] || match[1] || match[0],
            section: currentSection,
            line: i + 1,
            type: this.categorizeRequirement(line),
            original_line: line
          });
          break;
        }
      }
    }

    return scenarios;
  }

  /**
   * Categorize requirements for better analysis
   */
  categorizeRequirement(text) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('api') || lowerText.includes('endpoint')) return 'API';
    if (lowerText.includes('user') || lowerText.includes('customer')) return 'User Experience';
    if (lowerText.includes('system') || lowerText.includes('when')) return 'System Behavior';
    if (lowerText.includes('validate') || lowerText.includes('verify')) return 'Validation';
    if (lowerText.includes('security') || lowerText.includes('auth')) return 'Security';
    if (lowerText.includes('performance') || lowerText.includes('latency')) return 'Performance';
    if (lowerText.includes('error') || lowerText.includes('fail')) return 'Error Handling';
    if (lowerText.includes('payment') || lowerText.includes('billing')) return 'Payment';
    if (lowerText.includes('ticket') || lowerText.includes('redemption')) return 'Ticketing';
    if (lowerText.includes('partner') || lowerText.includes('ota')) return 'Integration';
    if (lowerText.includes('report') || lowerText.includes('analytics')) return 'Reporting';

    return 'General';
  }

  /**
   * Extract test scenarios from Newman collection
   */
  extractTestScenarios(collectionContent) {
    try {
      const collection = JSON.parse(collectionContent);
      const scenarios = [];

      // Extract from collection info
      if (collection.info) {
        scenarios.push({
          type: 'collection',
          name: collection.info.name || 'Unknown Collection',
          description: collection.info.description || ''
        });
      }

      // Extract from items (test requests)
      const extractFromItems = (items, folder = '') => {
        if (!items) return;

        for (const item of items) {
          if (item.item) {
            // This is a folder
            extractFromItems(item.item, item.name);
          } else if (item.request) {
            // This is a test request
            scenarios.push({
              type: 'test',
              name: item.name || 'Unnamed Test',
              method: item.request.method || 'GET',
              url: this.extractURL(item.request.url),
              folder: folder,
              description: item.request.description || '',
              tests: this.extractAssertions(item.event)
            });
          }
        }
      };

      extractFromItems(collection.item);
      return scenarios;
    } catch (error) {
      console.log(`${colors.yellow}Warning: Could not parse collection as JSON: ${error.message}${colors.reset}`);
      return [];
    }
  }

  /**
   * Extract URL from Postman URL object or string
   */
  extractURL(urlObj) {
    if (typeof urlObj === 'string') return urlObj;
    if (urlObj && urlObj.raw) return urlObj.raw;
    if (urlObj && urlObj.path) return urlObj.path.join('/');
    return 'unknown';
  }

  /**
   * Extract test assertions from Postman events
   */
  extractAssertions(events) {
    if (!events) return [];

    const testEvent = events.find(e => e.listen === 'test');
    if (!testEvent || !testEvent.script || !testEvent.script.exec) return [];

    const assertions = [];
    const scriptLines = testEvent.script.exec;

    for (const line of scriptLines) {
      if (line.includes('pm.test(') || line.includes('pm.expect(')) {
        assertions.push(line.trim());
      }
    }

    return assertions;
  }

  /**
   * Map discovered requirements to test coverage
   */
  mapRequirementsToTests() {
    const coverageMap = new Map();

    // For each PRD requirement, find matching tests
    for (const [prdId, requirements] of this.requirementMap.entries()) {
      const prdCoverage = {
        requirements_discovered: requirements,
        covered_requirements: [],
        uncovered_requirements: []
      };

      console.log(`\n${colors.blue}Analyzing ${prdId} test coverage...${colors.reset}`);
      console.log(`Found ${requirements.length} testable requirements in PRD`);

      for (const requirement of requirements) {
        const matchingTests = this.findMatchingTests(requirement);

        if (matchingTests.length > 0) {
          prdCoverage.covered_requirements.push({
            requirement,
            tests: matchingTests
          });
        } else {
          prdCoverage.uncovered_requirements.push(requirement);
        }
      }

      coverageMap.set(prdId, prdCoverage);
    }

    this.testCoverage = coverageMap;
    return coverageMap;
  }

  /**
   * Find tests that match a requirement using keyword analysis
   */
  findMatchingTests(requirement) {
    const matchingTests = [];
    const reqText = requirement.text.toLowerCase();

    // Extract keywords from requirement
    const keywords = this.extractKeywords(reqText);

    for (const collection of this.newmanCollections) {
      try {
        const content = fs.readFileSync(collection.path, 'utf8');
        const scenarios = this.extractTestScenarios(content);

        for (const scenario of scenarios) {
          const score = this.calculateMatchScore(keywords, scenario, requirement.type);

          if (score > 0.3) { // Threshold for considering a match
            matchingTests.push({
              collection: collection.name,
              scenario: scenario.name,
              score: score,
              type: scenario.type,
              details: scenario
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return matchingTests.sort((a, b) => b.score - a.score);
  }

  /**
   * Extract meaningful keywords from requirement text
   */
  extractKeywords(text) {
    // Remove common words and extract meaningful terms
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'should', 'must', 'will', 'shall', 'can']);

    const words = text
      .replace(/[^\w\s]/g, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    return words;
  }

  /**
   * Calculate match score between requirement keywords and test scenario
   */
  calculateMatchScore(keywords, scenario, reqType) {
    let score = 0;
    const scenarioText = `${scenario.name} ${scenario.description} ${scenario.url || ''}`.toLowerCase();

    // Keyword matching
    for (const keyword of keywords) {
      if (scenarioText.includes(keyword)) {
        score += 0.3;
      }
    }

    // Type matching bonus
    if (reqType === 'API' && scenario.type === 'test') {
      score += 0.2;
    }

    // URL pattern matching
    if (scenario.url) {
      for (const keyword of keywords) {
        if (scenario.url.includes(keyword)) {
          score += 0.4;
        }
      }
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Generate scenario discovery and coverage report
   */
  generateCoverageReport() {
    console.log(`\n${colors.bold}${colors.cyan}PRD Test Scenario Discovery & Coverage Report${colors.reset}`);
    console.log('='.repeat(60));

    let totalScenarios = 0;
    let coveredScenarios = 0;

    for (const [prdId, coverage] of this.testCoverage.entries()) {
      totalScenarios += coverage.scenarios_discovered.length;
      coveredScenarios += coverage.covered_scenarios.length;

      const coveragePercent = coverage.scenarios_discovered.length > 0
        ? ((coverage.covered_scenarios.length / coverage.scenarios_discovered.length) * 100).toFixed(1)
        : '0.0';

      console.log(`\n${colors.bold}${prdId}${colors.reset}`);
      console.log(`Scenarios Discovered: ${coverage.scenarios_discovered.length}`);
      console.log(`Scenarios Covered: ${colors.green}${coverage.covered_scenarios.length}${colors.reset}`);
      console.log(`Scenarios Missing: ${colors.red}${coverage.uncovered_scenarios.length}${colors.reset}`);
      console.log(`Coverage: ${coveragePercent}%`);

      // Show discovered scenarios by type
      const scenarioTypes = {};
      coverage.scenarios_discovered.forEach(s => {
        scenarioTypes[s.type] = (scenarioTypes[s.type] || 0) + 1;
      });
      console.log(`Scenario Types: ${Object.entries(scenarioTypes).map(([type, count]) => `${type} (${count})`).join(', ')}`);

      // Show missing scenarios that need tests
      if (coverage.uncovered_scenarios.length > 0) {
        console.log(`${colors.yellow}Missing Test Coverage:${colors.reset}`);
        coverage.uncovered_scenarios.slice(0, 5).forEach(scenario => {
          console.log(`  • ${colors.yellow}[${scenario.type}]${colors.reset} ${scenario.text.substring(0, 70)}${scenario.text.length > 70 ? '...' : ''}`);
          console.log(`    ${colors.gray}(${scenario.section}, line ${scenario.line})${colors.reset}`);
        });
      }

      // Show what's actually covered
      if (coverage.covered_scenarios.length > 0) {
        console.log(`${colors.green}Scenarios with Test Coverage:${colors.reset}`);
        coverage.covered_scenarios.slice(0, 3).forEach(item => {
          const topTest = item.tests[0];
          console.log(`  • ${colors.green}[${item.scenario.type}]${colors.reset} ${item.scenario.text.substring(0, 50)}${item.scenario.text.length > 50 ? '...' : ''}`);
          console.log(`    → Covered by: ${topTest.collection}`);
        });
      }
    }

    // Overall summary
    const overallCoverage = totalScenarios > 0
      ? ((coveredScenarios / totalScenarios) * 100).toFixed(1)
      : '0.0';

    console.log(`\n${colors.bold}Overall Test Scenario Coverage${colors.reset}`);
    console.log('-'.repeat(40));
    console.log(`Total Scenarios Discovered: ${totalScenarios}`);
    console.log(`Scenarios with Test Coverage: ${colors.green}${coveredScenarios}${colors.reset}`);
    console.log(`Scenarios Needing Tests: ${colors.red}${totalScenarios - coveredScenarios}${colors.reset}`);
    console.log(`${colors.bold}Overall Coverage: ${overallCoverage}%${colors.reset}`);

    console.log(`\n${colors.bold}💡 How to Use This Discovery:${colors.reset}`);
    console.log('1. Review missing scenarios above');
    console.log('2. Create Newman tests for uncovered scenarios');
    console.log('3. Update docs/test-coverage/_index.yaml with new collections');
    console.log('4. Re-run this analysis to validate coverage');

    // Collection inventory
    console.log(`\n${colors.bold}Available Test Collections${colors.reset}`);
    console.log('-'.repeat(30));
    this.newmanCollections.forEach(collection => {
      console.log(`${colors.blue}${collection.name}${colors.reset} (${collection.location})`);
    });
  }

  /**
   * Main scenario discovery and validation workflow
   */
  async analyze() {
    console.log(`${colors.bold}${colors.cyan}Starting PRD Test Scenario Discovery...${colors.reset}\n`);

    // Step 1: Discover files
    await this.discoverPRDFiles();
    await this.discoverNewmanCollections();

    // Step 2: Extract test scenarios from PRDs
    for (const prd of this.prdFiles) {
      try {
        const content = fs.readFileSync(prd.path, 'utf8');
        const scenarios = this.extractPRDRequirements(content, prd.id);
        this.requirementMap.set(prd.id, scenarios);
        console.log(`${colors.green}✓ Discovered ${scenarios.length} test scenarios in ${prd.name}${colors.reset}`);
      } catch (error) {
        console.log(`${colors.red}✗ Could not read ${prd.name}: ${error.message}${colors.reset}`);
      }
    }

    // Step 3: Validate scenarios against test collections
    console.log(`\n${colors.blue}Validating discovered scenarios against test collections...${colors.reset}`);
    this.mapRequirementsToTests();

    // Step 4: Generate discovery report
    this.generateCoverageReport();

    // Step 5: Export scenario discovery data
    const outputPath = path.join(rootDir, 'reports/prd-scenario-discovery.json');
    const reportData = {
      timestamp: new Date().toISOString(),
      prdFiles: this.prdFiles.map(f => f.name),
      newmanCollections: this.newmanCollections.map(c => c.name),
      scenario_analysis: Object.fromEntries(this.testCoverage)
    };

    // Ensure reports directory exists
    const reportsDir = path.join(rootDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2));
    console.log(`\n${colors.green}✓ Scenario discovery data saved to: reports/prd-scenario-discovery.json${colors.reset}`);

    return this.testCoverage;
  }
}

// Run the analysis if this script is called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mapper = new PRDTestMapper();
  mapper.analyze().catch(error => {
    console.error(`${colors.red}Analysis failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export { PRDTestMapper };