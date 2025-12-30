import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../../config/database';
import { OperatorRepository } from './domain/operator.repository';
import { mockStore } from '../../core/mock/store';
import { dataSourceConfig } from '../../config/data-source';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export interface OperatorLoginRequest {
  username: string;
  password: string;
}

export interface OperatorLoginResponse {
  operator_token: string;
}

export interface OperatorInfo {
  operator_id: number;
  username: string;
  roles: string[];
  partner_id?: string | null;
  operator_type?: 'INTERNAL' | 'OTA';
}

export class OperatorService {
  private operatorRepository: OperatorRepository | null = null;

  private async getRepository(): Promise<OperatorRepository> {
    if (!this.operatorRepository) {
      if (AppDataSource.isInitialized) {
        this.operatorRepository = new OperatorRepository(AppDataSource);
      } else {
        throw new Error('Database not initialized');
      }
    }
    return this.operatorRepository;
  }

  private async isDatabaseAvailable(): Promise<boolean> {
    try {
      await this.getRepository();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Operator login - returns JWT token
   */
  async login(request: OperatorLoginRequest): Promise<OperatorLoginResponse | null> {
    const { username, password } = request;

    logger.info('operators.login.attempt', { username });

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Database mode
      return this.loginWithDatabase(username, password);
    } else {
      // Mock mode
      return this.loginWithMock(username, password);
    }
  }

  /**
   * Database mode login
   */
  private async loginWithDatabase(username: string, password: string): Promise<OperatorLoginResponse | null> {
    try {
      const repo = await this.getRepository();

      // Find operator by account
      const operator = await repo.findByAccount(username);

      if (!operator) {
        logger.info('operators.login.fail', { username, reason: 'user_not_found', mode: 'database' });
        return null;
      }

      // Check if operator is active
      if (!operator.isActive()) {
        logger.info('operators.login.fail', { username, reason: 'operator_disabled', mode: 'database' });
        return null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, operator.password_hash);
      if (!isPasswordValid) {
        logger.info('operators.login.fail', { username, reason: 'invalid_password', mode: 'database' });
        return null;
      }

      // Generate JWT token with partner_id for OTA operators
      const token = this.generateToken({
        operator_id: Number(operator.id),
        username: operator.account,
        roles: ['gate_operator'], // Default role, can be extended later
        partner_id: operator.partner_id,
        operator_type: operator.operator_type
      });

      logger.info('operators.login.success', {
        operator_id: operator.id,
        username: operator.account,
        partner_id: operator.partner_id,
        operator_type: operator.operator_type,
        mode: 'database'
      });

      return { operator_token: token };

    } catch (error) {
      logger.error('operators.login.database.error', {
        username,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Mock mode login
   */
  private async loginWithMock(username: string, password: string): Promise<OperatorLoginResponse | null> {
    try {
      // Get operator from mock store
      const operator = mockStore.getOperator(username);

      if (!operator) {
        logger.info('operators.login.fail', { username, reason: 'user_not_found', mode: 'mock' });
        return null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, operator.password_hash);
      if (!isPasswordValid) {
        logger.info('operators.login.fail', { username, reason: 'invalid_password', mode: 'mock' });
        return null;
      }

      // Generate JWT token
      const token = this.generateToken({
        operator_id: operator.operator_id,
        username: operator.username,
        roles: operator.roles
      });

      logger.info('operators.login.success', {
        operator_id: operator.operator_id,
        username: operator.username,
        roles: operator.roles,
        mode: 'mock'
      });

      return { operator_token: token };

    } catch (error) {
      logger.error('operators.login.mock.error', {
        username,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate JWT token for operator
   * Includes partner_id and operator_type for OTA operators
   */
  private generateToken(operatorInfo: OperatorInfo): string {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (24 * 60 * 60); // 24 hours

    const payload: Record<string, any> = {
      sub: operatorInfo.operator_id,
      username: operatorInfo.username,
      roles: operatorInfo.roles,
      iat: now,
      exp
    };

    // Include OTA-specific fields if present
    if (operatorInfo.partner_id) {
      payload.partner_id = operatorInfo.partner_id;
    }
    if (operatorInfo.operator_type) {
      payload.operator_type = operatorInfo.operator_type;
    }

    return jwt.sign(payload, env.JWT_SECRET, {
      algorithm: 'HS256'
    });
  }
}

// Export singleton instance
export const operatorService = new OperatorService();
