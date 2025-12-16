/**
 * 小程序产品服务
 * 处理产品列表、详情、库存查询
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { ProductEntity, ProductInventoryEntity } from '../../models';
import { mockDataStore } from '../../core/mock/data';
import { dataSourceConfig } from '../../config/data-source';
import { logger } from '../../utils/logger';
import { MiniprogramOrderService } from './order.service';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductListItem {
  id: number;
  sku?: string;
  name: string;
  description: string;
  base_price: number;
  image_url?: string;
  functions: {
    function_code: string;
    label: string;
    quantity: number;
  }[];
  availability: {
    available: number;
    allocated: number;
    status: StockStatus;
  };
  status: string;
}

export interface ProductDetail extends ProductListItem {
  category?: string;
  weekend_premium?: number;
  customer_discounts?: Record<string, number>;
  availability: {
    channel: string;
    available: number;
    allocated: number;
    reserved: number;
    sold: number;
    status: StockStatus;
  };
  images?: string[];
  terms_and_conditions?: string | null;
}

export interface AvailabilityInfo {
  product_id: number;
  channel: string;
  available: number;
  allocated: number;
  reserved: number;
  sold: number;
  is_available: boolean;
  requested_quantity: number;
  status: StockStatus;
  last_updated: string;
}

export class MiniprogramProductService {
  private productRepo: Repository<ProductEntity>;
  private inventoryRepo: Repository<ProductInventoryEntity>;
  private orderService: MiniprogramOrderService;

  constructor() {
    this.productRepo = AppDataSource.getRepository(ProductEntity);
    this.inventoryRepo = AppDataSource.getRepository(ProductInventoryEntity);
    this.orderService = new MiniprogramOrderService();
  }

  /**
   * 判断是否使用数据库
   */
  private get useDatabase(): boolean {
    return dataSourceConfig.useDatabase && AppDataSource.isInitialized;
  }

  /**
   * 计算库存状态
   */
  private calculateStockStatus(available: number): StockStatus {
    if (available > 10) return 'in_stock';
    if (available > 0) return 'low_stock';
    return 'out_of_stock';
  }

  /**
   * 获取产品列表
   */
  async getProductList(options: { category?: string; offset: number; limit: number }): Promise<{ products: ProductListItem[]; total: number }> {
    let allProducts: any[];

    if (this.useDatabase) {
      const dbProducts = await this.productRepo.createQueryBuilder('product')
        .leftJoinAndSelect('product.inventory', 'inventory')
        .where('product.status = :status', { status: 'active' })
        .getMany();

      allProducts = dbProducts.map(p => {
        const inventory = p.inventory && p.inventory.length > 0 ? p.inventory[0] : null;
        const functions = p.entitlements ? p.entitlements.map((e: any) => ({
          function_code: e.type,
          function_name: e.description,
          max_uses: e.quantity || 1
        })) : [];

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          unit_price: Number(p.base_price),
          image_url: p.image_url,
          functions,
          channel_allocations: inventory ? inventory.channel_allocations : {}
        };
      });
    } else {
      allProducts = mockDataStore.getActiveProducts();
    }

    // 过滤：只显示有 direct channel 配置的商品（不再过滤库存为0的商品）
    const filteredProducts = allProducts.filter(product => {
      const directAllocation = product.channel_allocations['direct'];
      return !!directAllocation;
    });

    // 转换为 API 响应格式
    const products: ProductListItem[] = filteredProducts.map(product => {
      const directAllocation = product.channel_allocations['direct'];
      const available = Math.max(0, directAllocation.allocated - directAllocation.reserved - directAllocation.sold);

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        base_price: product.unit_price,
        image_url: product.image_url,
        functions: product.functions.map((f: any) => ({
          function_code: f.function_code,
          label: f.function_name,
          quantity: f.max_uses
        })),
        availability: {
          available,
          allocated: directAllocation.allocated,
          status: this.calculateStockStatus(available)
        },
        status: product.active !== false ? 'active' : 'inactive'
      };
    });

    const total = products.length;
    const paginatedProducts = products.slice(options.offset, options.offset + options.limit);

    return { products: paginatedProducts, total };
  }

  /**
   * 获取产品详情
   */
  async getProductDetail(productId: number): Promise<ProductDetail | null> {
    if (this.useDatabase) {
      const dbProduct = await this.productRepo.createQueryBuilder('product')
        .leftJoinAndSelect('product.inventory', 'inventory')
        .where('product.id = :id', { id: productId })
        .andWhere('product.status = :status', { status: 'active' })
        .getOne();

      if (!dbProduct) return null;

      const inventory = dbProduct.inventory && dbProduct.inventory.length > 0 ? dbProduct.inventory[0] : null;
      const directAllocation = inventory?.channel_allocations?.['direct'];

      if (!directAllocation) return null;

      const available = Math.max(0, directAllocation.allocated - directAllocation.reserved - directAllocation.sold);

      const functions = dbProduct.entitlements ? dbProduct.entitlements.map((e: any) => ({
        function_code: e.type,
        label: e.description,
        quantity: e.quantity || 1
      })) : [];

      return {
        id: dbProduct.id,
        name: dbProduct.name,
        description: dbProduct.description,
        category: dbProduct.category,
        base_price: Number(dbProduct.base_price),
        image_url: dbProduct.image_url,
        weekend_premium: dbProduct.weekend_premium ? Number(dbProduct.weekend_premium) : undefined,
        customer_discounts: dbProduct.customer_discounts,
        functions,
        availability: {
          channel: 'direct',
          available,
          allocated: directAllocation.allocated,
          reserved: directAllocation.reserved,
          sold: directAllocation.sold,
          status: this.calculateStockStatus(available)
        },
        status: dbProduct.status,
        images: dbProduct.image_url ? [dbProduct.image_url] : [],
        terms_and_conditions: null
      };
    } else {
      const mockProduct = mockDataStore.getProduct(productId);

      if (!mockProduct || !mockProduct.active) return null;

      const directAllocation = mockProduct.channel_allocations['direct'];
      if (!directAllocation) return null;

      const available = Math.max(0, directAllocation.allocated - directAllocation.reserved - directAllocation.sold);

      return {
        id: mockProduct.id,
        sku: mockProduct.sku,
        name: mockProduct.name,
        description: mockProduct.description,
        base_price: mockProduct.unit_price,
        functions: mockProduct.functions.map((f: any) => ({
          function_code: f.function_code,
          label: f.function_name,
          quantity: f.max_uses
        })),
        availability: {
          channel: 'direct',
          available,
          allocated: directAllocation.allocated,
          reserved: directAllocation.reserved,
          sold: directAllocation.sold,
          status: this.calculateStockStatus(available)
        },
        status: mockProduct.active ? 'active' : 'inactive'
      };
    }
  }

  /**
   * 查询库存
   * 同时会清理该产品的超时订单，释放被占用的库存
   */
  async checkAvailability(productId: number, quantity: number = 1): Promise<AvailabilityInfo | null> {
    // 懒惰清理：查询库存前先清理该产品的超时订单
    if (this.useDatabase) {
      try {
        await this.orderService.cleanupExpiredOrdersForProduct(productId);
      } catch (error) {
        // 清理失败不影响库存查询，仅记录日志
        logger.warn('miniprogram.cleanup.failed', {
          product_id: productId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    let directAllocation: any = null;

    if (this.useDatabase) {
      const inventory = await this.inventoryRepo.findOne({
        where: { product_id: productId },
        relations: ['product']
      });

      if (!inventory || !inventory.product) return null;

      directAllocation = inventory.channel_allocations?.['direct'];
    } else {
      const mockProduct = mockDataStore.getProduct(productId);
      if (!mockProduct) return null;

      directAllocation = mockProduct.channel_allocations['direct'];
    }

    if (!directAllocation) return null;

    const available = directAllocation.allocated - directAllocation.reserved - directAllocation.sold;

    return {
      product_id: productId,
      channel: 'direct',
      available,
      allocated: directAllocation.allocated,
      reserved: directAllocation.reserved,
      sold: directAllocation.sold,
      is_available: available >= quantity,
      requested_quantity: quantity,
      status: this.calculateStockStatus(available),
      last_updated: new Date().toISOString()
    };
  }
}
