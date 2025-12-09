import { BaseOTAService } from './base.service';
import { OTATicketBatchEntity } from '../domain/ota-ticket-batch.entity';
import { TicketEntity, OrderEntity } from '../../../models';
import { API_KEYS } from '../../../middlewares/otaAuth';

/**
 * 分析服务
 *
 * 处理 OTA 渠道的各种统计分析
 */
export class AnalyticsService extends BaseOTAService {

  /**
   * 获取批次分析
   */
  async getBatchAnalytics(batchId: string): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const batchRepo = this.getRepository(OTATicketBatchEntity);
      const ticketRepo = this.getRepository(TicketEntity);

      const batch = await batchRepo.findOne({ where: { batch_id: batchId } });
      if (!batch) {
        throw { code: 'BATCH_NOT_FOUND', message: `Batch ${batchId} not found` };
      }

      // 统计票务状态
      const stats = await ticketRepo
        .createQueryBuilder('ticket')
        .select('ticket.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('ticket.batch_id = :batchId', { batchId })
        .groupBy('ticket.status')
        .getRawMany();

      const statusCounts: Record<string, number> = {};
      stats.forEach(s => { statusCounts[s.status] = parseInt(s.count); });

      return {
        batch_id: batchId,
        product_id: batch.product_id,
        total_generated: batch.total_quantity,
        status_breakdown: statusCounts,
        created_at: batch.created_at.toISOString()
      };
    }

