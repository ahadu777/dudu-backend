import { Application } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { env } from './env';

// 动态生成服务器地址
const getServers = () => {
  const servers = [];
  
  // 生产环境：使用实际域名或相对路径
  if (env.NODE_ENV === 'production') {
    // 如果设置了 APP_URL 环境变量，使用它
    if (process.env.APP_URL) {
      servers.push({
        url: process.env.APP_URL,
        description: 'Production server',
      });
    } else {
      // 否则使用相对路径（推荐）
      servers.push({
        url: '/',
        description: 'Current server',
      });
    }
  } else {
    // 开发环境：使用 localhost
    servers.push({
      url: `http://localhost:${env.PORT}`,
      description: 'Development server',
    });
  }
  
  return servers;
};

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express TypeScript API',
      version: '1.0.0',
      description: 'A modern Express API with TypeScript, MySQL and Swagger documentation',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: getServers(),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'], // 扫描包含 JSDoc 注释的文件
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Application): void => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Express API Documentation',
  }));

  // Swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

