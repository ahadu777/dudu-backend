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
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick, etc.)
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
    // Homepage - Documentation Portal
    this.app.get('/', (_req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.send(this.generateHomepage());
    });

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


    // API routes registered via registerModuleRouters
  }

  private initializeSwagger(): void {
    // Swagger is now initialized in initializeRoutes
    // Keep this method for backward compatibility
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private generateHomepage(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Synque Platform • Documentation Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0a0a0f;
      --bg-card: #12121a;
      --bg-hover: #1a1a24;
      --border: #2a2a3a;
      --text-primary: #f0f0f5;
      --text-secondary: #8888aa;
      --text-dim: #555566;
      --accent-cyan: #00d4ff;
      --accent-magenta: #ff00aa;
      --accent-lime: #88ff00;
      --accent-orange: #ff8800;
      --accent-violet: #8855ff;
      --gradient-1: linear-gradient(135deg, #00d4ff 0%, #8855ff 100%);
      --gradient-2: linear-gradient(135deg, #ff00aa 0%, #ff8800 100%);
      --gradient-3: linear-gradient(135deg, #88ff00 0%, #00d4ff 100%);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Outfit', -apple-system, sans-serif;
      background: var(--bg-dark);
      color: var(--text-primary);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Animated background */
    .bg-grid {
      position: fixed;
      inset: 0;
      background-image: 
        linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px);
      background-size: 50px 50px;
      pointer-events: none;
      z-index: 0;
    }

    .bg-glow {
      position: fixed;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.15;
      pointer-events: none;
      z-index: 0;
    }

    .glow-1 {
      background: var(--accent-cyan);
      top: -200px;
      right: -100px;
      animation: float 20s ease-in-out infinite;
    }

    .glow-2 {
      background: var(--accent-magenta);
      bottom: -200px;
      left: -100px;
      animation: float 25s ease-in-out infinite reverse;
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(50px, 30px); }
    }

    .container {
      position: relative;
      z-index: 1;
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 24px;
    }

    /* Header */
    header {
      text-align: center;
      margin-bottom: 60px;
      padding: 40px 0;
    }

    .logo {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      color: var(--accent-cyan);
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .logo::before, .logo::after {
      content: '';
      width: 40px;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--accent-cyan));
    }

    .logo::after {
      background: linear-gradient(90deg, var(--accent-cyan), transparent);
    }

    h1 {
      font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 700;
      background: var(--gradient-1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 16px;
      line-height: 1.1;
    }

    .tagline {
      font-size: 1.2rem;
      color: var(--text-secondary);
      font-weight: 300;
    }

    /* Navigation */
    nav {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin: 40px 0;
      flex-wrap: wrap;
    }

    nav a {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      padding: 10px 20px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-secondary);
      text-decoration: none;
      transition: all 0.2s;
    }

    nav a:hover {
      border-color: var(--accent-cyan);
      color: var(--accent-cyan);
      transform: translateY(-2px);
    }

    /* Section Grid */
    .sections {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 24px;
      margin-bottom: 60px;
    }

    .section {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      transition: all 0.3s;
    }

    .section:hover {
      border-color: var(--border);
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .section-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .section-icon.prd { background: linear-gradient(135deg, rgba(0,212,255,0.2), rgba(136,85,255,0.2)); }
    .section-icon.stories { background: linear-gradient(135deg, rgba(255,0,170,0.2), rgba(255,136,0,0.2)); }
    .section-icon.research { background: linear-gradient(135deg, rgba(136,255,0,0.2), rgba(0,212,255,0.2)); }
    .section-icon.api { background: linear-gradient(135deg, rgba(136,85,255,0.2), rgba(255,0,170,0.2)); }
    .section-icon.lms { background: linear-gradient(135deg, rgba(255,136,0,0.2), rgba(136,255,0,0.2)); }
    .section-icon.demo { background: linear-gradient(135deg, rgba(0,212,255,0.2), rgba(136,255,0,0.2)); }

    .section h2 {
      font-size: 1.3rem;
      font-weight: 600;
      margin: 0;
    }

    .section-desc {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .section-links {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: var(--bg-dark);
      border: 1px solid transparent;
      border-radius: 10px;
      text-decoration: none;
      color: var(--text-primary);
      transition: all 0.2s;
    }

    .section-link:hover {
      background: var(--bg-hover);
      border-color: var(--border);
      transform: translateX(4px);
    }

    .link-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      flex-shrink: 0;
    }

    .link-icon.cyan { background: rgba(0,212,255,0.15); }
    .link-icon.magenta { background: rgba(255,0,170,0.15); }
    .link-icon.lime { background: rgba(136,255,0,0.15); }
    .link-icon.orange { background: rgba(255,136,0,0.15); }
    .link-icon.violet { background: rgba(136,85,255,0.15); }

    .link-content {
      flex: 1;
      min-width: 0;
    }

    .link-title {
      font-weight: 500;
      font-size: 0.95rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .link-subtitle {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .link-arrow {
      color: var(--text-dim);
      transition: all 0.2s;
    }

    .section-link:hover .link-arrow {
      color: var(--accent-cyan);
      transform: translateX(4px);
    }

    /* Status Badge */
    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status.live {
      background: rgba(136,255,0,0.15);
      color: var(--accent-lime);
    }

    .status.draft {
      background: rgba(255,136,0,0.15);
      color: var(--accent-orange);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Footer */
    footer {
      text-align: center;
      padding: 40px 0;
      border-top: 1px solid var(--border);
      margin-top: 40px;
    }

    footer p {
      color: var(--text-dim);
      font-size: 0.85rem;
    }

    footer a {
      color: var(--accent-cyan);
      text-decoration: none;
    }

    .footer-links {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 16px;
    }

    .footer-links a {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .footer-links a:hover {
      color: var(--accent-cyan);
    }

    /* Quick Stats */
    .stats {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin: 40px 0;
      flex-wrap: wrap;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      background: var(--gradient-1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stat-label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    @media (max-width: 768px) {
      .sections {
        grid-template-columns: 1fr;
      }
      .stats {
        gap: 24px;
      }
      .stat-value {
        font-size: 2rem;
      }
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="bg-glow glow-1"></div>
  <div class="bg-glow glow-2"></div>

  <div class="container">
    <header>
      <div class="logo">Synque Platform</div>
      <h1>Documentation Portal</h1>
      <p class="tagline">Enterprise-grade ticketing, payments, and loan management</p>
    </header>

    <nav>
      <a href="/docs">API Docs</a>
      <a href="/research">Research Hub</a>
      <a href="/demo">Demos</a>
      <a href="/healthz">Health</a>
      <a href="/openapi.json">OpenAPI</a>
    </nav>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">9</div>
        <div class="stat-label">PRDs</div>
      </div>
      <div class="stat">
        <div class="stat-value">20+</div>
        <div class="stat-label">User Stories</div>
      </div>
      <div class="stat">
        <div class="stat-value">50+</div>
        <div class="stat-label">API Endpoints</div>
      </div>
      <div class="stat">
        <div class="stat-value">5</div>
        <div class="stat-label">Research Topics</div>
      </div>
    </div>

    <div class="sections">
      <!-- PRDs Section -->
      <section class="section">
        <div class="section-header">
          <div class="section-icon prd">📋</div>
          <div>
            <h2>Product Requirements</h2>
            <p class="section-desc">PRDs defining platform capabilities</p>
          </div>
        </div>
        <div class="section-links">
          <a href="/prd/PRD-001" class="section-link">
            <span class="link-icon cyan">🎫</span>
            <div class="link-content">
              <div class="link-title">PRD-001: Cruise Ticketing Platform</div>
              <div class="link-subtitle">Core ticketing & reservation system</div>
            </div>
            <span class="link-arrow">→</span>
          </a>
          <a href="/prd/PRD-002" class="section-link">
            <span class="link-icon magenta">🔌</span>
            <div class="link-content">
              <div class="link-title">PRD-002: OTA Integration</div>
              <div class="link-subtitle">B2B distribution channels</div>
            </div>
            <span class="link-arrow">→</span>
          </a>
          <a href="/prd/PRD-009" class="section-link">
            <span class="link-icon lime">🏦</span>
            <div class="link-content">
              <div class="link-title">PRD-009: Loan Management System</div>
              <div class="link-subtitle">Enterprise LMS with KYC/AML</div>
            </div>
            <span class="status draft"><span class="status-dot"></span>New</span>
          </a>
        </div>
      </section>

      <!-- LMS Section -->
      <section class="section">
        <div class="section-header">
          <div class="section-icon lms">🏦</div>
          <div>
            <h2>Loan Management System</h2>
            <p class="section-desc">Enterprise lending platform APIs</p>
          </div>
        </div>
        <div class="section-links">
          <a href="/lms/health" class="section-link">
            <span class="link-icon lime">💚</span>
            <div class="link-content">
              <div class="link-title">LMS Health Check</div>
              <div class="link-subtitle">Service status & connectivity</div>
            </div>
            <span class="status live"><span class="status-dot"></span>Live</span>
          </a>
          <a href="/lms/borrowers" class="section-link">
            <span class="link-icon cyan">👤</span>
            <div class="link-content">
              <div class="link-title">Borrower Management</div>
              <div class="link-subtitle">KYC, AML, Credit verification</div>
            </div>
            <span class="link-arrow">→</span>
          </a>
          <a href="/lms/stats" class="section-link">
            <span class="link-icon orange">📊</span>
            <div class="link-content">
              <div class="link-title">LMS Statistics</div>
              <div class="link-subtitle">Borrowers, applications, audits</div>
            </div>
            <span class="link-arrow">→</span>
          </a>
          <a href="/lms/audit" class="section-link">
            <span class="link-icon violet">📝</span>
            <div class="link-content">
              <div class="link-title">Audit Trail</div>
              <div class="link-subtitle">Compliance & activity logs</div>
            </div>
            <span class="link-arrow">→</span>
          </a>
        </div>
      </section>

      <!-- Research Hub -->
      <section class="section">
        <div class="section-header">
          <div class="section-icon research">🔬</div>
          <div>
            <h2>Research Hub</h2>
            <p class="section-desc">AI-assisted research organization</p>
          </div>
        </div>
        <div class="section-links">
          <a href="/research" class="section-link">
            <span class="link-icon lime">🗂️</span>
            <div class="link-content">
              <div class="link-title">Research Dashboard</div>
              <div class="link-subtitle">Topics, sources, synthesis</div>
            </div>
            <span class="status live"><span class="status-dot"></span>Live</span>
          </a>
          <a href="/research/insights/5" class="section-link">
            <span class="link-icon orange">📰</span>
            <div class="link-content">
              <div class="link-title">LMS Research Insights</div>
              <div class="link-subtitle">Published research memo</div>
            </div>
            <span class="link-arrow">→</span>
          </a>
        </div>
      </section>

      <!-- User Stories -->
      <section class="section">
        <div class="section-header">
          <div class="section-icon stories">📖</div>
          <div>
            <h2>User Stories</h2>
            <p class="section-desc">Detailed acceptance criteria</p>
          </div>
        </div>
        <div class="section-links">
          <a href="/stories" class="section-link">
            <span class="link-icon magenta">📚</span>
            <div class="link-content">
              <div class="link-title">Story Index</div>
              <div class="link-subtitle">All user stories & status</div>
            </div>
            <span class="link-arrow">→</span>
          </a>
          <a href="/story/US-LMS-001" class="section-link">
            <span class="link-icon cyan">👤</span>
            <div class="link-content">
              <div class="link-title">US-LMS-001: Borrower Onboarding</div>
              <div class="link-subtitle">KYC/AML verification flow</div>
            </div>
            <span class="status draft"><span class="status-dot"></span>Draft</span>
          </a>
          <a href="/story/US-LMS-003" class="section-link">
            <span class="link-icon lime">🤖</span>
            <div class="link-content">
              <div class="link-title">US-LMS-003: Credit Decision</div>
              <div class="link-subtitle">Automated underwriting engine</div>
            </div>
            <span class="status draft"><span class="status-dot"></span>Draft</span>
          </a>
        </div>
      </section>

      <!-- API Documentation -->
      <section class="section">
        <div class="section-header">
          <div class="section-icon api">⚡</div>
          <div>
            <h2>API Documentation</h2>
            <p class="section-desc">OpenAPI specs & Swagger UI</p>
          </div>
        </div>
        <div class="section-links">
          <a href="/docs" class="section-link">
            <span class="link-icon violet">📘</span>
            <div class="link-content">
              <div class="link-title">Swagger UI</div>
              <div class="link-subtitle">Interactive API explorer</div>
            </div>
            <span class="status live"><span class="status-dot"></span>Live</span>
          </a>
          <a href="/openapi.json" class="section-link">
            <span class="link-icon cyan">📄</span>
            <div class="link-content">
              <div class="link-title">OpenAPI Specification</div>
              <div class="link-subtitle">Machine-readable API contract</div>
            </div>
            <span class="link-arrow">→</span>
          </a>
          <a href="/catalog" class="section-link">
            <span class="link-icon orange">🎫</span>
            <div class="link-content">
              <div class="link-title">Product Catalog</div>
              <div class="link-subtitle">Available tickets & passes</div>
            </div>
            <span class="link-arrow">→</span>
          </a>
        </div>
      </section>

      <!-- Demos -->
      <section class="section">
        <div class="section-header">
          <div class="section-icon demo">🎮</div>
          <div>
            <h2>Interactive Demos</h2>
            <p class="section-desc">Live feature demonstrations</p>
          </div>
        </div>
        <div class="section-links">
          <a href="/demo" class="section-link">
            <span class="link-icon cyan">🎛️</span>
            <div class="link-content">
              <div class="link-title">Main Dashboard</div>
              <div class="link-subtitle">Platform overview & metrics</div>
            </div>
            <span class="link-arrow">→</span>
          </a>
          <a href="/demo/promotions" class="section-link">
            <span class="link-icon magenta">🎁</span>
            <div class="link-content">
              <div class="link-title">Promotion Showcase</div>
              <div class="link-subtitle">Product cards & pricing</div>
            </div>
            <span class="link-arrow">→</span>
          </a>
          <a href="/demo/admin-packages" class="section-link">
            <span class="link-icon lime">⚙️</span>
            <div class="link-content">
              <div class="link-title">Admin Package Config</div>
              <div class="link-subtitle">Template & fare management</div>
            </div>
            <span class="link-arrow">→</span>
          </a>
        </div>
      </section>
    </div>

    <footer>
      <div class="footer-links">
        <a href="/healthz">Health</a>
        <a href="/version">Version</a>
        <a href="/openapi.json">OpenAPI</a>
        <a href="https://github.com" target="_blank">GitHub</a>
      </div>
      <p>Built with Express.js & TypeScript • © 2025 Synque Platform</p>
    </footer>
  </div>
</body>
</html>`;
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
