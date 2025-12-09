import { BaseOTAService } from './base.service';
import { OTADashboardOptions } from '../types';
import { API_KEYS } from '../../../middlewares/otaAuth';

/**
 * 仪表板服务
 *
 * 处理 OTA 仪表板的汇总数据
 */
export class DashboardService extends BaseOTAService {

  /**
   * 获取仪表板汇总
   */
  async getDashboardSummary(options: OTADashboardOptions): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      return this.getDashboardFromDatabase(options);
    } else {
      return this.getDashboardFromMock(options);
    }
  }

  private async getDashboardFromDatabase(options: OTADashboardOptions): Promise<any> {
    const repo = await this.getOTARepository();

    // 获取平台汇总统计
    const [platformSummary, topPartnersRaw, inventoryOverview] = await Promise.all([
      repo.getPlatformSummary(options),
      repo.getTopPartners(5, options),
      repo.getInventoryOverview()
    ]);

    // 过滤掉不存在的合作伙伴
    const validPartnerIds = new Set(
      Array.from(API_KEYS.values()).map(data => data.partner_id)
    );

    const topPartners = topPartnersRaw.filter((partner: any) =>
      validPartnerIds.has(partner.partner_id)
    );

    return {
      summary: platformSummary,
      top_partners: topPartners,
      inventory_overview: inventoryOverview,
      generated_at: new Date().toISOString()
    };
  }

  private async getDashboardFromMock(options: OTADashboardOptions): Promise<any> {
    return {
      summary: {
        // 全局总览
        total_orders: 0,
        total_revenue: 0,
        total_tickets: 0,
        pre_generated_tickets: 0,
        activated_tickets: 0,
        verified_tickets: 0,
        // 今日统计
        today: {
          orders: 0,
          revenue: 0,
          created_tickets: 0,
          activated_tickets: 0,
          verified_tickets: 0
        },
        // 时间筛选区间
        filtered: null
      },
      top_partners: [],
      inventory_overview: {
        total_allocated: 0,
        total_reserved: 0,
        total_sold: 0,
        overall_utilization: '0%'
      },
      generated_at: new Date().toISOString()
    };
  }
}

// 单例
let instance: DashboardService | null = null;

export const getDashboardService = (): DashboardService => {
  if (!instance) {
    instance = new DashboardService();
  }
  return instance;
};

export const dashboardService = new Proxy({} as DashboardService, {
  get: (_, prop) => getDashboardService()[prop as keyof DashboardService]
});
