/**
 * Documentation Portal Routes
 *
 * This router provides web-based documentation views for:
 * - PRD documents (/prd)
 * - User stories (/stories)
 * - Implementation cards (/cards)
 * - Strategic memos (/memos)
 * - Visualizations (sitemap, graph, compliance, architecture)
 * - Test coverage and evaluation
 * - AI knowledge base (/ai-sitemap)
 */

import { Router } from 'express';
import {
  handlePrdList,
  handlePrdDetail,
  handlePrdStoryRedirect,
  handleCardsList,
  handleCardDetail,
  handleStoriesList,
  handleStoryDetail,
  handleSitemap,
  handleGraph,
  handleCompliance,
  handleArchitecture,
  handleMemosList,
  handleMemoDetail,
  handlePrdDocsList,
  handlePrdDocsDetail,
  handleTests,
  handleSaveAssertionLabel,
  handleAddManualCheck,
  handleUpdateManualCheck,
  handleDeleteManualCheck,
  handleProjectDocs,
  handleEvaluation,
  handleAiSitemap
} from './handlers';
const router = Router();

// ============ PRD Routes ============
router.get('/prd', handlePrdList);
router.get('/prd/:prdId', handlePrdDetail);
router.get('/prd/story/:storyId', handlePrdStoryRedirect);

// ============ Cards Routes ============
router.get('/cards', handleCardsList);
router.get('/cards/:cardSlug', handleCardDetail);

// ============ Stories Routes ============
router.get('/stories', handleStoriesList);
router.get('/stories/:storyId', handleStoryDetail);
// Alias route for stories (singular form)
router.get('/story/:storyId', handleStoryDetail);

// ============ Memos Routes ============
router.get('/memos', handleMemosList);
router.get('/memos/:memoId', handleMemoDetail);

// ============ Visualization Routes ============

router.get('/sitemap', handleSitemap);

router.get('/graph', handleGraph);

router.get('/compliance', handleCompliance);

router.get('/architecture', handleArchitecture);


// Foundation Evaluation
router.get('/evaluation', handleEvaluation);


// /coverage deprecated - redirects to /tests (merged)
router.get('/coverage', (_req, res) => res.redirect('/tests'));

// Live Test Collection Browser
router.get('/tests', handleTests);

// Assertion Labels API (QA maintenance)
router.post('/api/assertion-labels', handleSaveAssertionLabel);

// Manual Checks API (QA maintenance)
router.post('/api/manual-checks', handleAddManualCheck);
router.put('/api/manual-checks/:id', handleUpdateManualCheck);
router.delete('/api/manual-checks/:id', handleDeleteManualCheck);

// AI Site Directory / Knowledge Base
router.get('/ai-sitemap', handleAiSitemap);

// Documentation Hub - Main landing page
router.get('/project-docs', handleProjectDocs);

// PRD Documents from Directus
router.get('/prd-docs', handlePrdDocsList);
router.get('/prd-docs/:fileId', handlePrdDocsDetail);

export default router;
