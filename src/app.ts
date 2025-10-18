import 'reflect-metadata';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env, AppDataSource, setupSwagger } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { loggingMiddleware } from './middlewares/logging';
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

    // Custom logging middleware
    if (env.NODE_ENV !== 'test') {
      this.app.use(loggingMiddleware);
    }
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
      });
    });

    // API routes
    this.app.use(env.API_PREFIX, routes);
  }

  private initializeSwagger(): void {
    if (env.SWAGGER_ENABLED) {
      setupSwagger(this.app);
    }
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

