import { DataSource } from 'typeorm';
import path from 'path';
import dotenv from 'dotenv';
import { SHARED_ENTITIES } from '../models';

dotenv.config();


export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'express_api',
  synchronize: false, // Disabled - tables already exist
  // logging: process.env.NODE_ENV === 'development', // 显示所有 SQL（调试用）
  logging: ['error', 'warn'], // 只显示错误和警告（推荐）
  entities: [
    ...SHARED_ENTITIES, // Shared models (explicitly registered in models/index.ts)
    path.resolve(__dirname, '../modules/**/domain/**/*.entity.{ts,js}'), // Module-specific models
  ],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  subscribers: [],
  charset: 'utf8mb4',
  timezone: '+08:00',
  maxQueryExecutionTime: 1000, // 慢查询警告（超过 1 秒）
  // ssl: false, // Disable SSL for local connections
  extra: {
    connectionLimit: 10,
  },
});
