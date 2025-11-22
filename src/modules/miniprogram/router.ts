import { Router } from 'express';
import { mockDataStore } from '../../core/mock/data';
import { logger } from '../../utils/logger';
import { AppDataSource } from '../../config/database';
import { ProductEntity } from '../ota/domain/product.entity';
import { ProductInventoryEntity } from '../ota/domain/product-inventory.entity';
import { dataSourceConfig } from '../../config/data-source';
import { paginationMiddleware, formatPaginatedResponse } from '../../middlewares/pagination';

const router = Router();

/**
 * GET /miniprogram/products
 * 获取小程序商品列表（仅展示 direct channel 有库存的商品）
 */
router.get('/products', paginationMiddleware({ defaultLimit: 20, maxLimit: 100 }), async (req, res) => {
  const startTime = Date.now();

  try {
    // 获取查询参数
    const category = req.query.category as string | undefined;
    const { page, limit, offset } = req.pagination;

    // Check if database is available
    const useDatabase = dataSourceConfig.useDatabase && AppDataSource.isInitialized;

    let allProducts: any[];

    if (useDatabase) {
      // Database mode: Get products with inventory from database
      const productRepo = AppDataSource.getRepository(ProductEntity);
      const inventoryRepo = AppDataSource.getRepository(ProductInventoryEntity);

      const dbProducts = await productRepo.createQueryBuilder('product')
        .leftJoinAndSelect('product.inventory', 'inventory')
        .where('product.status = :status', { status: 'active' })
        .getMany();

      // Transform database products to common format
      allProducts = dbProducts.map(p => {
        const inventory = p.inventory && p.inventory.length > 0 ? p.inventory[0] : null;

        // Convert entitlements to functions format
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
          base_price: Number(p.base_price),
          active: p.status === 'active',
          functions: functions,
          channel_allocations: inventory ? inventory.channel_allocations : {}
        };
      });
    } else {
      // Mock mode: Get products from mockDataStore
      allProducts = mockDataStore.getActiveProducts();
    }

    // 过滤：只显示 direct channel 有库存的商品
    let filteredProducts = allProducts.filter(product => {
      const directAllocation = product.channel_allocations['direct'];
      if (!directAllocation) return false;

      // 计算可售数量 = allocated - reserved - sold
      const available = directAllocation.allocated - directAllocation.reserved - directAllocation.sold;
      return available > 0;
    });

    // 分类过滤（如果提供）
    if (category) {
      // 暂时跳过分类过滤，因为 mock data 中没有 category 字段
      // 可以在后续根据实际需求添加
    }

    // 转换为 API 响应格式
    const products = filteredProducts.map(product => {
      const directAllocation = product.channel_allocations['direct'];
      const available = directAllocation.allocated - directAllocation.reserved - directAllocation.sold;

      // 计算库存状态
      let status: 'in_stock' | 'low_stock' | 'out_of_stock';
      if (available > 10) {
        status = 'in_stock';
      } else if (available > 0 && available <= 10) {
        status = 'low_stock';
      } else {
        status = 'out_of_stock';
      }

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        base_price: product.unit_price,
        functions: product.functions.map((f: any) => ({
          function_code: f.function_code,
          label: f.function_name,
          quantity: f.max_uses
        })),
        availability: {
          available: available,
          allocated: directAllocation.allocated,
          status: status
        },
        status: product.active ? 'active' : 'inactive'
      };
    });

    // 分页 - 使用 offset (由中间件自动计算)
    const total = products.length;
    const paginatedProducts = products.slice(offset!, offset! + limit);

    // 使用标准的分页响应格式
    const response = formatPaginatedResponse(paginatedProducts, total, req.pagination);

    // 将 items 重命名为 products 以匹配 API 规范
    const apiResponse = {
      total: response.total,
      page: response.page,
      page_size: response.page_size,
      products: response.items
    };

    // 记录日志
    logger.info('miniprogram.products.list', {
      total: apiResponse.total,
      page: apiResponse.page,
      page_size: apiResponse.page_size,
      returned: apiResponse.products.length
    });

    // 记录响应时间
    const latency = Date.now() - startTime;
    logger.info('miniprogram.products.list.latency', { latency_ms: latency });

    res.status(200).json(apiResponse);

  } catch (error) {
    logger.error('miniprogram.products.list.error', { error: String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch products'
    });
  }
});

