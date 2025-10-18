import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'express_api',
  // synchronize: process.env.NODE_ENV === 'development', // 生产环境应设为 false
  // synchronize: true,
  logging: process.env.NODE_ENV === 'development',
  entities: [__dirname + '/../models/*.{ts,js}'],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  subscribers: [],
  charset: 'utf8mb4',
  timezone: '+08:00',
});