    return { batch_id: batchId, total_generated: 0, status_breakdown: {} };
  }

  /**
   * 获取分销商账单汇总
   */
  async getResellerBillingSummary(partnerId: string, reseller: string, period: string): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const repo = await this.getOTARepository();

      if (reseller === 'all') {
        // Aggregate billing summary across all active resellers
        const allResellers = await repo.findResellersByPartner(partnerId);

        if (allResellers.length === 0) {
          return {
            billing_period: period,
            reseller_summaries: []
          };
        }

        // Get billing summary for each reseller
        const reseller_summaries = [];
        for (const resellerEntity of allResellers) {
          const summary = await repo.getResellerBillingSummary(resellerEntity.reseller_name, period);
          if (summary.reseller_summaries && summary.reseller_summaries.length > 0) {
            reseller_summaries.push(...summary.reseller_summaries);
          }
        }

        return {
          billing_period: period,
          reseller_summaries
        };
      } else {
        return await repo.getResellerBillingSummary(reseller, period);
      }
    }

    // Mock implementation
    return {
      billing_period: period,
      reseller_summaries: [
        {
          reseller_name: reseller === 'all' ? 'Mock Reseller' : reseller,
          total_redemptions: 45,
          total_amount_due: 12960,
          batches: [
            {
              batch_id: 'BATCH-20251107-TEST-001',
              redemptions_count: 45,
              wholesale_rate: 288,
              amount_due: 12960
            }
          ]
        }
      ]
    };
  }

  /**
   * 获取批次核销记录
   */
  async getBatchRedemptions(batchId: string): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const ticketRepo = this.getRepository(TicketEntity);

      const tickets = await ticketRepo.find({
        where: { batch_id: batchId, status: 'used' as any },
        order: { updated_at: 'DESC' },
        take: 100
      });

      return {
        batch_id: batchId,
        redemptions: tickets.map(t => ({
          ticket_code: t.ticket_code,
          redeemed_at: t.updated_at?.toISOString(),
          customer_type: t.customer_type
        })),
        total: tickets.length
      };
    }

    return { batch_id: batchId, redemptions: [], total: 0 };
  }

  /**
   * 获取营销活动分析
   */
  async getCampaignAnalytics(partnerId: string, campaignType?: string, dateRange?: string): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const repo = await this.getOTARepository();

      // Use optimized query with stats
      const allBatches = await repo.findBatchesWithStats(partnerId);

      // Filter by campaign_type if specified
      let filteredBatches = allBatches;
      if (campaignType) {
        filteredBatches = allBatches.filter((batch: any) => {
          const type = batch.batch_metadata?.campaign_type || 'standard';
          return type === campaignType;
        });
      }

      // Filter by date_range if provided
      if (dateRange) {
        filteredBatches = filteredBatches.filter((batch: any) => {
          const batchDate = batch.created_at.toISOString().slice(0, 7); // YYYY-MM
          return batchDate === dateRange;
        });
      }

      if (campaignType) {
        // Return single campaign type analytics
        const totalGenerated = filteredBatches.reduce((sum: number, b: any) => sum + (b.tickets_generated ?? 0), 0);
        const totalRedeemed = filteredBatches.reduce((sum: number, b: any) => sum + (b.tickets_redeemed ?? 0), 0);

        return {
          campaign_summaries: [
            {
              campaign_type: campaignType,
              total_batches: filteredBatches.length,
              total_tickets_generated: totalGenerated,
              total_tickets_redeemed: totalRedeemed,
              average_conversion_rate: totalGenerated > 0 ? totalRedeemed / totalGenerated : 0,
              top_performing_resellers: []
            }
          ]
        };
      } else {
        // Return all campaign types aggregated
        const campaignGroups: { [key: string]: any[] } = {};
        filteredBatches.forEach((batch: any) => {
          const type = batch.batch_metadata?.campaign_type || 'standard';
          if (!campaignGroups[type]) {
            campaignGroups[type] = [];
          }
          campaignGroups[type].push(batch);
        });

        // Generate summaries for each campaign type
        const summaries = Object.keys(campaignGroups).map(type => {
          const batches = campaignGroups[type];
          const totalGenerated = batches.reduce((sum: number, b: any) => sum + (b.tickets_generated ?? 0), 0);
          const totalRedeemed = batches.reduce((sum: number, b: any) => sum + (b.tickets_redeemed ?? 0), 0);

          return {
            campaign_type: type,
            total_batches: batches.length,
            total_tickets_generated: totalGenerated,
            total_tickets_redeemed: totalRedeemed,
            average_conversion_rate: totalGenerated > 0 ? totalRedeemed / totalGenerated : 0,
            top_performing_resellers: []
          };
        });

        return { campaign_summaries: summaries };
      }
    }

    // Mock implementation
    return {
      campaign_summaries: [
        {
          campaign_type: campaignType || 'early_bird',
          total_batches: 5,
          total_tickets_generated: 500,
          total_tickets_redeemed: 225,
          average_conversion_rate: 0.45,
          top_performing_resellers: ['Travel Agency ABC', 'Resort Partners Ltd']
        }
      ]
    };
  }

  /**
   * 获取所有合作伙伴
   */
  async getAllPartners(): Promise<any[]> {
    // 从 API_KEYS 配置获取
    return Array.from(API_KEYS.entries()).map(([key, value]) => ({
      id: value.partner_id,
      name: value.partner_name,  // 修复：使用正确的字段名
      permissions: value.permissions
    }));
  }

  /**
   * 获取合作伙伴统计
   */
  async getPartnerStatistics(partnerId: string, period: any): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const orderRepo = this.getRepository(OrderEntity);
      const batchRepo = this.getRepository(OTATicketBatchEntity);

      // 订单统计
      const orderCount = await orderRepo.count({
        where: { channel: partnerId as any }
      });

      // 批次统计
      const batchCount = await batchRepo.count({
        where: { partner_id: partnerId }
      });

      return {
        partner_id: partnerId,
        period,
        orders: { total: orderCount },
        batches: { total: batchCount }
      };
    }

    return { partner_id: partnerId, orders: { total: 0 }, batches: { total: 0 } };
  }
}

// 单例
let instance: AnalyticsService | null = null;

export const getAnalyticsService = (): AnalyticsService => {
  if (!instance) {
    instance = new AnalyticsService();
  }
  return instance;
};

export const analyticsService = new Proxy({} as AnalyticsService, {
  get: (_, prop) => getAnalyticsService()[prop as keyof AnalyticsService]
});
