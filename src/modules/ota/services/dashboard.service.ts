import { BaseOTAService } from './base.service';
import { OrderEntity, TicketEntity, ProductInventoryEntity } from '../../../models';
import { OTATicketBatchEntity } from '../domain/ota-ticket-batch.entity';
import { ChannelReservationEntity } from '../domain/channel-reservation.entity';
import { OTADashboardOptions } from '../types';

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
    const orderRepo = this.getRepository(OrderEntity);
    const ticketRepo = this.getRepository(TicketEntity);
    const batchRepo = this.getRepository(OTATicketBatchEntity);
    const reservationRepo = this.getRepository(ChannelReservationEntity);
    const inventoryRepo = this.getRepository(ProductInventoryEntity);

    // 订单统计
    const orderStats = await orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(order.total)', 'total')
      .groupBy('order.status')
      .getRawMany();

    // 票务统计
    const ticketStats = await ticketRepo
      .createQueryBuilder('ticket')
      .select('ticket.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.status')
      .getRawMany();

    // 批次统计
    const batchCount = await batchRepo.count();

    // 活跃预订数
    const activeReservations = await reservationRepo.count({
      where: { status: 'active' as any }
    });

    // 库存概览
    const inventories = await inventoryRepo.find({ relations: ['product'] });
    const totalInventory = inventories.reduce((sum, inv) => sum + inv.sellable_cap, 0);
    const totalSold = inventories.reduce((sum, inv) => sum + inv.sold_count, 0);
    // 计算总预留数（从所有渠道分配中汇总）
    const totalReserved = inventories.reduce((sum, inv) => {
      const allocations = inv.channel_allocations || {};
      return sum + Object.values(allocations).reduce((s, a) => s + (a.reserved || 0), 0);
    }, 0);

    // 格式化结果
    const ordersByStatus: Record<string, any> = {};
    orderStats.forEach(s => {
      ordersByStatus[s.status] = {
        count: parseInt(s.count),
        total: parseFloat(s.total) || 0
      };
    });

    const ticketsByStatus: Record<string, number> = {};
    ticketStats.forEach(s => {
      ticketsByStatus[s.status] = parseInt(s.count);
    });

    return {
      summary: {
        orders: {
          by_status: ordersByStatus,
          total: orderStats.reduce((sum, s) => sum + parseInt(s.count), 0)
        },
        tickets: {
          by_status: ticketsByStatus,
          total: ticketStats.reduce((sum, s) => sum + parseInt(s.count), 0)
        },
        batches: {
          total: batchCount
        },
        reservations: {
          active: activeReservations
        },
        inventory: {
          total: totalInventory,
          reserved: totalReserved,
          sold: totalSold,
          available: totalInventory - totalReserved - totalSold
        }
      },
      generated_at: new Date().toISOString()
    };
  }

  private async getDashboardFromMock(options: OTADashboardOptions): Promise<any> {
    return {
      summary: {
        orders: { by_status: {}, total: 0 },
        tickets: { by_status: {}, total: 0 },
        batches: { total: 0 },
        reservations: { active: 0 },
        inventory: { total: 0, reserved: 0, sold: 0, available: 0 }
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
