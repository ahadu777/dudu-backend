import { BaseOTAService } from './base.service';
import { ProductEntity } from '../../../models';

// 统一默认 QR 配置
const DEFAULT_QR_CONFIG = {
  dark_color: '#CC0000',   // 品牌红色
  light_color: '#FFFFFF',
  logo_url: null,
  error_correction: 'M'
};

/**
 * QR 配置服务
 *
 * 处理产品 QR 码配置
 */
export class QRConfigService extends BaseOTAService {

  /**
   * 获取产品 QR 配置
   */
  async getProductQRConfig(productId: number): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const productRepo = this.getRepository(ProductEntity);
      const product = await productRepo.findOne({ where: { id: productId } });

      if (!product) {
        throw { code: 'PRODUCT_NOT_FOUND', message: `Product ${productId} not found` };
      }

      return {
        product_id: product.id,
        product_name: product.name,
        qr_config: {
          ...DEFAULT_QR_CONFIG,
          ...product.qr_config
        }
      };
    }

    // Mock
    return {
      product_id: productId,
      product_name: 'Mock Product',
      qr_config: { ...DEFAULT_QR_CONFIG }
    };
  }

  /**
   * 更新产品 QR 配置
   */
  async updateProductQRConfig(productId: number, config: any): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      const productRepo = this.getRepository(ProductEntity);
      const product = await productRepo.findOne({ where: { id: productId } });

      if (!product) {
        throw { code: 'PRODUCT_NOT_FOUND', message: `Product ${productId} not found` };
      }

      // 合并配置
      product.qr_config = {
        ...product.qr_config,
        ...config
      };

      await productRepo.save(product);

      this.log('ota.qr_config.updated', {
        product_id: productId,
        config: product.qr_config
      });

      return {
        product_id: product.id,
        product_name: product.name,
        qr_config: product.qr_config
      };
    }

    throw { code: 'DATABASE_ERROR', message: 'Database not available' };
  }

  /**
   * 获取所有产品 QR 配置
   */
  async getAllProductQRConfigs(): Promise<any[]> {
    if (await this.isDatabaseAvailable()) {
      const productRepo = this.getRepository(ProductEntity);
      const products = await productRepo.find({
        where: { status: 'active' },
        select: ['id', 'name', 'category', 'qr_config']
      });

      return products.map(p => ({
        product_id: p.id,
        product_name: p.name,
        category: p.category,
        qr_config: {
          ...DEFAULT_QR_CONFIG,
          ...p.qr_config
        }
      }));
    }

    // Mock
    return [
      {
        product_id: 1,
        product_name: 'Day Pass',
        category: 'ticket',
        qr_config: { ...DEFAULT_QR_CONFIG }
      }
    ];
  }
}

// 单例
let instance: QRConfigService | null = null;

export const getQRConfigService = (): QRConfigService => {
  if (!instance) {
    instance = new QRConfigService();
  }
  return instance;
};

export const qrConfigService = new Proxy({} as QRConfigService, {
  get: (_, prop) => getQRConfigService()[prop as keyof QRConfigService]
});