/**
 * GET /miniprogram/products/:id
 * 获取商品详情
 */
router.get('/products/:id', async (req, res) => {
  const startTime = Date.now();

  try {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({
        code: 'INVALID_PRODUCT_ID',
        message: 'Product ID must be a valid number'
      });
    }

    // Check if database is available
    const useDatabase = dataSourceConfig.useDatabase && AppDataSource.isInitialized;

    let product: any = null;

    if (useDatabase) {
      // Database mode
      const productRepo = AppDataSource.getRepository(ProductEntity);
      const inventoryRepo = AppDataSource.getRepository(ProductInventoryEntity);

      const dbProduct = await productRepo.createQueryBuilder('product')
        .leftJoinAndSelect('product.inventory', 'inventory')
        .where('product.id = :id', { id: productId })
        .andWhere('product.status = :status', { status: 'active' })
        .getOne();

      if (!dbProduct) {
        logger.info('miniprogram.product.not_found', { product_id: productId });
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Product not found or not available for mini-program'
        });
      }

      const inventory = dbProduct.inventory && dbProduct.inventory.length > 0 ? dbProduct.inventory[0] : null;
      const directAllocation = inventory?.channel_allocations?.['direct'];

      if (!directAllocation) {
        logger.info('miniprogram.product.no_direct_channel', { product_id: productId });
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Product not available for mini-program'
        });
      }

      // Calculate availability
      const available = directAllocation.allocated - directAllocation.reserved - directAllocation.sold;

      if (available <= 0) {
        logger.info('miniprogram.product.out_of_stock', { product_id: productId });
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Product is out of stock'
        });
      }

      // Convert entitlements to functions format
      const functions = dbProduct.entitlements ? dbProduct.entitlements.map((e: any) => ({
        function_code: e.type,
        label: e.description,
        quantity: e.quantity || 1
      })) : [];

      // Calculate status
      let status: 'in_stock' | 'low_stock' | 'out_of_stock';
      if (available > 10) {
        status = 'in_stock';
      } else if (available > 0 && available <= 10) {
        status = 'low_stock';
      } else {
        status = 'out_of_stock';
      }

      product = {
        id: dbProduct.id,
        name: dbProduct.name,
        description: dbProduct.description,
        category: dbProduct.category,
        base_price: Number(dbProduct.base_price),
        weekend_premium: dbProduct.weekend_premium ? Number(dbProduct.weekend_premium) : undefined,
        customer_discounts: dbProduct.customer_discounts,
        functions: functions,
        availability: {
          channel: 'direct',
          available: available,
          allocated: directAllocation.allocated,
          reserved: directAllocation.reserved,
          sold: directAllocation.sold,
          status: status
        },
        status: dbProduct.status,
        images: [], // Placeholder for future implementation
        terms_and_conditions: null // Placeholder for future implementation
      };
    } else {
      // Mock mode
      const mockProduct = mockDataStore.getProduct(productId);

      if (!mockProduct) {
        logger.info('miniprogram.product.not_found', { product_id: productId });
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Product not found'
        });
      }

      if (!mockProduct.active) {
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Product is not active'
        });
      }

      const directAllocation = mockProduct.channel_allocations['direct'];
      if (!directAllocation) {
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Product not available for mini-program'
        });
      }

      const available = directAllocation.allocated - directAllocation.reserved - directAllocation.sold;

      if (available <= 0) {
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Product is out of stock'
        });
      }

      let status: 'in_stock' | 'low_stock' | 'out_of_stock';
      if (available > 10) {
        status = 'in_stock';
      } else if (available > 0 && available <= 10) {
        status = 'low_stock';
      } else {
        status = 'out_of_stock';
      }

      product = {
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
          available: available,
          allocated: directAllocation.allocated,
          reserved: directAllocation.reserved,
          sold: directAllocation.sold,
          status: status
        },
        status: mockProduct.active ? 'active' : 'inactive'
      };
    }

    logger.info('miniprogram.product.detail', {
      product_id: productId,
      name: product.name
    });

    const latency = Date.now() - startTime;
    logger.info('miniprogram.product.detail.latency', { latency_ms: latency });

    res.status(200).json(product);

  } catch (error) {
    logger.error('miniprogram.product.detail.error', { error: String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch product detail'
    });
  }
});

