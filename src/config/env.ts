import dotenv from 'dotenv';
import { cleanEnv, str, num, bool } from 'envalid';

// Load environment variables
dotenv.config();

// Validate and export environment variables
export const env = cleanEnv(process.env, {
  // Server Configuration
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  PORT: num({ default: 8080 }), // App Platform 使用 8080，本地开发可以设置为 3000

  // Database Configuration
  DB_HOST: str({ default: 'localhost' }),
  DB_PORT: num({ default: 3306 }),
  DB_USERNAME: str({ default: 'root' }),
  DB_PASSWORD: str({ default: '' }),
  DB_DATABASE: str({ default: 'express_api' }),

  // API Configuration
  API_PREFIX: str({ default: '/api/v1' }),
  APP_URL: str({ default: '' }), // 生产环境的完整 URL（可选）

  // Swagger Configuration
  SWAGGER_ENABLED: bool({ default: true }),

  // JWT Configuration (可选)
  JWT_SECRET: str({ default: 'your-secret-key-change-in-production' }),
  JWT_EXPIRES_IN: str({ default: '7d' }),

  // QR Token Configuration
  QR_SIGNER_SECRET: str({ default: 'qr-signing-secret-change-in-production' }),
  // QR token TTL in seconds (default 5 minutes)
  QR_TOKEN_TTL_SECONDS: num({ default: 300 }),
});
