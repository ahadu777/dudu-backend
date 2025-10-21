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
import routes from './routes';

// Module routers
import catalogRouter from './modules/catalog/router';
import ordersRouter from './modules/orders/router';
import paymentsRouter from './modules/payments/router';
import ticketsRouter from './modules/tickets/router';
import operatorsRouter from './modules/operators/router';
import redeemRouter from './modules/redeem/router';
import reportsRouter from './modules/reports/router';
import refundsRouter from './modules/refunds/router';
import policiesRouter from './modules/policies/router';
import profileRouter from './modules/profile/router';
import authDemoRouter from './modules/auth/demo';

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

    // Mount module routers
    this.app.use('/catalog', catalogRouter);
    this.app.use('/orders', ordersRouter);
    this.app.use('/payments', paymentsRouter);
    this.app.use('/my', ticketsRouter);
    this.app.use('/tickets', ticketsRouter);   // for /tickets/{code}/cancel
    this.app.use('/tickets', redeemRouter);    // for redemption endpoints
    this.app.use('/operators', operatorsRouter);
    this.app.use('/validators', operatorsRouter);
    this.app.use('/reports', reportsRouter);

    // Cancellation and refund routes
    this.app.use('/payments', refundsRouter);  // for /payments/refund
    this.app.use('/', refundsRouter);          // for /my/refunds
    this.app.use('/', policiesRouter);         // for /cancellation-policies

    // Profile and settings routes
    this.app.use('/profile', profileRouter);   // for /profile, /profile/settings, /profile/activity

    // Auth demo routes
    this.app.use('/api/v1/auth', authDemoRouter);  // for /api/v1/auth/demo-token

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

    // API routes
    this.app.use(env.API_PREFIX, routes);

    // Demo auth endpoints
    this.app.use(env.API_PREFIX + '/auth', authDemoRouter);
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

