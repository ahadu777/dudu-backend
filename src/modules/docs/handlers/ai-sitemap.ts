/**
 * AI Sitemap Handler
 * 处理 /ai-sitemap 路由 - 机器可读的项目知识库
 */

import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../../utils/logger';
import { loadPRDDocuments, loadStoriesIndex } from '../../../utils/prdParser';
import { getCardStats, loadCardDocuments, CardDocument } from '../../../utils/cardParser';
import { getCoverageStats } from '../../../utils/coverageParser';
import { getReferenceFilePurpose } from '../services/reference-docs';

// ============ Route Handler ============

/**
 * 处理 /ai-sitemap 路由
 * 返回机器可读的项目知识库 JSON
 */
export function handleAiSitemap(_req: Request, res: Response): void {
  try {
    const prdDocs = loadPRDDocuments();
    const stories = loadStoriesIndex();
    const cardStats = getCardStats();
    const coverageStats = getCoverageStats();

    // Read test collections
    const postmanDir = path.join(process.cwd(), 'postman/auto-generated');
    const testCollections: string[] = [];
    if (fs.existsSync(postmanDir)) {
      testCollections.push(...fs.readdirSync(postmanDir).filter(f => f.endsWith('.json')));
    }

    // Load cards for detailed listing
    const cards = loadCardDocuments();

    // Load reference documents
    const referenceDir = path.join(process.cwd(), 'docs/reference');
    const referenceFiles = fs.existsSync(referenceDir)
      ? fs.readdirSync(referenceDir).filter(f => f.endsWith('.md') || f.endsWith('.yaml'))
      : [];

    // Load case studies
    const casesDir = path.join(process.cwd(), 'docs/cases');
    const caseFiles = fs.existsSync(casesDir)
      ? fs.readdirSync(casesDir).filter(f => f.endsWith('.md'))
      : [];

    // Load integration runbooks
    const integrationDir = path.join(process.cwd(), 'docs/integration');
    const runbookFiles = fs.existsSync(integrationDir)
      ? fs.readdirSync(integrationDir).filter(f => f.endsWith('.md'))
      : [];

    // Load memos
    const memosDir = path.join(process.cwd(), 'docs/memos');
    const memoFiles = fs.existsSync(memosDir)
      ? fs.readdirSync(memosDir).filter(f => f.endsWith('.md'))
      : [];

    // Load source modules
    const modulesDir = path.join(process.cwd(), 'src/modules');
    const moduleNames = fs.existsSync(modulesDir)
      ? fs.readdirSync(modulesDir).filter(f => fs.statSync(path.join(modulesDir, f)).isDirectory())
      : [];

    const sitemap = {
      _meta: {
        description: 'Machine-readable institutional knowledge of the Synque project',
        generated: new Date().toISOString(),
        version: '3.0',
        significance: {
          problem: 'AI context is ephemeral. Conversations reset. Knowledge is lost.',
          solution: 'The project itself exposes its complete state as structured data.',
        },
        capabilities: [
          'AI Onboarding - Any AI agent can understand the entire project in one request',
          'Knowledge Continuity - When context is lost, fetch this endpoint to reconstruct understanding',
          'Verification - Answer "Is X ready?" by checking actual sources, not summaries',
          'External Integration - Other systems can programmatically navigate the project',
        ],
        recovery_protocol: [
          '1. Fetch /ai-sitemap',
          '2. Read project.description and summary',
          '3. For specific questions, navigate knowledge_sources',
          '4. For "Is X ready?" questions, follow verification_guide',
        ],
      },
      project: {
        name: 'Synque Express API',
        description: 'Cruise ticketing platform with B2B/B2C integration, mini-program support, and venue operations',
        tech_stack: {
          runtime: 'Node.js 24+',
          framework: 'Express 5.1',
          language: 'TypeScript',
          database: 'MySQL (TypeORM)',
          testing: 'Newman/Postman',
          docs: 'OpenAPI 3.0.3',
        },
      },
      knowledge_sources: {
        documentation: {
          description: 'Structured documentation following PRD → Story → Card hierarchy',
          sources: [
            {
              type: 'PRD',
              description: 'Product Requirements Documents - business goals, success metrics',
              location: 'docs/prd/*.md',
              web_path: '/prd',
              count: prdDocs.length,
              items: prdDocs.map(p => ({
                id: p.metadata.prd_id,
                title: p.title,
                status: p.metadata.status,
                path: `/prd/${p.metadata.prd_id}`,
                file: `docs/prd/${p.metadata.prd_id}.md`,
              })),
            },
            {
              type: 'Story',
              description: 'User Stories - user capabilities, acceptance criteria (black box)',
              location: 'docs/stories/_index.yaml + docs/stories/*.md',
              web_path: '/stories',
              count: stories.length,
              items: stories.map(s => ({
                id: s.id,
                title: s.title,
                status: s.status,
                prd: s.business_requirement,
                path: `/stories/${s.id}`,
              })),
            },
            {
              type: 'Card',
              description: 'Implementation Cards - API contracts, technical specs (white box)',
              location: 'docs/cards/*.md',
              web_path: '/cards',
              count: cardStats.total,
              stats: cardStats,
              items: cards.map((c: CardDocument) => ({
                slug: c.metadata.slug,
                title: c.title,
                status: c.metadata.status,
                related_stories: c.metadata.related_stories,
                path: `/cards/${c.metadata.slug}`,
                file: `docs/cards/${c.metadata.slug}.md`,
              })),
            },
            {
              type: 'Memo',
              description: 'Strategic Memos - synthesized thinking, value propositions',
              location: 'docs/memos/*.md',
              web_path: '/memos',
              count: memoFiles.length,
              items: memoFiles.map(f => ({
                file: f,
                path: `/memos/${f.replace('.md', '')}`,
              })),
            },
          ],
        },
        reference_guides: {
          description: 'Developer guides, standards, and workflows',
          location: 'docs/reference/',
          files: referenceFiles.map(f => ({
            name: f,
            file: `docs/reference/${f}`,
            purpose: getReferenceFilePurpose(f),
          })),
        },
        case_studies: {
          description: 'Real-world implementation examples and lessons learned',
          location: 'docs/cases/',
          files: caseFiles.map(f => ({
            name: f,
            file: `docs/cases/${f}`,
          })),
        },
        integration_runbooks: {
          description: 'Step-by-step E2E test flows for each user story',
          location: 'docs/integration/',
          count: runbookFiles.length,
          files: runbookFiles.map(f => ({
            name: f,
            file: `docs/integration/${f}`,
            story_id: f.match(/US-(\d+)/)?.[0] || null,
          })),
        },
        testing: {
          description: 'Test collections and coverage tracking',
          sources: [
            {
              type: 'Postman Collections',
              description: 'Actual executable tests (SOURCE OF TRUTH)',
              location: 'postman/auto-generated/*.json',
              web_path: '/tests',
              trust_level: 'HIGH - parsed from actual test files',
              count: testCollections.length,
              collections: testCollections,
            },
            {
              type: 'Coverage Summary',
              description: 'YAML summary of test coverage (may be outdated)',
              location: 'docs/test-coverage/_index.yaml',
              web_path: '/coverage',
              trust_level: 'MEDIUM - manually maintained',
              stats: coverageStats,
            },
            {
              type: 'Newman Reports',
              description: 'JUnit XML test results',
              location: 'reports/newman/*.xml',
            },
          ],
        },
        codebase: {
          description: 'Source code organization',
          modules: moduleNames.map(m => ({
            name: m,
            path: `src/modules/${m}/`,
            typical_files: ['router.ts', 'service.ts', 'types.ts'],
          })),
          key_files: [
            { file: 'src/types/domain.ts', purpose: 'Core type definitions (Single Source of Truth)' },
            { file: 'src/core/mock/', purpose: 'Mock data for development' },
            { file: 'openapi/openapi.json', purpose: 'OpenAPI specification' },
            { file: 'CLAUDE.md', purpose: 'AI development guide and rules' },
          ],
        },
      },
      web_endpoints: {
        description: 'Available HTTP endpoints (see knowledge_sources for detailed item listings)',
        navigation: [
          { path: '/project-docs', title: 'Documentation Hub', type: 'html' },
          { path: '/ai-sitemap', title: 'AI Knowledge Base', type: 'json' },
        ],
        documentation: [
          { path: '/prd', title: 'PRD List', pattern: '/prd/:prdId' },
          { path: '/stories', title: 'User Stories', pattern: '/stories/:storyId' },
          { path: '/cards', title: 'Implementation Cards', pattern: '/cards/:cardSlug' },
          { path: '/memos', title: 'Strategic Memos', pattern: '/memos/:memoId' },
        ],
        testing: [
          { path: '/tests', title: 'Test Collections (Source of Truth)', trust: 'HIGH' },
          { path: '/coverage', title: 'Coverage Summary', trust: 'MEDIUM - may be outdated' },
        ],
        evaluation: [
          { path: '/compliance', title: 'Compliance Dashboard' },
          { path: '/evaluation', title: 'Foundation Score' },
        ],
        visualization: [
          { path: '/sitemap', title: 'Documentation Sitemap' },
          { path: '/graph', title: 'Relationship Graph' },
          { path: '/architecture', title: 'Product Architecture' },
        ],
        api: [
          { path: '/docs', title: 'Swagger UI (OpenAPI)' },
          { path: '/healthz', title: 'Health Check', type: 'json' },
        ],
        external: [
          { path: '/prd-docs', title: 'Directus PRD Viewer', pattern: '/prd-docs/:fileId' },
        ],
      },
      verification_guide: {
        description: 'How to answer "Is feature X ready?" questions',
        steps: [
          '1. TRACE CODE: Search src/modules/**/*.ts for implementation',
          '2. FIND TESTS: Check /tests page or parse postman/auto-generated/*.json',
          '3. CHECK COVERAGE: Individual steps tested? Full E2E chain tested?',
          '4. RUN TEST: npm run test:prd {N} for actual pass/fail',
        ],
        trust_levels: {
          'docs/test-coverage/_index.yaml': 'Summary - may be outdated',
          'postman/auto-generated/*.json': 'Source of truth - actual tests',
          'src/modules/**/*.ts': 'Source of truth - actual implementation',
        },
        example: {
          question: 'Can operator scan QR from miniprogram?',
          checks: [
            { step: 'Code exists?', method: 'grep scan/qr in src/', result: 'Found in qr-generation/, operatorValidation/' },
            { step: 'Tests exist?', method: 'Check /tests for AC-3.2, A7.1', result: 'Individual steps tested' },
            { step: 'E2E chain?', method: 'Look for chained test', result: 'Gap - no full chain test' },
          ],
        },
      },
      summary: {
        documentation: {
          total_prds: prdDocs.length,
          total_stories: stories.length,
          total_cards: cardStats.total,
          total_memos: memoFiles.length,
          cards_done: cardStats.byStatus.Done || 0,
          cards_in_progress: cardStats.byStatus['In Progress'] || 0,
        },
        testing: {
          total_test_collections: testCollections.length,
          total_runbooks: runbookFiles.length,
        },
        reference: {
          total_reference_docs: referenceFiles.length,
          total_case_studies: caseFiles.length,
        },
        codebase: {
          total_modules: moduleNames.length,
        },
      },
    };

    res.json(sitemap);
  } catch (error) {
    logger.error('Error generating AI sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
}
