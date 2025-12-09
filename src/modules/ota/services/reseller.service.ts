import { BaseOTAService } from './base.service';
import { OTAResellerEntity } from '../../../models/ota-reseller.entity';
import { OTATicketBatchEntity } from '../domain/ota-ticket-batch.entity';
import { TicketEntity } from '../../../models/ticket.entity';

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
   * 返回完整的 statistics, revenue_metrics, batches 数据
   */
  async getResellersSummary(partnerId: string, filters: any): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const resellerRepo = this.getRepository(OTAResellerEntity);
      const batchRepo = this.getRepository(OTATicketBatchEntity);
      const ticketRepo = this.getRepository(TicketEntity);

      // 1. 获取所有分销商
      const resellers = await resellerRepo.find({
        where: { partner_id: partnerId },
        order: { created_at: 'DESC' }
      });

      // 2. 获取批次统计（按分销商分组）
      const batchStats = await batchRepo
        .createQueryBuilder('batch')
        .select('batch.reseller_id', 'reseller_id')
        .addSelect('COUNT(*)', 'total_batches')
        .addSelect('SUM(batch.total_quantity)', 'total_tickets_generated')
        .where('batch.partner_id = :partnerId', { partnerId })
        .andWhere('batch.reseller_id IS NOT NULL')
        .groupBy('batch.reseller_id')
        .getRawMany();

      // 3. 获取票券状态统计（按分销商分组）
      const ticketStats = await ticketRepo
        .createQueryBuilder('ticket')
        .innerJoin(OTATicketBatchEntity, 'batch', 'ticket.batch_id = batch.batch_id')
        .select('batch.reseller_id', 'reseller_id')
        .addSelect('COUNT(CASE WHEN ticket.status IN (\'ACTIVATED\', \'RESERVED\', \'VERIFIED\') THEN 1 END)', 'total_tickets_activated')
        .addSelect('COUNT(CASE WHEN ticket.status = \'VERIFIED\' THEN 1 END)', 'total_tickets_used')
        .addSelect('SUM(CASE WHEN ticket.status = \'VERIFIED\' THEN COALESCE(ticket.ticket_price, 0) ELSE 0 END)', 'total_revenue')
        .where('batch.partner_id = :partnerId', { partnerId })
        .andWhere('batch.reseller_id IS NOT NULL')
        .groupBy('batch.reseller_id')
        .getRawMany();

      // 4. 获取每个分销商的批次列表
      const allBatches = await batchRepo.find({
        where: { partner_id: partnerId },
        order: { created_at: 'DESC' }
      });

      // 5. 构建分销商统计 Map
      const batchStatsMap = new Map(batchStats.map(s => [s.reseller_id, s]));
      const ticketStatsMap = new Map(ticketStats.map(s => [s.reseller_id, s]));
      const batchesByReseller = new Map<number, OTATicketBatchEntity[]>();

      for (const batch of allBatches) {
        if (batch.reseller_id) {
          if (!batchesByReseller.has(batch.reseller_id)) {
            batchesByReseller.set(batch.reseller_id, []);
          }
          batchesByReseller.get(batch.reseller_id)!.push(batch);
        }
      }

      // 6. 组装完整响应
      const resellerSummaries = resellers.map(reseller => {
        const batchStat = batchStatsMap.get(reseller.id) || {};
        const ticketStat = ticketStatsMap.get(reseller.id) || {};
        const resellerBatches = batchesByReseller.get(reseller.id) || [];

        const totalGenerated = parseInt(batchStat.total_tickets_generated) || 0;
        const totalActivated = parseInt(ticketStat.total_tickets_activated) || 0;
        const totalUsed = parseInt(ticketStat.total_tickets_used) || 0;
        const totalRevenue = parseFloat(ticketStat.total_revenue) || 0;

        // 计算比率
        const activationRate = totalGenerated > 0 ? totalActivated / totalGenerated : 0;
        const redemptionRate = totalActivated > 0 ? totalUsed / totalActivated : 0;
        const overallUtilization = totalGenerated > 0 ? totalUsed / totalGenerated : 0;

        return {
          reseller_id: reseller.id,
          reseller_code: reseller.reseller_code,
          reseller_name: reseller.reseller_name,
          contact_email: reseller.contact_email,
          contact_phone: reseller.contact_phone,
          status: reseller.status,
          tier: reseller.tier,
          region: reseller.region,
          commission_rate: reseller.commission_rate,

          // 统计数据 - 始终返回完整对象，避免 undefined
          statistics: {
            total_batches: parseInt(batchStat.total_batches) || 0,
            total_tickets_generated: totalGenerated,
            total_tickets_activated: totalActivated,
            total_tickets_used: totalUsed,
            activation_rate: Math.round(activationRate * 10000) / 100, // 百分比，保留2位小数
            redemption_rate: Math.round(redemptionRate * 10000) / 100,
            overall_utilization: Math.round(overallUtilization * 10000) / 100
          },

          // 收入指标
          revenue_metrics: {
            total_revenue: totalRevenue,
            commission_earned: totalRevenue * (reseller.commission_rate || 0),
            currency: 'HKD'
          },

          // 批次列表（限制返回最近 10 条）
          batches: resellerBatches.slice(0, 10).map(batch => ({
            batch_id: batch.batch_id,
            product_id: batch.product_id,
            total_quantity: batch.total_quantity,
            status: batch.status,
            distribution_mode: batch.distribution_mode,
            campaign_type: batch.batch_metadata?.campaign_type || 'standard',
            created_at: batch.created_at.toISOString(),
            expires_at: batch.expires_at?.toISOString() || null
          }))
        };
      });

      return {
        resellers: resellerSummaries,
        total: resellers.length,
        // 聚合统计
        summary: {
          total_resellers: resellers.length,
          active_resellers: resellers.filter(r => r.status === 'active').length,
          total_batches: batchStats.reduce((sum, s) => sum + (parseInt(s.total_batches) || 0), 0),
          total_tickets_generated: batchStats.reduce((sum, s) => sum + (parseInt(s.total_tickets_generated) || 0), 0)
        }
      };
    }

    return { resellers: [], total: 0, summary: { total_resellers: 0, active_resellers: 0, total_batches: 0, total_tickets_generated: 0 } };
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
