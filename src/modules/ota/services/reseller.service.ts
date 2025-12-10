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
   * 获取分销商列表（支持分页）
   */
  async listResellers(partnerId: string, pagination?: { page?: number; limit?: number }): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const resellerRepo = this.getRepository(OTAResellerEntity);

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const offset = (page - 1) * limit;

      const [resellers, total] = await resellerRepo.findAndCount({
        where: { partner_id: partnerId },
        order: { created_at: 'DESC' },
        skip: offset,
        take: limit
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
        total
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
   * 从 ota_ticket_batches 表聚合出实际有批次数据的经销商
   * 返回完整的 statistics, revenue_metrics, batches 数据
   */
  async getResellersSummary(partnerId: string, filters: any): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const batchRepo = this.getRepository(OTATicketBatchEntity);
      const ticketRepo = this.getRepository(TicketEntity);
      const resellerRepo = this.getRepository(OTAResellerEntity);

      // 分页参数
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      // 1. 从批次表聚合出所有经销商（基于 reseller_metadata.intended_reseller）
      const resellerAggregation = await batchRepo
        .createQueryBuilder('batch')
        .select("JSON_UNQUOTE(JSON_EXTRACT(batch.reseller_metadata, '$.intended_reseller'))", 'reseller_name')
        .addSelect('batch.reseller_id', 'reseller_id')
        .addSelect("JSON_UNQUOTE(JSON_EXTRACT(batch.reseller_metadata, '$.contact_email'))", 'contact_email')
        .addSelect("JSON_UNQUOTE(JSON_EXTRACT(batch.reseller_metadata, '$.contact_phone'))", 'contact_phone')
        .addSelect('COUNT(*)', 'total_batches')
        .addSelect('SUM(batch.total_quantity)', 'total_tickets_generated')
        .addSelect('MIN(batch.created_at)', 'first_batch_at')
        .where('batch.partner_id = :partnerId', { partnerId })
        .andWhere("JSON_EXTRACT(batch.reseller_metadata, '$.intended_reseller') IS NOT NULL")
        .groupBy("JSON_UNQUOTE(JSON_EXTRACT(batch.reseller_metadata, '$.intended_reseller'))")
        .addGroupBy('batch.reseller_id')
        .orderBy('total_batches', 'DESC')
        .getRawMany();

      // 2. 获取总数和分页
      const totalCount = resellerAggregation.length;
      const pagedResellers = resellerAggregation.slice(offset, offset + limit);

      // 3. 获取关联的 ota_resellers 详细信息（如果有 reseller_id）
      const resellerIds = pagedResellers
        .map(r => r.reseller_id)
        .filter((id): id is number => id !== null && id !== undefined);

      let resellerDetailsMap = new Map<number, OTAResellerEntity>();
      if (resellerIds.length > 0) {
        const resellerDetails = await resellerRepo.find({
          where: resellerIds.map(id => ({ id }))
        });
        resellerDetailsMap = new Map(resellerDetails.map(r => [r.id, r]));
      }

      // 4. 获取票券状态统计（按 intended_reseller 分组）
      const ticketStats = await ticketRepo
        .createQueryBuilder('ticket')
        .innerJoin(OTATicketBatchEntity, 'batch', 'ticket.batch_id = batch.batch_id')
        .select("JSON_UNQUOTE(JSON_EXTRACT(batch.reseller_metadata, '$.intended_reseller'))", 'reseller_name')
        .addSelect("COUNT(CASE WHEN ticket.status IN ('ACTIVATED', 'RESERVED', 'VERIFIED') THEN 1 END)", 'total_tickets_activated')
        .addSelect("COUNT(CASE WHEN ticket.status = 'VERIFIED' THEN 1 END)", 'total_tickets_used')
        .addSelect("SUM(CASE WHEN ticket.status = 'VERIFIED' THEN COALESCE(ticket.ticket_price, 0) ELSE 0 END)", 'total_revenue')
        .where('batch.partner_id = :partnerId', { partnerId })
        .andWhere("JSON_EXTRACT(batch.reseller_metadata, '$.intended_reseller') IS NOT NULL")
        .groupBy("JSON_UNQUOTE(JSON_EXTRACT(batch.reseller_metadata, '$.intended_reseller'))")
        .getRawMany();

      const ticketStatsMap = new Map(ticketStats.map(s => [s.reseller_name, s]));

      // 5. 获取每个经销商的批次列表
      const resellerNames = pagedResellers.map(r => r.reseller_name);
      const allBatches = await batchRepo
        .createQueryBuilder('batch')
        .where('batch.partner_id = :partnerId', { partnerId })
        .andWhere("JSON_UNQUOTE(JSON_EXTRACT(batch.reseller_metadata, '$.intended_reseller')) IN (:...resellerNames)", { resellerNames: resellerNames.length > 0 ? resellerNames : [''] })
        .orderBy('batch.created_at', 'DESC')
        .getMany();

      const batchesByReseller = new Map<string, OTATicketBatchEntity[]>();
      for (const batch of allBatches) {
        const name = batch.reseller_metadata?.intended_reseller;
        if (name) {
          if (!batchesByReseller.has(name)) {
            batchesByReseller.set(name, []);
          }
          batchesByReseller.get(name)!.push(batch);
        }
      }

      // 6. 组装完整响应
      const resellerSummaries = pagedResellers.map(reseller => {
        const resellerName = reseller.reseller_name;
        const ticketStat = ticketStatsMap.get(resellerName) || {};
        const resellerBatches = batchesByReseller.get(resellerName) || [];
        const resellerDetail = reseller.reseller_id ? resellerDetailsMap.get(reseller.reseller_id) : null;

        const totalGenerated = parseInt(reseller.total_tickets_generated) || 0;
        const totalActivated = parseInt(ticketStat.total_tickets_activated) || 0;
        const totalUsed = parseInt(ticketStat.total_tickets_used) || 0;
        const totalRevenue = parseFloat(ticketStat.total_revenue) || 0;

        // 计算比率（仅保留无法直接从绝对值推导的比率）
        const activationRate = totalGenerated > 0 ? totalActivated / totalGenerated : 0;

        // 佣金率：优先从 ota_resellers 表获取，否则从批次中找最新设置的佣金配置，最后用默认值
        const DEFAULT_COMMISSION_RATE = 0.10; // 默认 10% 佣金
        let commissionRate = resellerDetail?.commission_rate || 0;
        if (!commissionRate) {
          // 从批次中找最新一个有佣金配置的
          for (const batch of resellerBatches) {
            if (batch.reseller_metadata?.commission_config?.rate) {
              commissionRate = batch.reseller_metadata.commission_config.rate;
              break;
            }
          }
        }
        // 如果还是没有，使用默认佣金率
        if (!commissionRate) {
          commissionRate = DEFAULT_COMMISSION_RATE;
        }

        return {
          reseller_id: reseller.reseller_id || null,
          reseller_code: resellerDetail?.reseller_code || null,
          reseller_name: resellerName,
          contact_email: resellerDetail?.contact_email || reseller.contact_email || null,
          contact_phone: resellerDetail?.contact_phone || reseller.contact_phone || null,
          status: resellerDetail?.status || 'active',
          tier: resellerDetail?.tier || null,
          region: resellerDetail?.region || null,
          commission_rate: commissionRate,

          // 统计数据
          statistics: {
            total_batches: parseInt(reseller.total_batches) || 0, // 总批次
            total_tickets_generated: totalGenerated, // 总票券生成
            total_tickets_activated: totalActivated, // 已激活
            total_tickets_used: totalUsed, // 已使用
            activation_rate: Math.round(activationRate * 10000) / 100 // 激活率
          },

          // 收入指标
          revenue_metrics: {
            total_revenue: totalRevenue, // 总收入
            commission_earned: totalRevenue * commissionRate, // 佣金收入
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

      // 聚合统计
      const totalBatches = resellerAggregation.reduce((sum, s) => sum + (parseInt(s.total_batches) || 0), 0);
      const totalTicketsGenerated = resellerAggregation.reduce((sum, s) => sum + (parseInt(s.total_tickets_generated) || 0), 0);

      return {
        resellers: resellerSummaries,
        total: totalCount,
        summary: {
          total_resellers: totalCount,
          active_resellers: totalCount,  // 所有聚合出的经销商都是有数据的
          total_batches: totalBatches,
          total_tickets_generated: totalTicketsGenerated
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
