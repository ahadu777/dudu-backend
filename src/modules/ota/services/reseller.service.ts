import { BaseOTAService } from './base.service';
import { OTAResellerEntity } from '../../../models/ota-reseller.entity';
import { OTATicketBatchEntity } from '../domain/ota-ticket-batch.entity';

/**
 * 分销商服务
 *
 * 处理分销商的 CRUD 和统计
 */
export class ResellerService extends BaseOTAService {

  /**
   * 获取分销商列表
   */
  async listResellers(partnerId: string): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const resellerRepo = this.getRepository(OTAResellerEntity);
      const resellers = await resellerRepo.find({
        where: { partner_id: partnerId },
        order: { created_at: 'DESC' }
      });

      return {
        resellers: resellers.map(r => ({
          id: r.id,
          reseller_code: r.reseller_code,
          reseller_name: r.reseller_name,
          contact_email: r.contact_email,
          contact_phone: r.contact_phone,
          commission_rate: r.commission_rate,
          status: r.status,
          tier: r.tier,
          region: r.region,
          created_at: r.created_at.toISOString()
        })),
        total: resellers.length
      };
    }

    // Mock
    return { resellers: [], total: 0 };
  }

  /**
   * 获取单个分销商
   */
  async getResellerById(resellerId: number, partnerId: string): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const resellerRepo = this.getRepository(OTAResellerEntity);
      const reseller = await resellerRepo.findOne({
        where: { id: resellerId, partner_id: partnerId }
      });

      if (!reseller) {
        throw { code: 'RESELLER_NOT_FOUND', message: `Reseller ${resellerId} not found` };
      }

      return {
        id: reseller.id,
        reseller_code: reseller.reseller_code,
        reseller_name: reseller.reseller_name,
        contact_email: reseller.contact_email,
        contact_phone: reseller.contact_phone,
        commission_rate: reseller.commission_rate,
        status: reseller.status,
        tier: reseller.tier,
        region: reseller.region,
        settlement_cycle: reseller.settlement_cycle,
        payment_terms: reseller.payment_terms,
        contract_start_date: reseller.contract_start_date,
        contract_end_date: reseller.contract_end_date,
        created_at: reseller.created_at.toISOString()
      };
    }

    throw { code: 'RESELLER_NOT_FOUND', message: `Reseller ${resellerId} not found` };
  }

  /**
   * 创建分销商
   */
  async createReseller(partnerId: string, data: any): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const resellerRepo = this.getRepository(OTAResellerEntity);

      const reseller = resellerRepo.create({
        partner_id: partnerId,
        reseller_code: data.reseller_code,
        reseller_name: data.reseller_name || data.name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        commission_rate: data.commission_rate || 0.10,
        status: data.status || 'active',
        tier: data.tier || 'bronze',
        region: data.region,
        settlement_cycle: data.settlement_cycle || 'monthly',
        payment_terms: data.payment_terms
      });

      const saved = await resellerRepo.save(reseller);

      this.log('ota.reseller.created', {
        reseller_id: saved.id,
        partner_id: partnerId,
        reseller_name: saved.reseller_name
      });

      return {
        id: saved.id,
        reseller_code: saved.reseller_code,
        reseller_name: saved.reseller_name,
        contact_email: saved.contact_email,
        status: saved.status,
        created_at: saved.created_at.toISOString()
      };
    }

    throw { code: 'DATABASE_ERROR', message: 'Database not available' };
  }

  /**
   * 更新分销商
   */
  async updateReseller(resellerId: number, partnerId: string, data: any): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const resellerRepo = this.getRepository(OTAResellerEntity);

      const reseller = await resellerRepo.findOne({
        where: { id: resellerId, partner_id: partnerId }
      });

      if (!reseller) {
        throw { code: 'RESELLER_NOT_FOUND', message: `Reseller ${resellerId} not found` };
      }

      // 更新字段
      if (data.reseller_name || data.name) reseller.reseller_name = data.reseller_name || data.name;
      if (data.contact_email) reseller.contact_email = data.contact_email;
      if (data.contact_phone !== undefined) reseller.contact_phone = data.contact_phone;
      if (data.commission_rate !== undefined) reseller.commission_rate = data.commission_rate;
      if (data.status) reseller.status = data.status;
      if (data.tier) reseller.tier = data.tier;
      if (data.region !== undefined) reseller.region = data.region;

      const saved = await resellerRepo.save(reseller);

      this.log('ota.reseller.updated', {
        reseller_id: saved.id,
        partner_id: partnerId
      });

      return {
        id: saved.id,
        reseller_code: saved.reseller_code,
        reseller_name: saved.reseller_name,
        contact_email: saved.contact_email,
        status: saved.status
      };
    }

    throw { code: 'DATABASE_ERROR', message: 'Database not available' };
  }

  /**
   * 停用分销商
   */
  async deactivateReseller(resellerId: number, partnerId: string): Promise<any> {
    return this.updateReseller(resellerId, partnerId, { status: 'suspended' });
  }

  /**
   * 获取分销商汇总
   */
  async getResellersSummary(partnerId: string, filters: any): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const batchRepo = this.getRepository(OTATicketBatchEntity);

      // 查询批次统计
      const batches = await batchRepo
        .createQueryBuilder('batch')
        .select('batch.reseller_id', 'reseller_id')
        .addSelect('COUNT(*)', 'batch_count')
        .addSelect('SUM(batch.total_quantity)', 'total_tickets')
        .where('batch.partner_id = :partnerId', { partnerId })
        .groupBy('batch.reseller_id')
        .getRawMany();

      return {
        resellers: batches.map(b => ({
          reseller_id: b.reseller_id,
          batch_count: parseInt(b.batch_count),
          total_tickets: parseInt(b.total_tickets) || 0
        })),
        total: batches.length
      };
    }

    return { resellers: [], total: 0 };
  }
}

// 单例
let instance: ResellerService | null = null;

export const getResellerService = (): ResellerService => {
  if (!instance) {
    instance = new ResellerService();
  }
  return instance;
};

export const resellerService = new Proxy({} as ResellerService, {
  get: (_, prop) => getResellerService()[prop as keyof ResellerService]
});
