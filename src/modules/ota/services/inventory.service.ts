import { In } from 'typeorm';
import { BaseOTAService } from './base.service';
import { ProductInventoryEntity } from '../../../models';
import { mockDataStore } from '../../../core/mock/data';
import { OTAInventoryResponse } from '../types';

/**
 * 库存服务
 *
 * 处理 OTA 渠道的库存查询
 */
export class InventoryService extends BaseOTAService {

  /**
   * 获取库存信息
   */
  async getInventory(productIds?: number[], partnerId?: string): Promise<OTAInventoryResponse> {
    this.log('ota.inventory.requested', { product_ids: productIds, partner_id: partnerId });

    if (await this.isDatabaseAvailable()) {
      return this.getInventoryFromDatabase(productIds, partnerId);
    } else {
      return this.getInventoryFromMock(productIds, partnerId);
    }
  }

  /**
   * 从数据库获取库存
   */
  private async getInventoryFromDatabase(productIds?: number[], partnerId?: string): Promise<OTAInventoryResponse> {
    const inventoryRepo = this.getRepository(ProductInventoryEntity);

    // 查询库存
    let inventories: ProductInventoryEntity[];
    if (productIds && productIds.length > 0) {
      inventories = await inventoryRepo.find({
        where: { product_id: In(productIds) },
        relations: ['product']
      });
    } else {
      inventories = await inventoryRepo.find({
        relations: ['product'],
        where: {
          product: { status: 'active' }
        }
      });
    }

    // 构建响应
    const availability: { [productId: number]: number } = {};
    const pricing_context = {
      base_prices: {} as { [productId: number]: { weekday: number; weekend: number } },
      customer_types: ['adult', 'child', 'elderly'],
      special_dates: {
        '2025-12-31': { multiplier: 1.5 },
        '2026-02-18': { multiplier: 1.3 }
      },
      customer_discounts: {} as { [productId: number]: { [type: string]: number } }
    };
    const product_info: { [productId: number]: { name: string; description: string; category: string } } = {};

    const channelId = partnerId || 'ota';

    for (const inventory of inventories) {
      const available = inventory.getChannelAvailable(channelId);
      const channelAllocation = inventory.getChannelAllocation(channelId);

      if (channelAllocation && channelAllocation.allocated > 0) {
        availability[inventory.product_id] = available;

        if (inventory.product) {
          const basePrice = Number(inventory.product.base_price);
          const weekendPremium = Number(inventory.product.weekend_premium || 30);
          pricing_context.base_prices[inventory.product_id] = {
            weekday: basePrice,
            weekend: basePrice + weekendPremium
          };

          if (inventory.product.customer_discounts) {
            pricing_context.customer_discounts[inventory.product_id] = inventory.product.customer_discounts;
          }

          product_info[inventory.product_id] = {
            name: inventory.product.name,
            description: inventory.product.description,
            category: inventory.product.category
          };
        }
      }
    }

    this.log('ota.inventory.response', {
      source: 'database',
      partner_id: partnerId,
      channel_id: channelId,
      available_products: Object.keys(availability).length,
      total_units: Object.values(availability).reduce((sum, qty) => sum + qty, 0)
    });

    return { available_quantities: availability, pricing_context, product_info };
  }

  /**
   * 从 Mock 数据获取库存
   */
  private async getInventoryFromMock(productIds?: number[], partnerId?: string): Promise<OTAInventoryResponse> {
    this.log('ota.inventory.fallback_to_mock', { reason: 'database_unavailable' });

    const channelId = partnerId || 'ota';
    const mockProducts = productIds || [106, 107, 108];
    const availability = mockDataStore.getChannelAvailability(channelId, mockProducts);

    const pricing_context = {
      base_prices: {} as { [productId: number]: { weekday: number; weekend: number } },
      customer_types: ['adult', 'child', 'elderly'],
      special_dates: {
        '2025-12-31': { multiplier: 1.5 },
        '2026-02-18': { multiplier: 1.3 }
      },
      customer_discounts: {} as { [productId: number]: { [type: string]: number } }
    };
    const product_info: { [productId: number]: { name: string; description: string; category: string } } = {};

    for (const productId of mockProducts) {
      const product = mockDataStore.getProduct(productId);
      if (product && availability[productId] > 0) {
        pricing_context.base_prices[productId] = {
          weekday: product.unit_price,
          weekend: product.unit_price + 30
        };
        product_info[productId] = {
          name: product.name,
          description: product.name,
          category: 'ferry'
        };
      }
    }

    this.log('ota.inventory.response', {
      source: 'mock',
      available_products: Object.keys(availability).length,
      total_units: Object.values(availability).reduce((sum, qty) => sum + qty, 0)
    });

    return { available_quantities: availability, pricing_context, product_info };
  }
}

// 单例导出
let instance: InventoryService | null = null;

export const getInventoryService = (): InventoryService => {
  if (!instance) {
    instance = new InventoryService();
  }
  return instance;
};

export const inventoryService = new Proxy({} as InventoryService, {
  get: (_, prop) => getInventoryService()[prop as keyof InventoryService]
});
