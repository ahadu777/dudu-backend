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

    // Swagger UI
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