/**
 * GET /miniprogram/products/:id/availability
 * 实时查询商品库存
 */
router.get('/products/:id/availability', async (req, res) => {
  const startTime = Date.now();

  try {
    const productId = parseInt(req.params.id);
    const quantity = parseInt(req.query.quantity as string) || 1;

    if (isNaN(productId)) {
      return res.status(400).json({
        code: 'INVALID_PRODUCT_ID',
        message: 'Product ID must be a valid number'
      });
    }

    // Check if database is available
    const useDatabase = dataSourceConfig.useDatabase && AppDataSource.isInitialized;

    let availabilityData: any = null;

    if (useDatabase) {
      // Database mode
      const inventoryRepo = AppDataSource.getRepository(ProductInventoryEntity);

      const inventory = await inventoryRepo.findOne({
        where: { product_id: productId },
        relations: ['product']
      });

      if (!inventory || !inventory.product) {
        logger.info('miniprogram.availability.not_found', { product_id: productId });
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Product not found'
        });
      }

      const directAllocation = inventory.channel_allocations?.['direct'];

      if (!directAllocation) {
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Product not available for mini-program'
        });
      }

      const available = directAllocation.allocated - directAllocation.reserved - directAllocation.sold;
      const isAvailable = available >= quantity;

      let status: 'in_stock' | 'low_stock' | 'out_of_stock';
      if (available > 10) {
        status = 'in_stock';
      } else if (available > 0 && available <= 10) {
        status = 'low_stock';
      } else {
        status = 'out_of_stock';
      }

      availabilityData = {
        product_id: productId,
        channel: 'direct',
        available: available,
        allocated: directAllocation.allocated,
        reserved: directAllocation.reserved,
        sold: directAllocation.sold,
        is_available: isAvailable,
        requested_quantity: quantity,
        status: status,
        last_updated: new Date().toISOString()
      };
    } else {
      // Mock mode
      const mockProduct = mockDataStore.getProduct(productId);

      if (!mockProduct) {
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Product not found'
        });
      }

      const directAllocation = mockProduct.channel_allocations['direct'];

      if (!directAllocation) {
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Product not available for mini-program'
        });
      }

      const available = directAllocation.allocated - directAllocation.reserved - directAllocation.sold;
      const isAvailable = available >= quantity;

      let status: 'in_stock' | 'low_stock' | 'out_of_stock';
      if (available > 10) {
        status = 'in_stock';
      } else if (available > 0 && available <= 10) {
        status = 'low_stock';
      } else {
        status = 'out_of_stock';
      }

      availabilityData = {
        product_id: productId,
        channel: 'direct',
        available: available,
        allocated: directAllocation.allocated,
        reserved: directAllocation.reserved,
        sold: directAllocation.sold,
        is_available: isAvailable,
        requested_quantity: quantity,
        status: status,
        last_updated: new Date().toISOString()
      };
    }

    logger.info('miniprogram.availability.check', {
      product_id: productId,
      requested_quantity: quantity,
      available: availabilityData.available,
      is_available: availabilityData.is_available
    });

    const latency = Date.now() - startTime;
    logger.info('miniprogram.availability.latency', { latency_ms: latency });

    res.status(200).json(availabilityData);

  } catch (error) {
    logger.error('miniprogram.availability.error', { error: String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to check availability'
    });
  }
});

export default router;
