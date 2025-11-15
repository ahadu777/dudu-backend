import { DataSource, Repository } from 'typeorm';
import { Operator } from '../../../models/operator.entity';
import { logger } from '../../../utils/logger';

export class OperatorRepository {
  private operatorRepo: Repository<Operator>;

  constructor(private dataSource: DataSource) {
    this.operatorRepo = dataSource.getRepository(Operator);
  }

  /**
   * Find operator by account (username)
   */
  async findByAccount(account: string): Promise<Operator | null> {
    try {
      const operator = await this.operatorRepo.findOne({
        where: { account }
      });

      return operator;
    } catch (error) {
      logger.error('operator.repository.findByAccount.error', {
        account,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Find operator by ID
   */
  async findById(id: number): Promise<Operator | null> {
    try {
      const operator = await this.operatorRepo.findOne({
        where: { id }
      });

      return operator;
    } catch (error) {
      logger.error('operator.repository.findById.error', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create a new operator
   */
  async create(operatorData: {
    account: string;
    password_hash: string;
    real_name?: string;
    merchant_id?: number;
    status?: 'ACTIVE' | 'DISABLED';
  }): Promise<Operator> {
    try {
      const operator = this.operatorRepo.create({
        account: operatorData.account,
        password_hash: operatorData.password_hash,
        real_name: operatorData.real_name || null,
        merchant_id: operatorData.merchant_id || null,
        status: operatorData.status || 'ACTIVE'
      });

      const saved = await this.operatorRepo.save(operator);

      logger.info('operator.repository.create.success', {
        operator_id: saved.id,
        account: saved.account
      });

      return saved;
    } catch (error) {
      logger.error('operator.repository.create.error', {
        account: operatorData.account,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update operator status
   */
  async updateStatus(id: number, status: 'ACTIVE' | 'DISABLED'): Promise<boolean> {
    try {
      const result = await this.operatorRepo.update(
        { id },
        { status }
      );

      return (result.affected || 0) > 0;
    } catch (error) {
      logger.error('operator.repository.updateStatus.error', {
        id,
        status,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
