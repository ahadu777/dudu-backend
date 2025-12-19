/**
 * OTA 状态映射器
 *
 * 内部统一状态 ↔ OTA API 状态
 *
 * 用于确保 OTA API 响应格式不变，保持向后兼容
 */

import { TicketStatus } from '../../models';

/**
 * OTA API 对外暴露的状态（保持不变）
 */
export type OTAAPITicketStatus = 'PRE_GENERATED' | 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

/**
 * 内部状态 → OTA API 状态
 * 用于构建 API 响应
 */
export function toOTAAPIStatus(internalStatus: TicketStatus): OTAAPITicketStatus {
  switch (internalStatus) {
    case 'ACTIVATED':
      return 'ACTIVE';
    case 'VERIFIED':
      return 'USED';
    case 'PRE_GENERATED':
    case 'EXPIRED':
    case 'CANCELLED':
      return internalStatus;
    case 'PENDING_PAYMENT':
    case 'RESERVED':
      // 小程序专用状态，OTA 不应该看到
      // 但如果出现，映射到合理值
      return 'ACTIVE';
    default:
      return internalStatus as OTAAPITicketStatus;
  }
}

/**
 * OTA API 状态 → 内部状态
 * 用于处理 API 请求中的状态过滤
 */
export function fromOTAAPIStatus(apiStatus: OTAAPITicketStatus): TicketStatus {
  switch (apiStatus) {
    case 'ACTIVE':
      return 'ACTIVATED';
    case 'USED':
      return 'VERIFIED';
    case 'PRE_GENERATED':
    case 'EXPIRED':
    case 'CANCELLED':
      return apiStatus;
    default:
      return apiStatus as TicketStatus;
  }
}

/**
 * 映射票券对象的状态字段（用于 API 响应）
 * 保持其他字段不变，只转换 status
 */
export function mapTicketForOTAResponse<T extends { status: string }>(
  ticket: T
): T & { status: OTAAPITicketStatus } {
  return {
    ...ticket,
    status: toOTAAPIStatus(ticket.status as TicketStatus),
  };
}

/**
 * 批量映射票券状态
 */
export function mapTicketsForOTAResponse<T extends { status: string }>(
  tickets: T[]
): Array<T & { status: OTAAPITicketStatus }> {
  return tickets.map(mapTicketForOTAResponse);
}
