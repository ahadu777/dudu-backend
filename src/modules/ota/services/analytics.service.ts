import { BaseOTAService } from './base.service';
import { OTATicketBatchEntity } from '../domain/ota-ticket-batch.entity';
import { TicketEntity } from '../../../models';
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

      // 计算各状态数量
      const tickets_generated = batch.total_quantity;
      const tickets_activated = (statusCounts['ACTIVATED'] || 0) + (statusCounts['RESERVED'] || 0) + (statusCounts['VERIFIED'] || 0);
      const tickets_redeemed = statusCounts['VERIFIED'] || 0;

      // 获取价格信息
      const basePrice = batch.pricing_snapshot?.base_price || 0;

      return {
        batch_id: batchId,
        product_id: batch.product_id,
        reseller_name: batch.reseller_metadata?.intended_reseller || 'Direct Sale',
        campaign_type: batch.batch_metadata?.campaign_type || 'standard',
        campaign_name: batch.batch_metadata?.campaign_name || 'Standard Batch',
        generated_at: batch.created_at.toISOString(),
        tickets_generated,
        tickets_activated,
        tickets_redeemed,
        status_breakdown: statusCounts,
        conversion_rates: {
          activation_rate: tickets_generated > 0 ? tickets_activated / tickets_generated : 0,
          redemption_rate: tickets_activated > 0 ? tickets_redeemed / tickets_activated : 0,
          overall_utilization: tickets_generated > 0 ? tickets_redeemed / tickets_generated : 0
        },
        revenue_metrics: {
          potential_revenue: tickets_generated * basePrice,
          realized_revenue: tickets_redeemed * basePrice,
          realization_rate: tickets_generated > 0 ? tickets_redeemed / tickets_generated : 0
        },
        wholesale_rate: basePrice,
        amount_due: (tickets_redeemed * basePrice).toFixed(2),
        batch_metadata: batch.batch_metadata || {},
        created_at: batch.created_at.toISOString()
      };
    }

    return {
      batch_id: batchId,
      tickets_generated: 0,
      tickets_activated: 0,
      tickets_redeemed: 0,
      status_breakdown: {},
      conversion_rates: { activation_rate: 0, redemption_rate: 0, overall_utilization: 0 },
      revenue_metrics: { potential_revenue: 0, realized_revenue: 0, realization_rate: 0 }
    };
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
   * 返回数组，由 router 层包装响应格式
   */
  async getBatchRedemptions(batchId: string): Promise<any[]> {
    if (await this.isDatabaseAvailable()) {
      const repo = await this.getOTARepository();
      const redemptions = await repo.getBatchRedemptions(batchId);

      return redemptions.map((r: any) => ({
        ticket_code: r.ticket_code,
        function_code: r.function_code,
        redeemed_at: r.redeemed_at,
        venue_name: r.venue_name,
        wholesale_price: r.wholesale_price,
        customer_type: r.customer_type
      }));
    }

    return [];
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
    return Array.from(API_KEYS.entries()).map(([_, value]) => ({
      id: value.partner_id,
      name: value.partner_name,
      permissions: value.permissions
    }));
  }

  /**
   * 获取合作伙伴统计
   */
  async getPartnerStatistics(partnerId: string, dateRange?: { start_date?: string; end_date?: string }): Promise<any> {
    // 查找合作伙伴信息
    const partnerEntry = Array.from(API_KEYS.entries()).find(([_, data]) => data.partner_id === partnerId);
    if (!partnerEntry) {
      throw {
        code: 'VALIDATION_ERROR',
        message: `Partner ${partnerId} not found`
      };
    }

    const [, partnerData] = partnerEntry;

    if (await this.isDatabaseAvailable()) {
      const repo = await this.getOTARepository();

      // 获取聚合统计
      const [ordersSummary, ticketsSummary, inventoryUsage] = await Promise.all([
        repo.getPartnerOrdersSummary(partnerId, dateRange),
        repo.getPartnerTicketsSummary(partnerId),
        repo.getPartnerInventoryUsage(partnerId)
      ]);

      return {
        partner_id: partnerId,
        partner_name: partnerData.partner_name,
        date_range: dateRange || { start_date: null, end_date: null },
        orders: ordersSummary,
        tickets: ticketsSummary,
        inventory_usage: inventoryUsage
      };
    }

    // Mock 模式返回空统计
    return {
      partner_id: partnerId,
      partner_name: partnerData.partner_name,
      date_range: dateRange || { start_date: null, end_date: null },
      orders: {
        total_count: 0,
        total_revenue: 0,
        avg_order_value: 0,
        by_status: {}
      },
      reservations: {
        total_count: 0,
        total_quantity: 0,
        by_status: {}
      },
      tickets: {
        total_generated: 0,
        by_status: {}
      },
      inventory_usage: {}
    };
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
