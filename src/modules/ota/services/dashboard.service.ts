import { BaseOTAService } from './base.service';
import { OTADashboardOptions } from '../types';

/**
 * 仪表板服务
 *
 * 处理 OTA 仪表板的汇总数据（按 partner 隔离）
 */
export class DashboardService extends BaseOTAService {

  /**
   * 获取仪表板汇总（按 partner_id 筛选）
   */
  async getDashboardSummary(options: OTADashboardOptions): Promise<any> {
    if (!options.partner_id) {
      throw new Error('partner_id is required');
    }

    if (await this.isDatabaseAvailable()) {
      return this.getDashboardFromDatabase(options);
    } else {
      return this.getDashboardFromMock(options);
    }
  }

  private async getDashboardFromDatabase(options: OTADashboardOptions): Promise<any> {
    const repo = await this.getOTARepository();

    // 获取当前 partner 的汇总统计
    const partnerSummary = await repo.getPartnerSummary({
      partner_id: options.partner_id!,
      start_date: options.start_date,
      end_date: options.end_date
    });

    return {
      partner_id: options.partner_id,
      summary: partnerSummary,
      generated_at: new Date().toISOString()
    };
  }

  private async getDashboardFromMock(options: OTADashboardOptions): Promise<any> {
    return {
      partner_id: options.partner_id,
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
