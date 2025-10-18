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
    // Security middleware
    this.app.use(helmet());

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

    // Stub endpoints for future development
    this.app.get('/catalog', (_req, res) => res.json({ products: [] }));
    this.app.post('/orders', (_req, res) =>
      res.json({ order_id: 1, status: 'PENDING_PAYMENT', amounts: { subtotal: 0, discount: 0, total: 0 } })
    );
    this.app.post('/orders/:id/pay', (_req, res) => res.json({ method: 'mock', payload: {} }));
    this.app.post('/payments/notify', (_req, res) => res.json({ ok: true, processed: false }));
    this.app.get('/my/tickets', (_req, res) => res.json({ tickets: [] }));
    this.app.post('/tickets/:code/qr-token', (_req, res) => res.json({ token: 'mock.jwt', expires_in: 60 }));
    this.app.post('/operators/login', (_req, res) => res.json({ operator_token: 'mock-operator-token' }));
    this.app.post('/validators/sessions', (_req, res) => res.json({ session_id: 'sess-123', expires_in: 3600 }));
    this.app.post('/tickets/scan', (_req, res) =>
      res.json({ result: 'success', ticket_status: 'active', entitlements: [], ts: new Date().toISOString() })
    );
    this.app.get('/reports/redemptions', (_req, res) => res.json({ events: [] }));

    // API routes
    this.app.use(env.API_PREFIX, routes);
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

