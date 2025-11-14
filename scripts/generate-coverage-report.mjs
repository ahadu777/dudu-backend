#!/usr/bin/env node

/**
 * Generate Test Coverage Status Report
 *
 * Creates a comprehensive markdown report of current test coverage state
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

class CoverageReportGenerator {
  constructor() {
    this.reportData = {
      timestamp: new Date().toISOString(),
      collections: [],
      coverage: {},
      issues: []
    };
  }

  /**
   * Discover actual Newman collections
   */
  async discoverCollections() {
    const collections = [];

    // Check postman/auto-generated
    const autoDir = path.join(rootDir, 'postman/auto-generated');
    if (fs.existsSync(autoDir)) {
      const files = fs.readdirSync(autoDir)
        .filter(file => file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(autoDir, file),
          location: 'postman/auto-generated',
          exists: true,
          size: fs.statSync(path.join(autoDir, file)).size
        }));
      collections.push(...files);
    }

    // Check reports/collections
    const reportsDir = path.join(rootDir, 'reports/collections');
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(reportsDir, file),
          location: 'reports/collections',
          exists: true,
          size: fs.statSync(path.join(reportsDir, file)).size
        }));
      collections.push(...files);
    }

    // Check root postman directory
    const postmanDir = path.join(rootDir, 'postman');
    if (fs.existsSync(postmanDir)) {
      const files = fs.readdirSync(postmanDir)
        .filter(file => file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(postmanDir, file),
          location: 'postman',
          exists: true,
          size: fs.statSync(path.join(postmanDir, file)).size
        }));
      collections.push(...files);
    }

    this.reportData.collections = collections;
    return collections;
  }

  /**
   * Read explicit coverage mapping
   */
  async readCoverageMapping() {
    const mappingPath = path.join(rootDir, 'docs/test-coverage/_index.yaml');

    if (!fs.existsSync(mappingPath)) {
      this.reportData.issues.push('Missing explicit mapping file: docs/test-coverage/_index.yaml');
      return {};
    }

    try {
      const content = fs.readFileSync(mappingPath, 'utf8');

      // Parse YAML manually (simple extraction)
      const coverage = {};
      const lines = content.split('\n');
      let currentPRD = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.match(/^-\s*prd_id:\s*(.+)$/)) {
          currentPRD = line.match(/^-\s*prd_id:\s*(.+)$/)[1];
          coverage[currentPRD] = {
            title: '',
            status: '',
            collections: [],
            gaps: []
          };
        } else if (currentPRD && line.match(/^title:\s*"(.+)"$/)) {
          coverage[currentPRD].title = line.match(/^title:\s*"(.+)"$/)[1];
        } else if (currentPRD && line.match(/^status:\s*"(.+)"$/)) {
          coverage[currentPRD].status = line.match(/^status:\s*"(.+)"$/)[1];
        } else if (currentPRD && line.match(/^-\s*"(.+\.json)"$/)) {
          coverage[currentPRD].collections.push(line.match(/^-\s*"(.+\.json)"$/)[1]);
        } else if (currentPRD && line.match(/^-\s*"(.+)"$/) &&
                   lines[i-5]?.includes('coverage_gaps:')) {
          coverage[currentPRD].gaps.push(line.match(/^-\s*"(.+)"$/)[1]);
        }
      }

      this.reportData.coverage = coverage;
      return coverage;
    } catch (error) {
      this.reportData.issues.push(`Error reading coverage mapping: ${error.message}`);
      return {};
    }
  }

  /**
   * Validate collection files against mapping
   */
  validateCollections() {
    const issues = [];
    const existingFiles = new Set(this.reportData.collections.map(c => c.name));

    Object.entries(this.reportData.coverage).forEach(([prdId, data]) => {
      data.collections.forEach(collection => {
        const filename = path.basename(collection);
        if (!existingFiles.has(filename)) {
          issues.push(`PRD ${prdId} references missing collection: ${collection}`);
        }
      });
    });

    // Check for collections not referenced in mapping
    const referencedFiles = new Set();
    Object.values(this.reportData.coverage).forEach(data => {
      data.collections.forEach(collection => {
        referencedFiles.add(path.basename(collection));
      });
    });

    this.reportData.collections.forEach(collection => {
      if (!referencedFiles.has(collection.name)) {
        issues.push(`Collection not referenced in mapping: ${collection.name}`);
      }
    });

    this.reportData.issues.push(...issues);
    return issues;
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport() {
    const report = [];

    report.push('# 📊 Test Coverage Status Report');
    report.push('');
    report.push(`**Generated**: ${new Date().toISOString()}`);
    report.push(`**Collections Found**: ${this.reportData.collections.length}`);
    report.push(`**PRDs Mapped**: ${Object.keys(this.reportData.coverage).length}`);
    report.push('');

    // Coverage by PRD
    report.push('## 📋 PRD Coverage Status');
    report.push('');

    Object.entries(this.reportData.coverage).forEach(([prdId, data]) => {
      const icon = data.status === 'Mostly Covered' ? '🟢' :
                   data.status === 'Partially Covered' ? '🟠' :
                   data.status === 'Not Covered' ? '🔴' : '🟡';

      report.push(`### ${icon} ${prdId}: ${data.title}`);
      report.push(`**Status**: ${data.status}`);
      report.push('');

      if (data.collections.length > 0) {
        report.push('**Test Collections**:');
        data.collections.forEach(collection => {
          const exists = this.reportData.collections.some(c =>
            collection.includes(c.name) || c.path.includes(collection));
          report.push(`- ${exists ? '✅' : '❌'} ${collection}`);
        });
        report.push('');
      }

      if (data.gaps.length > 0) {
        report.push('**Coverage Gaps**:');
        data.gaps.forEach(gap => {
          report.push(`- ${gap}`);
        });
        report.push('');
      }
    });

    // All collections inventory
    report.push('## 🗂️ Newman Collections Inventory');
    report.push('');

    const groupedCollections = {};
    this.reportData.collections.forEach(collection => {
      if (!groupedCollections[collection.location]) {
        groupedCollections[collection.location] = [];
      }
      groupedCollections[collection.location].push(collection);
    });

    Object.entries(groupedCollections).forEach(([location, collections]) => {
      report.push(`### ${location}/`);
      collections.forEach(collection => {
        const sizeKB = (collection.size / 1024).toFixed(1);
        report.push(`- **${collection.name}** (${sizeKB}KB)`);
      });
      report.push('');
    });

    // Issues found
    if (this.reportData.issues.length > 0) {
      report.push('## ⚠️ Issues Found');
      report.push('');
      this.reportData.issues.forEach(issue => {
        report.push(`- ${issue}`);
      });
      report.push('');
    }

    // Statistics
    report.push('## 📊 Statistics');
    report.push('');
    const totalPRDs = Object.keys(this.reportData.coverage).length;
    const coveredPRDs = Object.values(this.reportData.coverage)
      .filter(data => data.status !== 'Not Covered').length;
    const coveragePercent = totalPRDs > 0 ? ((coveredPRDs / totalPRDs) * 100).toFixed(1) : '0.0';

    report.push(`- **Total PRDs**: ${totalPRDs}`);
    report.push(`- **PRDs with Collections**: ${coveredPRDs}`);
    report.push(`- **Overall Coverage**: ${coveragePercent}%`);
    report.push(`- **Total Collections**: ${this.reportData.collections.length}`);
    report.push(`- **Issues Found**: ${this.reportData.issues.length}`);
    report.push('');

    // Commands to run
    report.push('## 🔧 Commands to Verify Coverage');
    report.push('');
    report.push('```bash');
    report.push('# Quick status check');
    report.push('./scripts/coverage-summary.sh');
    report.push('');
    report.push('# Discover additional requirements');
    report.push('node scripts/prd-test-mapper.mjs');
    report.push('');
    report.push('# Test specific collection');
    report.push('npx newman run postman/auto-generated/[collection-name].json');
    report.push('');
    report.push('# Update mapping');
    report.push('vim docs/test-coverage/_index.yaml');
    report.push('```');
    report.push('');

    report.push('---');
    report.push('*Report generated by AI Test Coverage Analysis*');

    return report.join('\n');
  }

  /**
   * Main generation workflow
   */
  async generate() {
    console.log('🔍 Discovering Newman collections...');
    await this.discoverCollections();

    console.log('📋 Reading coverage mapping...');
    await this.readCoverageMapping();

    console.log('✅ Validating collections...');
    this.validateCollections();

    console.log('📝 Generating report...');
    const report = this.generateMarkdownReport();

    // Save to file
    const outputPath = path.join(rootDir, 'reports/test-coverage-status.md');
    const reportsDir = path.join(rootDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, report);

    console.log(`✅ Report saved to: reports/test-coverage-status.md`);
    console.log(`📊 Found ${this.reportData.collections.length} collections, ${Object.keys(this.reportData.coverage).length} PRDs, ${this.reportData.issues.length} issues`);

    return report;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new CoverageReportGenerator();
  generator.generate().catch(error => {
    console.error('Report generation failed:', error.message);
    process.exit(1);
  });
}

export { CoverageReportGenerator };