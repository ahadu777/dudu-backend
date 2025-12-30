import { BaseOTAService } from './base.service';
import { Operator } from '../../../models/operator.entity';
import { ERR } from '../../../core/errors/codes';
import bcrypt from 'bcrypt';

/**
 * OTA Operator types
 */
export interface CreateOperatorRequest {
  account: string;
  password: string;
  real_name: string;
}

export interface UpdateOperatorRequest {
  real_name?: string;
  password?: string;
}

export interface OperatorResponse {
  id: number;
  account: string;
  real_name: string | null;
  status: 'ACTIVE' | 'DISABLED';
  operator_type: 'INTERNAL' | 'OTA';
  created_at: Date;
  updated_at: Date;
}

export interface OperatorListResponse {
  data: OperatorResponse[];
  total: number;
  page: number;
  limit: number;
}

/**
 * OTA Operator Service
 *
 * Handles CRUD operations for OTA operators
 */
export class OperatorService extends BaseOTAService {

  /**
   * Create a new operator for OTA
   */
  async createOperator(partnerId: string, request: CreateOperatorRequest): Promise<OperatorResponse> {
    this.log('ota.operators.create.requested', {
      partner_id: partnerId,
      account: request.account,
      real_name: request.real_name
    });

    // Validate account
    if (!request.account || request.account.length < 4 || request.account.length > 50) {
      throw {
        code: ERR.VALIDATION_ERROR,
        message: 'Account must be between 4 and 50 characters'
      };
    }

    // Validate password
    if (!request.password || request.password.length < 6) {
      throw {
        code: ERR.VALIDATION_ERROR,
        message: 'Password must be at least 6 characters'
      };
    }

    const operatorRepo = this.getRepository(Operator);

    // Check if account already exists
    const existing = await operatorRepo.findOne({
      where: { account: request.account }
    });

    if (existing) {
      throw {
        code: ERR.CONFLICT,
        message: 'Account already exists'
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(request.password, 10);

    // Create operator
    const operator = operatorRepo.create({
      account: request.account,
      password_hash: passwordHash,
      real_name: request.real_name,
      partner_id: partnerId,
      operator_type: 'OTA',
      status: 'ACTIVE'
    });

    const saved = await operatorRepo.save(operator);

    this.log('ota.operators.create.success', {
      partner_id: partnerId,
      operator_id: saved.id,
      account: saved.account
    });

    return this.toResponse(saved);
  }

  /**
   * List operators for OTA
   */
  async listOperators(
    partnerId: string,
    options: { status?: 'ACTIVE' | 'DISABLED'; page?: number; limit?: number }
  ): Promise<OperatorListResponse> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const operatorRepo = this.getRepository(Operator);

    const whereCondition: any = {
      partner_id: partnerId,
      operator_type: 'OTA'
    };

    if (options.status) {
      whereCondition.status = options.status;
    }

    const [operators, total] = await operatorRepo.findAndCount({
      where: whereCondition,
      order: { created_at: 'DESC' },
      skip,
      take: limit
    });

    this.log('ota.operators.list', {
      partner_id: partnerId,
      total,
      page,
      limit
    });

    return {
      data: operators.map(op => this.toResponse(op)),
      total,
      page,
      limit
    };
  }

  /**
   * Get operator by ID
   */
  async getOperator(partnerId: string, operatorId: number): Promise<OperatorResponse | null> {
    const operatorRepo = this.getRepository(Operator);

    const operator = await operatorRepo.findOne({
      where: {
        id: operatorId,
        partner_id: partnerId,
        operator_type: 'OTA'
      }
    });

    if (!operator) {
      return null;
    }

    return this.toResponse(operator);
  }

  /**
   * Update operator
   */
  async updateOperator(
    partnerId: string,
    operatorId: number,
    request: UpdateOperatorRequest
  ): Promise<OperatorResponse | null> {
    this.log('ota.operators.update.requested', {
      partner_id: partnerId,
      operator_id: operatorId
    });

    const operatorRepo = this.getRepository(Operator);

    const operator = await operatorRepo.findOne({
      where: {
        id: operatorId,
        partner_id: partnerId,
        operator_type: 'OTA'
      }
    });

    if (!operator) {
      return null;
    }

    // Update fields
    if (request.real_name !== undefined) {
      operator.real_name = request.real_name;
    }

    if (request.password) {
      if (request.password.length < 6) {
        throw {
          code: ERR.VALIDATION_ERROR,
          message: 'Password must be at least 6 characters'
        };
      }
      operator.password_hash = await bcrypt.hash(request.password, 10);
    }

    const saved = await operatorRepo.save(operator);

    this.log('ota.operators.update.success', {
      partner_id: partnerId,
      operator_id: saved.id
    });

    return this.toResponse(saved);
  }

  /**
   * Soft delete operator
   * Uses TypeORM softDelete to set deleted_at timestamp
   */
  async deleteOperator(partnerId: string, operatorId: number): Promise<boolean> {
    this.log('ota.operators.delete.requested', {
      partner_id: partnerId,
      operator_id: operatorId
    });

    const operatorRepo = this.getRepository(Operator);

    // First verify the operator exists and belongs to this OTA
    const operator = await operatorRepo.findOne({
      where: {
        id: operatorId,
        partner_id: partnerId,
        operator_type: 'OTA'
      }
    });

    if (!operator) {
      return false;
    }

    // Use TypeORM softDelete to set deleted_at
    await operatorRepo.softDelete(operatorId);

    this.log('ota.operators.delete.success', {
      partner_id: partnerId,
      operator_id: operatorId
    });

    return true;
  }

  /**
   * Convert entity to response
   */
  private toResponse(operator: Operator): OperatorResponse {
    return {
      id: operator.id,
      account: operator.account,
      real_name: operator.real_name,
      status: operator.status,
      operator_type: operator.operator_type,
      created_at: operator.created_at,
      updated_at: operator.updated_at
    };
  }
}

// Singleton instance
export const operatorService = new OperatorService();
