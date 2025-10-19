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

    // Mount module routers
    this.app.use('/catalog', catalogRouter);
    this.app.use('/orders', ordersRouter);
    this.app.use('/payments', paymentsRouter);
    this.app.use('/my', ticketsRouter);
    this.app.use('/tickets', redeemRouter);
    this.app.use('/operators', operatorsRouter);
    this.app.use('/validators', operatorsRouter);
    this.app.use('/reports', reportsRouter);

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

