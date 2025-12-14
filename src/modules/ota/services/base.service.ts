import { DataSource, Repository } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import { dataSourceConfig } from '../../../config/data-source';
import { logger } from '../../../utils/logger';
import { OTARepository } from '../domain/ota.repository';

/**
 * OTA 服务基类
 *
 * 提供：
 * - 数据库连接状态检查
 * - TypeORM Repository 获取
 * - OTA Repository 获取
 * - 统一的日志记录
 */
export abstract class BaseOTAService {
  private _otaRepository: OTARepository | null = null;

  protected get dataSource(): DataSource {
    return AppDataSource;
  }

  /**
   * 检查数据库是否可用
   */
  protected async isDatabaseAvailable(): Promise<boolean> {
    try {
      return dataSourceConfig.useDatabase && AppDataSource.isInitialized;
    } catch {
      return false;
    }
  }

  /**
   * 获取 TypeORM Repository
   */
  protected getRepository<T extends object>(entity: new () => T): Repository<T> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not initialized');
    }
    return AppDataSource.getRepository(entity);
  }

  /**
   * 获取 OTA Repository（延迟初始化）
   */
  protected async getOTARepository(): Promise<OTARepository> {
    if (!this._otaRepository) {
      if (!AppDataSource.isInitialized) {
        throw new Error('Database not initialized');
      }
      this._otaRepository = new OTARepository(AppDataSource);
    }
    return this._otaRepository;
  }

  /**
   * 创建 QueryRunner（用于事务）
   */
  protected createQueryRunner() {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not initialized');
    }
    return AppDataSource.createQueryRunner();
  }

  /**
   * 记录日志
   */
  protected log(event: string, data?: Record<string, any>, level: 'info' | 'warn' | 'error' = 'info') {
    if (level === 'error') {
      logger.error(event, data);
    } else if (level === 'warn') {
      logger.warn(event, data);
    } else {
      logger.info(event, data);
    }
  }

  protected logError(event: string, error: any, data?: Record<string, any>) {
    logger.error(event, { error: error.message, ...data });
  }
}
