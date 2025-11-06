import winston from 'winston';
import { env } from '../config/env';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const isDevelopment = env.NODE_ENV === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// 控制台格式（简化，确保输出）
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: false, level: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...metadata } = info;
    let logMessage = `[${timestamp}] ${level}: ${message}`;

    // 如果有额外的元数据，以JSON格式附加
    if (Object.keys(metadata).length > 0) {
      // 过滤掉winston内部字段
      const filteredMetadata = Object.keys(metadata)
        .filter(key => !['level', 'timestamp', 'message', Symbol.for('level'), Symbol.for('message')].includes(key))
        .reduce((obj, key) => {
          obj[key] = metadata[key];
          return obj;
        }, {} as Record<string, any>);

      if (Object.keys(filteredMetadata).length > 0) {
        logMessage += ` ${JSON.stringify(filteredMetadata)}`;
      }
    }

    return logMessage;
  })
);

// 文件格式（无颜色）
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...metadata } = info;
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // 如果有额外的元数据，以JSON格式附加
    if (Object.keys(metadata).length > 0) {
      const filteredMetadata = Object.keys(metadata)
        .filter(key => !['level', 'timestamp', 'message', Symbol.for('level'), Symbol.for('message')].includes(key))
        .reduce((obj, key) => {
          obj[key] = metadata[key];
          return obj;
        }, {} as Record<string, any>);

      if (Object.keys(filteredMetadata).length > 0) {
        logMessage += ` ${JSON.stringify(filteredMetadata)}`;
      }
    }

    return logMessage;
  })
);

export const logger = winston.createLogger({
  level: level(),
  levels,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // 错误日志文件
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: 'logs/all.log',
      format: fileFormat,
    }),
  ],
});

