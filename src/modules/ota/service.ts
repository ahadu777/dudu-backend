/**
 * OTA Service Facade
 *
 * 这个文件是重构后的 Facade，保持与原 service.ts 100% API 兼容。
 * 所有方法委托给各个专门的子服务。
 *
 * 重构完成后，将此文件重命名为 service.ts
 */

import { logger } from '../../utils/logger';

// 类型导出（保持向后兼容）
export * from './types';

// 导入子服务
import { InventoryService } from './services/inventory.service';
import { ReservationService } from './services/reservation.service';
import { TicketService } from './services/ticket.service';
import { OrderService } from './services/order.service';
import { ResellerService } from './services/reseller.service';
import { AnalyticsService } from './services/analytics.service';
import { DashboardService } from './services/dashboard.service';
import { QRConfigService } from './services/qr-config.service';

// 类型导入
import {
  OTAInventoryResponse,
  OTAReserveRequest,
  OTAReserveResponse,
  OTAActivateRequest,
  OTAActivateResponse,
  OTABulkGenerateRequest,
  OTABulkGenerateResponse,
  OTATicketActivateRequest,
  OTATicketActivateResponse,
  OTATicketFilters,
  OTATicketListResponse,
  OTADashboardOptions
} from './types';

/**
 * OTA Service Facade
 *
 * 保持原有 API 不变，内部委托给各个子服务
 */
export class OTAService {
  private inventoryService: InventoryService;
  private reservationService: ReservationService;
  private ticketService: TicketService;
  private orderService: OrderService;
  private resellerService: ResellerService;
  private analyticsService: AnalyticsService;
  private dashboardService: DashboardService;
  private qrConfigService: QRConfigService;

  constructor() {
    this.inventoryService = new InventoryService();
    this.reservationService = new ReservationService();
    this.ticketService = new TicketService();
    this.orderService = new OrderService();
    this.resellerService = new ResellerService();
    this.analyticsService = new AnalyticsService();
    this.dashboardService = new DashboardService();
    this.qrConfigService = new QRConfigService();
  }

  // ============== 库存 ==============

  async getInventory(productIds?: number[], partnerId?: string): Promise<OTAInventoryResponse> {
    return this.inventoryService.getInventory(productIds, partnerId);
  }

  // ============== 预订 ==============

  async createReservation(request: OTAReserveRequest, partnerId?: string): Promise<OTAReserveResponse> {
    return this.reservationService.createReservation(request, partnerId);
  }

  async getReservation(reservationId: string) {
    return this.reservationService.getReservation(reservationId);
  }

  async getActiveReservations(partnerId?: string) {
    return this.reservationService.getActiveReservations(partnerId);
  }

  async activateReservation(reservationId: string, request: OTAActivateRequest): Promise<OTAActivateResponse> {
    return this.reservationService.activateReservation(reservationId, request);
  }

  async cancelReservation(reservationId: string): Promise<void> {
    return this.reservationService.cancelReservation(reservationId);
  }

  async expireOldReservations(): Promise<number> {
    return this.reservationService.expireOldReservations();
  }

  // ============== 票务 ==============

  async bulkGenerateTickets(partnerId: string, request: OTABulkGenerateRequest): Promise<OTABulkGenerateResponse> {
    return this.ticketService.bulkGenerateTickets(partnerId, request);
  }

  async activatePreMadeTicket(
    ticketCode: string,
    partnerId: string,
    request: OTATicketActivateRequest
  ): Promise<OTATicketActivateResponse> {
    return this.ticketService.activatePreMadeTicket(ticketCode, partnerId, request);
  }

  async getTickets(partnerId: string, filters: OTATicketFilters): Promise<OTATicketListResponse> {
    return this.ticketService.getTickets(partnerId, filters);
  }

  // ============== 订单 ==============

  async getOrders(partnerId?: string): Promise<any[]> {
    return this.orderService.getOrders(partnerId);
  }

  async getOrderTickets(orderId: string): Promise<any[]> {
    return this.orderService.getOrderTickets(orderId);
  }

  // ============== 分销商 ==============

  async listResellers(partnerId: string) {
    return this.resellerService.listResellers(partnerId);
  }

  async getResellerById(resellerId: number, partnerId: string) {
    return this.resellerService.getResellerById(resellerId, partnerId);
  }

  async createReseller(partnerId: string, data: any) {
    return this.resellerService.createReseller(partnerId, data);
  }

  async updateReseller(resellerId: number, partnerId: string, data: any) {
    return this.resellerService.updateReseller(resellerId, partnerId, data);
  }

  async deactivateReseller(resellerId: number, partnerId: string) {
    return this.resellerService.deactivateReseller(resellerId, partnerId);
  }

  async getResellersSummary(partnerId: string, filters: any) {
    return this.resellerService.getResellersSummary(partnerId, filters);
  }

  // ============== 分析 ==============

  async getBatchAnalytics(batchId: string) {
    return this.analyticsService.getBatchAnalytics(batchId);
  }

  async getResellerBillingSummary(partnerId: string, reseller: string, period: string) {
    return this.analyticsService.getResellerBillingSummary(partnerId, reseller, period);
  }

  async getBatchRedemptions(batchId: string) {
    return this.analyticsService.getBatchRedemptions(batchId);
  }

  async getCampaignAnalytics(partnerId: string, campaignType?: string, dateRange?: string) {
    return this.analyticsService.getCampaignAnalytics(partnerId, campaignType, dateRange);
  }

  async getAllPartners() {
    return this.analyticsService.getAllPartners();
  }

  async getPartnerStatistics(partnerId: string, period: any) {
    return this.analyticsService.getPartnerStatistics(partnerId, period);
  }

  // ============== 仪表板 ==============

  async getDashboardSummary(options: OTADashboardOptions) {
    return this.dashboardService.getDashboardSummary(options);
  }

  // ============== QR 配置 ==============

  async getProductQRConfig(productId: number) {
    return this.qrConfigService.getProductQRConfig(productId);
  }

  async updateProductQRConfig(productId: number, config: any) {
    return this.qrConfigService.updateProductQRConfig(productId, config);
  }

  async getAllProductQRConfigs() {
    return this.qrConfigService.getAllProductQRConfigs();
  }
}

// ============== 单例导出（保持向后兼容）==============

let instance: OTAService | null = null;

const getOTAService = (): OTAService => {
  if (!instance) {
    instance = new OTAService();
  }
  return instance;
};

// 使用 Proxy 延迟初始化，保持与原导出完全兼容
export const otaService = new Proxy({} as OTAService, {
  get: (_, prop) => {
    const service = getOTAService();
    const value = service[prop as keyof OTAService];
    // 如果是方法，绑定 this
    if (typeof value === 'function') {
      return value.bind(service);
    }
    return value;
  }
});

// ============== 定时任务（保持原有行为）==============

setInterval(() => {
  getOTAService().expireOldReservations().catch(error => {
    logger.error('Failed to expire reservations', error);
  });
}, 5 * 60 * 1000); // Every 5 minutes
