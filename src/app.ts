import 'reflect-metadata';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { env, AppDataSource } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { loggingMiddleware } from './middlewares/logging';
import { reqIdMiddleware } from './middlewares/reqId';
import { logger } from './utils/logger';
import { registerModuleRouters } from './modules';
import { loadPRDDocuments, loadStoriesIndex, getRelatedStories, getStoryById } from './utils/prdParser';
import { loadCardDocuments, getCardBySlug, getCardStats } from './utils/cardParser';
import { loadTestCoverageData, getCoverageStats } from './utils/coverageParser';
import { buildSitemap, findStoriesUsingCard } from './utils/sitemapBuilder';

/**
 * Simple markdown to HTML converter for basic formatting
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;
  
  // Escape HTML first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');
  
  // Wrap consecutive list items in ul tags
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<[h|u|o|p])/g, '$1');
  html = html.replace(/(<\/[h|u|o|p]>)<\/p>/g, '$1');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware with relaxed CSP for demo pages
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    }));

    // CORS
    this.app.use(cors());

    // Body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Compression
    this.app.use(compression());

    // Request ID middleware
    this.app.use(reqIdMiddleware);

    // Custom logging middleware
    if (env.NODE_ENV !== 'test') {
      this.app.use(loggingMiddleware);
    }
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/healthz', (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // Version endpoint
    this.app.get('/version', (_req, res) => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      res.json({
        name: 'ticketing-api',
        version: packageJson.version || '0.1.0'
      });
    });

    // Serve OpenAPI JSON
    const openapiPath = path.resolve(process.cwd(), 'openapi', 'openapi.json');
    this.app.get('/openapi.json', (_req, res) => {
      if (fs.existsSync(openapiPath)) {
        res.setHeader('Content-Type', 'application/json');
        res.send(fs.readFileSync(openapiPath, 'utf-8'));
      } else {
        res.status(404).json({ error: 'OpenAPI specification not found' });
      }
    });

    // Swagger UI (keep at /docs as originally)
    if (fs.existsSync(openapiPath)) {
      const swaggerDoc = JSON.parse(fs.readFileSync(openapiPath, 'utf-8'));
      this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, { explorer: true }));
    }

    registerModuleRouters(this.app);

    // Demo dashboard
    this.app.get('/demo', (_req, res) => {
      const dashboardPath = path.resolve(process.cwd(), 'src', 'demo', 'dashboard.html');
      logger.info('demo.dashboard.path', { path: dashboardPath });
      if (fs.existsSync(dashboardPath)) {
        res.setHeader('Content-Type', 'text/html');
        res.send(fs.readFileSync(dashboardPath, 'utf-8'));
      } else {
        res.status(404).json({ error: 'Demo dashboard not found' });
      }
    });

    // Promotion showcase demo
    this.app.get('/demo/promotions', (_req, res) => {
      const showcasePath = path.resolve(process.cwd(), 'src', 'demo', 'promotion-showcase.html');
      logger.info('demo.promotions.path', { path: showcasePath });
      if (fs.existsSync(showcasePath)) {
        res.setHeader('Content-Type', 'text/html');
        res.send(fs.readFileSync(showcasePath, 'utf-8'));
      } else {
        res.status(404).json({ error: 'Promotion showcase not found' });
      }
    });

    // Admin package configuration demo
    this.app.get('/demo/admin-packages', (_req, res) => {
      const adminDemoPath = path.resolve(process.cwd(), 'src', 'demo', 'admin-package-config.html');
      logger.info('demo.admin.packages.path', { path: adminDemoPath });
      if (fs.existsSync(adminDemoPath)) {
        res.setHeader('Content-Type', 'text/html');
        res.send(fs.readFileSync(adminDemoPath, 'utf-8'));
      } else {
        res.status(404).json({ error: 'Admin package demo not found' });
      }
    });


    // Serve runbooks and documentation
    this.app.get('/docs/:type/:filename', (req, res) => {
      const { type, filename } = req.params;
      const validTypes = ['integration', 'stories', 'cards'];

      if (!validTypes.includes(type)) {
        return res.status(404).json({ error: 'Documentation type not found' });
      }

      const docPath = path.resolve(process.cwd(), 'docs', type, filename);
      if (fs.existsSync(docPath)) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(fs.readFileSync(docPath, 'utf-8'));
      } else {
        res.status(404).json({ error: 'Documentation file not found' });
      }
    });

    // PRD documentation routes
    this.app.get('/prd', (_req, res) => {
      try {
        const prds = loadPRDDocuments();
        const stories = loadStoriesIndex();
        
        // Generate HTML page
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Requirements Documents</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow-x: hidden;
      word-wrap: break-word;
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 30px;
    }
    .prd-list {
      display: grid;
      gap: 20px;
    }
    .prd-card {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 20px;
      background: #fafafa;
      transition: all 0.2s;
      cursor: pointer;
      position: relative;
    }
    .prd-card:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      border-color: #3498db;
      transform: translateY(-2px);
    }
    .prd-card a {
      position: relative;
      z-index: 1;
    }
    .prd-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 15px;
    }
    .prd-title {
      font-size: 1.3em;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    .prd-title a {
      color: #3498db;
      text-decoration: none;
      display: block;
    }
    .prd-title a:hover {
      text-decoration: underline;
      color: #2980b9;
    }
    .prd-id {
      background: #3498db;
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      transition: background 0.2s;
    }
    .prd-id:hover {
      background: #2980b9;
    }
    .prd-id-link {
      text-decoration: none;
    }
    .prd-meta {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      margin-bottom: 15px;
      font-size: 0.9em;
      color: #7f8c8d;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .status {
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 0.85em;
      font-weight: 500;
    }
    .status.Implemented, .status.Done, .status["Production Ready"] {
      background: #d4edda;
      color: #155724;
    }
    .status.Draft {
      background: #fff3cd;
      color: #856404;
    }
    .stories-section {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
    }
    .stories-title {
      font-size: 0.95em;
      font-weight: 600;
      color: #555;
      margin-bottom: 10px;
    }
    .stories-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .story-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #e8f4f8;
      border: 1px solid #bee5eb;
      border-radius: 4px;
      font-size: 0.85em;
    }
    .story-badge a {
      color: #0c5460;
      text-decoration: none;
      font-weight: 500;
    }
    .story-badge a:hover {
      text-decoration: underline;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 20px;
      color: #3498db;
      text-decoration: none;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .content {
      margin-top: 20px;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 4px;
      white-space: pre-wrap;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 0.95em;
      line-height: 1.8;
      color: #2c3e50;
      overflow-x: auto;
      word-wrap: break-word;
      max-width: 100%;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 Product Requirements Documents</h1>
    <p class="subtitle">Browse PRD documents and their related user stories</p>
    
    <div class="prd-list">`;

        prds.forEach(prd => {
          const prdIdForMatching = prd.metadata.prd_id || prd.filename.replace('.md', '');
          let relatedStories = getRelatedStories(prdIdForMatching, stories);
          
          // Fallback: if no stories found via business_requirement, try metadata related_stories
          if (relatedStories.length === 0 && prd.metadata.related_stories && Array.isArray(prd.metadata.related_stories)) {
            relatedStories = stories.filter(story => 
              prd.metadata.related_stories?.includes(story.id)
            );
          }
          
          const prdId = prd.metadata.prd_id || prd.filename.replace('.md', '');
          
          const prdUrl = `/prd/${prdId}`;
          html += `
      <div class="prd-card" onclick="window.location.href='${prdUrl}'">
        <div class="prd-header">
          <div>
            <div class="prd-title">
              <a href="${prdUrl}" onclick="event.stopPropagation();">${prd.title}</a>
            </div>
          </div>
          <a href="${prdUrl}" class="prd-id-link" onclick="event.stopPropagation();"><div class="prd-id">${prdId}</div></a>
        </div>
        <div class="prd-meta">`;
          
          if (prd.metadata.status) {
            html += `<span class="meta-item"><strong>Status:</strong> <span class="status ${prd.metadata.status}">${prd.metadata.status}</span></span>`;
          }
          if (prd.metadata.product_area) {
            html += `<span class="meta-item"><strong>Area:</strong> ${prd.metadata.product_area}</span>`;
          }
          if (prd.metadata.created_date) {
            html += `<span class="meta-item"><strong>Created:</strong> ${prd.metadata.created_date}</span>`;
          }
          
          html += `</div>`;
          
          if (relatedStories.length > 0) {
            html += `
        <div class="stories-section">
          <div class="stories-title">Related Stories:</div>
          <div class="stories-list">`;
            
            relatedStories.forEach(story => {
              html += `<span class="story-badge"><a href="/prd/story/${story.id}">${story.id}</a> - ${story.title}</span>`;
            });
            
            html += `
          </div>
        </div>`;
          }
          
          html += `
      </div>`;
        });

        html += `
    </div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error loading PRD documents:', error);
        res.status(500).json({ error: 'Failed to load PRD documents' });
      }
    });

    // Individual PRD view
    this.app.get('/prd/:prdId', (req, res) => {
      try {
        const { prdId } = req.params;
        const prds = loadPRDDocuments();
        const stories = loadStoriesIndex();
        
        const prd = prds.find(p => 
          (p.metadata.prd_id || '').toLowerCase() === prdId.toLowerCase() ||
          p.filename.toLowerCase() === `${prdId.toLowerCase()}.md`
        );
        
        if (!prd) {
          return res.status(404).json({ error: 'PRD not found' });
        }
        
        // Get related stories - try both business_requirement matching and metadata related_stories
        let relatedStories = getRelatedStories(prd.metadata.prd_id || '', stories);
        
        // Fallback: if no stories found via business_requirement, try metadata related_stories
        if (relatedStories.length === 0 && prd.metadata.related_stories && Array.isArray(prd.metadata.related_stories)) {
          relatedStories = stories.filter(story => 
            prd.metadata.related_stories?.includes(story.id)
          );
        }
        
        const prdIdDisplay = prd.metadata.prd_id || prdId;
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${prd.title} - PRD</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow-x: hidden;
      word-wrap: break-word;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 20px;
      color: #3498db;
      text-decoration: none;
      font-weight: 500;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .prd-id {
      display: inline-block;
      background: #3498db;
      color: white;
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 0.9em;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .metadata {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      border-left: 4px solid #3498db;
    }
    .metadata-item {
      margin: 8px 0;
      font-size: 0.95em;
    }
    .metadata-item strong {
      color: #555;
      margin-right: 8px;
    }
    .stories-section {
      background: #e8f4f8;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .stories-title {
      font-weight: 600;
      color: #0c5460;
      margin-bottom: 10px;
    }
    .stories-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .story-badge {
      display: inline-block;
      padding: 6px 12px;
      background: white;
      border: 1px solid #bee5eb;
      border-radius: 4px;
    }
    .story-badge a {
      color: #0c5460;
      text-decoration: none;
      font-weight: 500;
    }
    .story-badge a:hover {
      text-decoration: underline;
    }
    .content {
      margin-top: 20px;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 0.95em;
      line-height: 1.8;
      color: #2c3e50;
      overflow-x: auto;
      word-wrap: break-word;
      max-width: 100%;
    }
    .content h1, .content h2, .content h3 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      color: #2c3e50;
    }
    .content h1 { font-size: 1.8em; border-bottom: 2px solid #3498db; padding-bottom: 0.3em; }
    .content h2 { font-size: 1.5em; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.3em; }
    .content h3 { font-size: 1.2em; }
    .content p { margin: 1em 0; }
    .content ul, .content ol { margin: 1em 0; padding-left: 2em; }
    .content li { margin: 0.5em 0; }
    .content code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      word-break: break-all;
    }
    .content pre {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      margin: 1em 0;
      max-width: 100%;
    }
    .content pre code {
      background: transparent;
      padding: 0;
      color: inherit;
      word-break: normal;
    }
    .content a {
      color: #3498db;
      text-decoration: none;
    }
    .content a:hover {
      text-decoration: underline;
    }
    .content strong {
      font-weight: 600;
      color: #2c3e50;
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/prd" class="back-link">← Back to PRD List</a>
    <h1>${prd.title}</h1>
    <div class="prd-id">${prdIdDisplay}</div>
    
    <div class="metadata">`;
        
        if (prd.metadata.status) {
          html += `<div class="metadata-item"><strong>Status:</strong> ${prd.metadata.status}</div>`;
        }
        if (prd.metadata.product_area) {
          html += `<div class="metadata-item"><strong>Product Area:</strong> ${prd.metadata.product_area}</div>`;
        }
        if (prd.metadata.owner) {
          html += `<div class="metadata-item"><strong>Owner:</strong> ${prd.metadata.owner}</div>`;
        }
        if (prd.metadata.created_date) {
          html += `<div class="metadata-item"><strong>Created:</strong> ${prd.metadata.created_date}</div>`;
        }
        if (prd.metadata.last_updated) {
          html += `<div class="metadata-item"><strong>Last Updated:</strong> ${prd.metadata.last_updated}</div>`;
        }
        if (prd.metadata.deadline) {
          html += `<div class="metadata-item"><strong>Deadline:</strong> ${prd.metadata.deadline}</div>`;
        }
        
        html += `</div>`;
        
        if (relatedStories.length > 0) {
          html += `
    <div class="stories-section">
      <div class="stories-title">📚 Related User Stories:</div>
      <div class="stories-list">`;
          
          relatedStories.forEach(story => {
            html += `<span class="story-badge"><a href="/prd/story/${story.id}">${story.id}</a> - ${story.title}</span>`;
          });
          
          html += `
      </div>
    </div>`;
        }
        
        // Convert markdown to HTML
        const htmlContent = markdownToHtml(prd.content);
        
        html += `
    <div class="content">${htmlContent}</div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error loading PRD:', error);
        res.status(500).json({ error: 'Failed to load PRD' });
      }
    });

    // Individual story view
    this.app.get('/prd/story/:storyId', (req, res) => {
      try {
        const { storyId } = req.params;
        const story = getStoryById(storyId);
        
        if (!story) {
          return res.status(404).json({ error: 'Story not found' });
        }
        
        const storyIdDisplay = story.metadata?.story_id || story.metadata?.id || storyId;
        const storyTitle = story.metadata?.title || storyIdDisplay;
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${storyTitle} - User Story</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow-x: hidden;
      word-wrap: break-word;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 20px;
      color: #3498db;
      text-decoration: none;
      font-weight: 500;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      border-bottom: 3px solid #27ae60;
      padding-bottom: 10px;
    }
    .story-id {
      display: inline-block;
      background: #27ae60;
      color: white;
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 0.9em;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .metadata {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      border-left: 4px solid #27ae60;
    }
    .metadata-item {
      margin: 8px 0;
      font-size: 0.95em;
    }
    .metadata-item strong {
      color: #555;
      margin-right: 8px;
    }
    .content {
      margin-top: 20px;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 0.95em;
      line-height: 1.8;
      color: #2c3e50;
    }
    .content h1, .content h2, .content h3 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      color: #2c3e50;
    }
    .content h1 { font-size: 1.8em; border-bottom: 2px solid #27ae60; padding-bottom: 0.3em; }
    .content h2 { font-size: 1.5em; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.3em; }
    .content h3 { font-size: 1.2em; }
    .content p { margin: 1em 0; }
    .content ul, .content ol { margin: 1em 0; padding-left: 2em; }
    .content li { margin: 0.5em 0; }
    .content code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    .content pre {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      margin: 1em 0;
    }
    .content pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }
    .content a {
      color: #27ae60;
      text-decoration: none;
    }
    .content a:hover {
      text-decoration: underline;
    }
    .content strong {
      font-weight: 600;
      color: #2c3e50;
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/prd" class="back-link">← Back to PRD List</a>
    <h1>${storyTitle}</h1>
    <div class="story-id">${storyIdDisplay}</div>
    
    <div class="metadata">`;
        
        if (story.metadata?.status) {
          html += `<div class="metadata-item"><strong>Status:</strong> ${story.metadata.status}</div>`;
        }
        if (story.metadata?.business_requirement) {
          const prdId = story.metadata.business_requirement;
          html += `<div class="metadata-item"><strong>Business Requirement:</strong> <a href="/prd/${prdId}">${prdId}</a></div>`;
        }
        if (story.metadata?.created_date) {
          html += `<div class="metadata-item"><strong>Created:</strong> ${story.metadata.created_date}</div>`;
        }
        if (story.metadata?.completed_date) {
          html += `<div class="metadata-item"><strong>Completed:</strong> ${story.metadata.completed_date}</div>`;
        }
        if (story.metadata?.deadline) {
          html += `<div class="metadata-item"><strong>Deadline:</strong> ${story.metadata.deadline}</div>`;
        }
        
        // Convert markdown to HTML
        const htmlContent = markdownToHtml(story.content);
        
        html += `</div>
    <div class="content">${htmlContent}</div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error loading story:', error);
        res.status(500).json({ error: 'Failed to load story' });
      }
    });

    // Documentation Hub - Landing Page (PRDs, Stories, Cards)
    this.app.get('/project-docs', (_req, res) => {
      try {
        const prdStats = { total: loadPRDDocuments().length };
        const storyStats = { total: loadStoriesIndex().length };
        const cardStats = getCardStats();
        const coverageStats = getCoverageStats();

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation Hub</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 30px;
    }
    .nav-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .nav-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 25px;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      transition: all 0.3s;
      text-decoration: none;
      display: block;
    }
    .nav-card:hover {
      box-shadow: 0 6px 12px rgba(0,0,0,0.15);
      border-color: #3498db;
      transform: translateY(-4px);
    }
    .nav-card h2 {
      color: #3498db;
      margin-bottom: 10px;
      font-size: 1.4em;
    }
    .nav-card p {
      color: #666;
      margin-bottom: 15px;
    }
    .nav-card .stats {
      color: #7f8c8d;
      font-size: 0.9em;
      margin-top: 10px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 30px;
    }
    .stat-box {
      background: #f8f9fa;
      border-left: 4px solid #3498db;
      padding: 15px;
      border-radius: 4px;
    }
    .stat-box h3 {
      font-size: 0.9em;
      color: #7f8c8d;
      margin-bottom: 5px;
    }
    .stat-box .number {
      font-size: 2em;
      font-weight: 700;
      color: #2c3e50;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📚 Documentation Hub</h1>
    <p class="subtitle">Browse product documentation, user stories, implementation cards, and test coverage</p>

    <div class="nav-grid">
      <a href="/prd" class="nav-card">
        <h2>📋 PRD Documents</h2>
        <p>Product Requirements Documents with detailed specifications and business requirements</p>
        <div class="stats">Total: ${prdStats.total} documents</div>
      </a>

      <a href="/stories" class="nav-card">
        <h2>📖 User Stories</h2>
        <p>User stories linking business requirements to technical implementation</p>
        <div class="stats">Total: ${storyStats.total} stories</div>
      </a>

      <a href="/cards" class="nav-card">
        <h2>🎯 Implementation Cards</h2>
        <p>Technical implementation cards with API contracts and acceptance criteria</p>
        <div class="stats">Total: ${cardStats.total} cards (${cardStats.byStatus.Done || 0} done)</div>
      </a>

      <a href="/sitemap" class="nav-card">
        <h2>🗺️ Documentation Sitemap</h2>
        <p>Hierarchical view of PRD → Story → Card relationships</p>
        <div class="stats">Complete project structure</div>
      </a>

      <a href="/coverage" class="nav-card">
        <h2>📊 Test Coverage</h2>
        <p>Test coverage metrics and Newman test reports</p>
        <div class="stats">${coverageStats.complete}/${coverageStats.total_prds} PRDs fully covered</div>
      </a>

      <a href="/docs" class="nav-card">
        <h2>🔧 API Documentation</h2>
        <p>Swagger UI with OpenAPI 3.0 specification</p>
        <div class="stats">Interactive API explorer</div>
      </a>
    </div>

    <h2 style="margin-top: 30px; margin-bottom: 15px;">Overview Statistics</h2>
    <div class="stats-grid">
      <div class="stat-box">
        <h3>PRD Documents</h3>
        <div class="number">${prdStats.total}</div>
      </div>
      <div class="stat-box">
        <h3>User Stories</h3>
        <div class="number">${storyStats.total}</div>
      </div>
      <div class="stat-box">
        <h3>Implementation Cards</h3>
        <div class="number">${cardStats.total}</div>
      </div>
      <div class="stat-box">
        <h3>Test Coverage</h3>
        <div class="number">${Math.round((coverageStats.complete / coverageStats.total_prds) * 100)}%</div>
      </div>
    </div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error loading documentation hub:', error);
        res.status(500).json({ error: 'Failed to load documentation hub' });
      }
    });

    // Cards Browser - List all cards
    this.app.get('/cards', (_req, res) => {
      try {
        const cards = loadCardDocuments();
        const cardStats = getCardStats();

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Implementation Cards</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .nav-links {
      display: flex;
      gap: 15px;
      font-size: 0.9em;
    }
    .nav-links a {
      color: #3498db;
      text-decoration: none;
      padding: 5px 10px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .nav-links a:hover {
      background: #e8f4f8;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 20px;
    }
    .stats-bar {
      display: flex;
      gap: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
      margin-bottom: 25px;
      flex-wrap: wrap;
    }
    .stat-item {
      font-size: 0.9em;
    }
    .stat-item strong {
      color: #2c3e50;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    .card-item {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 20px;
      background: #fafafa;
      transition: all 0.2s;
      cursor: pointer;
    }
    .card-item:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      border-color: #3498db;
      transform: translateY(-2px);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 12px;
    }
    .card-title {
      font-size: 1.1em;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    .card-title a {
      color: #3498db;
      text-decoration: none;
    }
    .card-title a:hover {
      text-decoration: underline;
    }
    .status-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.8em;
      font-weight: 600;
      white-space: nowrap;
    }
    .status-badge.Done {
      background: #d4edda;
      color: #155724;
    }
    .status-badge.Ready {
      background: #cce5ff;
      color: #004085;
    }
    .status-badge.In.Progress, .status-badge.PR {
      background: #fff3cd;
      color: #856404;
    }
    .status-badge.Deprecated {
      background: #f8d7da;
      color: #721c24;
    }
    .card-meta {
      font-size: 0.85em;
      color: #7f8c8d;
      margin-bottom: 10px;
    }
    .card-meta div {
      margin-bottom: 4px;
    }
    .related-stories {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #e0e0e0;
    }
    .related-stories-title {
      font-size: 0.85em;
      font-weight: 600;
      color: #555;
      margin-bottom: 6px;
    }
    .story-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .story-tag {
      display: inline-block;
      padding: 3px 8px;
      background: #e8f4f8;
      border: 1px solid #bee5eb;
      border-radius: 3px;
      font-size: 0.75em;
      color: #0c5460;
      text-decoration: none;
    }
    .story-tag:hover {
      background: #d1ecf1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>🎯 Implementation Cards</h1>
        <p class="subtitle">Technical implementation cards with API contracts and specifications</p>
      </div>
      <div class="nav-links">
        <a href="/project-docs">← Project Docs</a>
        <a href="/prd">PRDs</a>
        <a href="/stories">Stories</a>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-item"><strong>Total Cards:</strong> ${cardStats.total}</div>`;

        Object.entries(cardStats.byStatus).forEach(([status, count]) => {
          html += `<div class="stat-item"><strong>${status}:</strong> ${count}</div>`;
        });

        html += `
    </div>

    <div class="card-grid">`;

        cards.forEach(card => {
          const cardUrl = `/cards/${card.metadata.slug}`;
          const statusClass = (card.metadata.status || 'Unknown').replace(/ /g, '.');

          html += `
      <div class="card-item" onclick="window.location.href='${cardUrl}'">
        <div class="card-header">
          <div class="card-title">
            <a href="${cardUrl}" onclick="event.stopPropagation();">${card.title}</a>
          </div>
          <span class="status-badge ${statusClass}">${card.metadata.status || 'Unknown'}</span>
        </div>

        <div class="card-meta">`;

          if (card.metadata.team) {
            html += `<div><strong>Team:</strong> ${card.metadata.team}</div>`;
          }
          if (card.metadata.slug) {
            html += `<div><strong>Slug:</strong> <code>${card.metadata.slug}</code></div>`;
          }
          if (card.metadata.oas_paths && card.metadata.oas_paths.length > 0) {
            html += `<div><strong>API:</strong> <code>${card.metadata.oas_paths.join(', ')}</code></div>`;
          }

          html += `</div>`;

          if (card.metadata.related_stories && card.metadata.related_stories.length > 0) {
            html += `
        <div class="related-stories">
          <div class="related-stories-title">Related Stories:</div>
          <div class="story-tags">`;

            card.metadata.related_stories.forEach(storyId => {
              html += `<a href="/stories/${storyId}" class="story-tag">${storyId}</a>`;
            });

            html += `
          </div>
        </div>`;
          }

          html += `
      </div>`;
        });

        html += `
    </div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error loading cards:', error);
        res.status(500).json({ error: 'Failed to load cards' });
      }
    });

    // Individual Card View
    this.app.get('/cards/:cardSlug', (req, res) => {
      try {
        const { cardSlug } = req.params;
        const card = getCardBySlug(cardSlug);

        if (!card) {
          return res.status(404).json({ error: 'Card not found' });
        }

        const relatedStories = findStoriesUsingCard(cardSlug);

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${card.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .back-link {
      display: inline-block;
      margin-bottom: 20px;
      color: #3498db;
      text-decoration: none;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 15px;
    }
    .metadata {
      background: #f8f9fa;
      border-left: 4px solid #3498db;
      padding: 15px;
      margin-bottom: 25px;
      border-radius: 4px;
    }
    .metadata-item {
      margin-bottom: 8px;
      font-size: 0.95em;
    }
    .metadata-item strong {
      color: #2c3e50;
      min-width: 120px;
      display: inline-block;
    }
    .metadata-item a {
      color: #3498db;
      text-decoration: none;
    }
    .metadata-item a:hover {
      text-decoration: underline;
    }
    .status-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .status-badge.Done {
      background: #d4edda;
      color: #155724;
    }
    .status-badge.Ready {
      background: #cce5ff;
      color: #004085;
    }
    .content {
      margin-top: 25px;
      line-height: 1.8;
    }
    .content h1, .content h2, .content h3 {
      margin-top: 20px;
      margin-bottom: 10px;
      color: #2c3e50;
    }
    .content pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 15px 0;
    }
    .content code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    .content ul, .content ol {
      margin-left: 25px;
      margin-bottom: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/cards" class="back-link">← Back to Cards</a>
    <h1>${card.title}</h1>

    <div class="metadata">`;

        if (card.metadata.slug) {
          html += `<div class="metadata-item"><strong>Slug:</strong> <code>${card.metadata.slug}</code></div>`;
        }
        if (card.metadata.status) {
          const statusClass = card.metadata.status.replace(/ /g, '.');
          html += `<div class="metadata-item"><strong>Status:</strong> <span class="status-badge ${statusClass}">${card.metadata.status}</span></div>`;
        }
        if (card.metadata.team) {
          html += `<div class="metadata-item"><strong>Team:</strong> ${card.metadata.team}</div>`;
        }
        if (card.metadata.oas_paths && card.metadata.oas_paths.length > 0) {
          html += `<div class="metadata-item"><strong>API Paths:</strong> <code>${card.metadata.oas_paths.join(', ')}</code></div>`;
        }
        if (card.metadata.last_update) {
          html += `<div class="metadata-item"><strong>Last Update:</strong> ${card.metadata.last_update}</div>`;
        }
        if (relatedStories.length > 0) {
          const storyLinks = relatedStories.map(s => `<a href="/stories/${s.id}">${s.id}</a>`).join(', ');
          html += `<div class="metadata-item"><strong>Related Stories:</strong> ${storyLinks}</div>`;
        }

        // Convert markdown to HTML
        const htmlContent = markdownToHtml(card.content);

        html += `</div>
    <div class="content">${htmlContent}</div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error loading card:', error);
        res.status(500).json({ error: 'Failed to load card' });
      }
    });

    // Stories Browser - Standalone list
    this.app.get('/stories', (_req, res) => {
      try {
        const stories = loadStoriesIndex();
        const prds = loadPRDDocuments();

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Stories</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .nav-links {
      display: flex;
      gap: 15px;
      font-size: 0.9em;
    }
    .nav-links a {
      color: #3498db;
      text-decoration: none;
      padding: 5px 10px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .nav-links a:hover {
      background: #e8f4f8;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 30px;
    }
    .story-list {
      display: grid;
      gap: 15px;
    }
    .story-item {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 20px;
      background: #fafafa;
      transition: all 0.2s;
      cursor: pointer;
    }
    .story-item:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      border-color: #3498db;
      transform: translateY(-2px);
    }
    .story-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 10px;
    }
    .story-title {
      font-size: 1.15em;
      font-weight: 600;
      color: #2c3e50;
    }
    .story-title a {
      color: #3498db;
      text-decoration: none;
    }
    .story-title a:hover {
      text-decoration: underline;
    }
    .story-id {
      background: #3498db;
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .story-meta {
      display: flex;
      gap: 15px;
      font-size: 0.9em;
      color: #7f8c8d;
    }
    .story-meta a {
      color: #3498db;
      text-decoration: none;
    }
    .story-meta a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>📖 User Stories</h1>
        <p class="subtitle">User stories linking business requirements to technical implementation</p>
      </div>
      <div class="nav-links">
        <a href="/project-docs">← Project Docs</a>
        <a href="/prd">PRDs</a>
        <a href="/cards">Cards</a>
      </div>
    </div>

    <div class="story-list">`;

        stories.forEach(story => {
          const storyUrl = `/stories/${story.id}`;
          const prd = story.business_requirement
            ? prds.find(p => p.metadata.prd_id === story.business_requirement)
            : null;

          html += `
      <div class="story-item" onclick="window.location.href='${storyUrl}'">
        <div class="story-header">
          <div class="story-title">
            <a href="${storyUrl}" onclick="event.stopPropagation();">${story.title}</a>
          </div>
          <div class="story-id">${story.id}</div>
        </div>
        <div class="story-meta">`;

          if (story.status) {
            html += `<span><strong>Status:</strong> ${story.status}</span>`;
          }
          if (prd) {
            html += `<span><strong>PRD:</strong> <a href="/prd/${prd.metadata.prd_id}" onclick="event.stopPropagation();">${prd.metadata.prd_id}</a></span>`;
          }

          html += `
        </div>
      </div>`;
        });

        html += `
    </div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error loading stories:', error);
        res.status(500).json({ error: 'Failed to load stories' });
      }
    });

    // Individual Story View (redirect to existing route or create new one)
    this.app.get('/stories/:storyId', (req, res) => {
      // Redirect to existing /prd/story/:storyId route
      res.redirect(`/prd/story/${req.params.storyId}`);
    });

    // Sitemap - Hierarchical tree view
    this.app.get('/sitemap', (_req, res) => {
      try {
        const sitemap = buildSitemap();

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation Sitemap</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .nav-links {
      display: flex;
      gap: 15px;
      font-size: 0.9em;
    }
    .nav-links a {
      color: #3498db;
      text-decoration: none;
      padding: 5px 10px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .nav-links a:hover {
      background: #e8f4f8;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 30px;
    }
    .tree {
      margin-top: 20px;
    }
    .prd-node {
      margin-bottom: 25px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
    }
    .prd-header {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      padding: 15px 20px;
      font-size: 1.1em;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
    }
    .prd-header:hover {
      background: linear-gradient(135deg, #2980b9 0%, #21618c 100%);
    }
    .prd-header a {
      color: white;
      text-decoration: none;
    }
    .prd-header a:hover {
      text-decoration: underline;
    }
    .prd-content {
      padding: 20px;
      background: #fafafa;
    }
    .story-node {
      margin-bottom: 15px;
      border-left: 3px solid #3498db;
      padding-left: 15px;
    }
    .story-header {
      font-size: 1em;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 8px;
    }
    .story-header a {
      color: #3498db;
      text-decoration: none;
    }
    .story-header a:hover {
      text-decoration: underline;
    }
    .card-list {
      margin-left: 20px;
      margin-top: 8px;
    }
    .card-item {
      padding: 6px 12px;
      margin-bottom: 4px;
      background: white;
      border-radius: 4px;
      font-size: 0.9em;
      display: inline-block;
      margin-right: 8px;
    }
    .card-item a {
      color: #27ae60;
      text-decoration: none;
    }
    .card-item a:hover {
      text-decoration: underline;
    }
    .status-badge {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.75em;
      font-weight: 600;
      margin-left: 6px;
    }
    .status-badge.Done {
      background: #d4edda;
      color: #155724;
    }
    .status-badge.Ready {
      background: #cce5ff;
      color: #004085;
    }
    .status-badge.Unknown {
      background: #e0e0e0;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>🗺️ Documentation Sitemap</h1>
        <p class="subtitle">Hierarchical view of PRD → Story → Card relationships</p>
      </div>
      <div class="nav-links">
        <a href="/project-docs">← Project Docs</a>
        <a href="/prd">PRDs</a>
        <a href="/stories">Stories</a>
        <a href="/cards">Cards</a>
      </div>
    </div>

    <div class="tree">`;

        sitemap.forEach(prd => {
          html += `
      <details class="prd-node" open>
        <summary class="prd-header">
          📋 <a href="/prd/${prd.prd_id}">${prd.prd_id}: ${prd.title}</a>
          <span class="status-badge ${prd.status}">${prd.status}</span>
        </summary>
        <div class="prd-content">`;

          if (prd.stories.length === 0) {
            html += `<p style="color: #7f8c8d; font-style: italic;">No stories yet</p>`;
          } else {
            prd.stories.forEach(story => {
              html += `
          <div class="story-node">
            <div class="story-header">
              📖 <a href="/stories/${story.id}">${story.id}: ${story.title}</a>
              <span class="status-badge ${story.status}">${story.status}</span>
            </div>`;

              if (story.cards.length > 0) {
                html += `<div class="card-list">`;
                story.cards.forEach(card => {
                  html += `<div class="card-item">🎯 <a href="/cards/${card.slug}">${card.slug}</a> <span class="status-badge ${card.status}">${card.status}</span></div>`;
                });
                html += `</div>`;
              } else {
                html += `<div class="card-list" style="color: #7f8c8d; font-size: 0.85em; font-style: italic;">No cards yet</div>`;
              }

              html += `
          </div>`;
            });
          }

          html += `
        </div>
      </details>`;
        });

        html += `
    </div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error building sitemap:', error);
        res.status(500).json({ error: 'Failed to build sitemap' });
      }
    });

    // Test Coverage View
    this.app.get('/coverage', (_req, res) => {
      try {
        const coverageData = loadTestCoverageData();
        const coverageStats = getCoverageStats();

        if (!coverageData || !coverageData.coverage_registry) {
          return res.status(404).json({ error: 'Coverage data not found' });
        }

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Coverage</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .nav-links {
      display: flex;
      gap: 15px;
      font-size: 0.9em;
    }
    .nav-links a {
      color: #3498db;
      text-decoration: none;
      padding: 5px 10px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .nav-links a:hover {
      background: #e8f4f8;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 20px;
    }
    .stats-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-box {
      background: #f8f9fa;
      border-left: 4px solid #3498db;
      padding: 15px;
      border-radius: 4px;
    }
    .stat-box h3 {
      font-size: 0.9em;
      color: #7f8c8d;
      margin-bottom: 5px;
    }
    .stat-box .number {
      font-size: 2em;
      font-weight: 700;
      color: #2c3e50;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #2c3e50;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .status-indicator {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .status-indicator.complete {
      background: #d4edda;
      color: #155724;
    }
    .status-indicator.partial {
      background: #fff3cd;
      color: #856404;
    }
    .status-indicator.draft {
      background: #e0e0e0;
      color: #666;
    }
    a {
      color: #3498db;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>📊 Test Coverage</h1>
        <p class="subtitle">Test coverage metrics and Newman test reports</p>
      </div>
      <div class="nav-links">
        <a href="/project-docs">← Project Docs</a>
        <a href="/prd">PRDs</a>
      </div>
    </div>

    <div class="stats-summary">
      <div class="stat-box">
        <h3>Total PRDs</h3>
        <div class="number">${coverageStats.total_prds}</div>
      </div>
      <div class="stat-box">
        <h3>Fully Covered</h3>
        <div class="number">${coverageStats.complete}</div>
      </div>
      <div class="stat-box">
        <h3>Draft PRDs</h3>
        <div class="number">${coverageStats.draft}</div>
      </div>
      <div class="stat-box">
        <h3>Coverage Rate</h3>
        <div class="number">${Math.round((coverageStats.complete / coverageStats.total_prds) * 100)}%</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>PRD ID</th>
          <th>Title</th>
          <th>Status</th>
          <th>Requests</th>
          <th>Assertions</th>
          <th>Pass Rate</th>
          <th>Collection</th>
        </tr>
      </thead>
      <tbody>`;

        coverageData.coverage_registry.forEach(entry => {
          const statusClass = entry.status.includes('100%') || entry.status.includes('Complete')
            ? 'complete'
            : entry.status.includes('Draft')
            ? 'draft'
            : 'partial';

          const requests = entry.test_statistics?.total_requests || '-';
          const assertions = entry.test_statistics?.total_assertions || '-';
          const passed = entry.test_statistics?.passed_assertions || 0;
          const total = entry.test_statistics?.total_assertions || 0;
          const passRate = total > 0 ? `${Math.round((passed / total) * 100)}%` : '-';

          html += `
        <tr>
          <td><a href="/prd/${entry.prd_id}">${entry.prd_id}</a></td>
          <td>${entry.title}</td>
          <td><span class="status-indicator ${statusClass}">${entry.status}</span></td>
          <td>${requests}</td>
          <td>${assertions}</td>
          <td>${passRate}</td>
          <td>${entry.primary_collection ? '<code>' + entry.primary_collection.split('/').pop() + '</code>' : '-'}</td>
        </tr>`;
        });

        html += `
      </tbody>
    </table>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error loading coverage data:', error);
        res.status(500).json({ error: 'Failed to load coverage data' });
      }
    });

    // API routes registered via registerModuleRouters
  }

  private initializeSwagger(): void {
    // Swagger is now initialized in initializeRoutes
    // Keep this method for backward compatibility
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async initializeDatabase(): Promise<void> {
    try {
      await AppDataSource.initialize();
      logger.info('✅ Database connected successfully');
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }
}

export default App;
