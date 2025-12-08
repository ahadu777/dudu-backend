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

  // QR Code Encryption Configuration
  // Must be 64 hex characters (32 bytes) for AES-256
  // Generate with: openssl rand -hex 32
  QR_ENCRYPTION_KEY: str({ default: 'a'.repeat(64) }), // MUST change in production
  // QR code expiration time in minutes (default 30 minutes)
  QR_EXPIRY_MINUTES: num({ default: 30 }),

  // WeChat Mini-Program Configuration
  WECHAT_APPID: str({ default: 'wx39a36fbaaefacd42' }), // WeChat mini-program AppID
  WECHAT_APP_SECRET: str({ default: '6afcba50d4b53ebc6034e213a8bd8592' }), // WeChat mini-program AppSecret

  // Wallyt/SwiftPass Payment Configuration
  WALLYT_API_URL: str({ default: 'https://gateway.wepayez.com/pay/gateway' }), // Payment API endpoint
  WALLYT_MCH_ID: str({ default: '' }), // Merchant ID (商户号)
  WALLYT_SECRET_KEY: str({ default: '' }), // API Secret Key (支付密钥)
  WALLYT_SIGN_TYPE: str({ choices: ['MD5', 'SHA256'], default: 'MD5' }), // Signature type
  WALLYT_NOTIFY_URL: str({ default: '' }), // Payment callback URL

  // Directus CMS Configuration (for QR Code logo images + Ticket Reservations)
  USE_DIRECTUS: bool({ default: false }), // Enable Directus CMS integration for ticket reservations
  DIRECTUS_URL: str({ default: 'https://dudu-derp-cxk5g.ondigitalocean.app' }), // Directus instance URL (e.g., https://your-directus.com)
  DIRECTUS_ACCESS_TOKEN: str({ default: 'HE9EiIEgdf-UD7quY4Ajoas19vgmkFvF' }), // Directus access token with reservation permissions
  LOGO_CACHE_TTL: num({ default: 3600 }), // Logo cache TTL in seconds (default 1 hour)
});
