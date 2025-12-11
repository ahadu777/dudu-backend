/**
 * Wallyt API 客户端
 * 封装与 Wallyt 支付平台的所有 API 交互
 */

import axios, { AxiosInstance } from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import {
  generateSign,
  verifySign,
  generateNonceStr,
  formatWallytTime,
  SignType
} from './wallyt-signature.util';
import { objectToXml, xmlToObject } from './xml.util';
import type {
  WallytConfig,
  WallytJSPayRequest,
  WallytJSPayResponse,
  WallytQueryRequest,
  WallytQueryResponse,
  WallytRefundRequest,
  WallytRefundResponse,
  WallytCloseRequest,
  WallytCloseResponse,
  MiniProgramPayParams
} from './wallyt.types';

/**
 * Wallyt API 错误
 */
export class WallytError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: string,
    public resultCode?: string
  ) {
    super(message);
    this.name = 'WallytError';
  }
}

/**
 * Wallyt API 客户端
 */
export class WallytClient {
  private config: WallytConfig;
  private httpClient: AxiosInstance;

  constructor(config: WallytConfig) {
    this.config = config;
    this.httpClient = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/xml'
      }
    });
  }

  /**
   * 创建小程序预支付订单
   *
   * @param params - 订单参数
   * @returns 小程序支付参数 + token_id
   */
  async createJSPayOrder(params: {
    outTradeNo: string;
    body: string;
    totalFee: number;
    subOpenid: string;
    clientIp: string;
    attach?: string;
    timeExpire?: Date;
  }): Promise<{
    payParams: MiniProgramPayParams;
    tokenId: string;
    rawResponse: WallytJSPayResponse;
  }> {
    const now = new Date();
    const expire = params.timeExpire || new Date(now.getTime() + 5 * 60 * 1000); // 默认 5 分钟

    const request: WallytJSPayRequest = {
      service: 'pay.weixin.jspay',
      version: '2.0',
      charset: 'UTF-8',
      sign_type: this.config.signType,
      mch_id: this.config.mchId,
      is_raw: '1', // 小程序必须为 1
      out_trade_no: params.outTradeNo,
      body: params.body,
      sub_openid: params.subOpenid,
      sub_appid: this.config.subAppId,
      total_fee: params.totalFee,
      mch_create_ip: params.clientIp,
      notify_url: this.config.notifyUrl,
      nonce_str: generateNonceStr(),
      time_start: formatWallytTime(now),
      time_expire: formatWallytTime(expire),
      attach: params.attach
    };

    // 生成签名
    request.sign = generateSign(request, this.config.secretKey, this.config.signType);

    // 发送请求
    const xml = objectToXml(request);

    logger.info('wallyt.jspay.request', {
      out_trade_no: params.outTradeNo,
      total_fee: params.totalFee,
      sub_openid: params.subOpenid
    });

    try {
      const response = await this.httpClient.post('', xml);
      const result = xmlToObject<WallytJSPayResponse>(response.data);

      logger.info('wallyt.jspay.response', {
        out_trade_no: params.outTradeNo,
        status: result.status,
        result_code: result.result_code,
        err_code: result.err_code,
        err_msg: result.err_msg,
        message: result.message,
        raw_response: response.data.substring(0, 500)
      });

      // 检查通信状态
      // Note: Wallyt may omit status field on success when pay_info is present
      if (result.status !== undefined && result.status !== '0') {
        throw new WallytError(
          result.message || 'Wallyt communication failed',
          'WALLYT_COMM_ERROR',
          result.status
        );
      }

      // 检查业务状态
      // Note: Wallyt may omit result_code field on success when pay_info is present
      if (result.result_code !== undefined && result.result_code !== '0') {
        throw new WallytError(
          result.err_msg || 'Wallyt business error',
          result.err_code || 'WALLYT_BIZ_ERROR',
          result.status,
          result.result_code
        );
      }

      // 验证响应签名
      // Note: JSPay responses with pay_info may not include sign field
      if (result.sign && !verifySign(result, this.config.secretKey, this.config.signType)) {
        throw new WallytError(
          'Invalid response signature',
          'WALLYT_SIGN_ERROR'
        );
      }

      // 解析小程序支付参数
      if (!result.pay_info) {
        throw new WallytError(
          'Missing pay_info in response',
          'WALLYT_MISSING_PAY_INFO'
        );
      }

      const payParams: MiniProgramPayParams = JSON.parse(result.pay_info);

      return {
        payParams,
        tokenId: result.token_id || '',
        rawResponse: result
      };
    } catch (error: any) {
      if (error instanceof WallytError) {
        throw error;
      }

      logger.error('wallyt.jspay.error', {
        out_trade_no: params.outTradeNo,
        error: error.message
      });

      throw new WallytError(
        error.message || 'Wallyt API request failed',
        'WALLYT_REQUEST_ERROR'
      );
    }
  }

  /**
   * 查询订单
   *
   * @param outTradeNo - 商户订单号
   * @returns 订单查询结果
   */
  async queryOrder(outTradeNo: string): Promise<WallytQueryResponse> {
    const request: WallytQueryRequest = {
      service: 'unified.trade.query',
      version: '2.0',
      charset: 'UTF-8',
      sign_type: this.config.signType,
      mch_id: this.config.mchId,
      out_trade_no: outTradeNo,
      nonce_str: generateNonceStr()
    };

    request.sign = generateSign(request, this.config.secretKey, this.config.signType);

    const xml = objectToXml(request);

    logger.info('wallyt.query.request', { out_trade_no: outTradeNo });

    try {
      const response = await this.httpClient.post('', xml);
      const result = xmlToObject<WallytQueryResponse>(response.data);

      logger.info('wallyt.query.response', {
        out_trade_no: outTradeNo,
        status: result.status,
        trade_state: result.trade_state
      });

      if (result.status !== '0') {
        throw new WallytError(
          result.message || 'Query failed',
          'WALLYT_QUERY_ERROR',
          result.status
        );
      }

      return result;
    } catch (error: any) {
      if (error instanceof WallytError) {
        throw error;
      }

      logger.error('wallyt.query.error', {
        out_trade_no: outTradeNo,
        error: error.message
      });

      throw new WallytError(
        error.message || 'Query request failed',
        'WALLYT_REQUEST_ERROR'
      );
    }
  }

  /**
   * 申请退款
   *
   * @param params - 退款参数
   * @returns 退款结果
   */
  async refund(params: {
    outTradeNo: string;
    outRefundNo: string;
    totalFee: number;
    refundFee: number;
  }): Promise<WallytRefundResponse> {
    const request: WallytRefundRequest = {
      service: 'unified.trade.refund',
      version: '2.0',
      charset: 'UTF-8',
      sign_type: this.config.signType,
      mch_id: this.config.mchId,
      out_trade_no: params.outTradeNo,
      out_refund_no: params.outRefundNo,
      total_fee: params.totalFee,
      refund_fee: params.refundFee,
      nonce_str: generateNonceStr()
    };

    request.sign = generateSign(request, this.config.secretKey, this.config.signType);

    const xml = objectToXml(request);

    logger.info('wallyt.refund.request', {
      out_trade_no: params.outTradeNo,
      out_refund_no: params.outRefundNo,
      refund_fee: params.refundFee
    });

    try {
      const response = await this.httpClient.post('', xml);
      const result = xmlToObject<WallytRefundResponse>(response.data);

      logger.info('wallyt.refund.response', {
        out_trade_no: params.outTradeNo,
        status: result.status,
        result_code: result.result_code
      });

      if (result.status !== '0') {
        throw new WallytError(
          result.message || 'Refund failed',
          'WALLYT_REFUND_ERROR',
          result.status
        );
      }

      if (result.result_code !== '0') {
        throw new WallytError(
          result.err_msg || 'Refund business error',
          result.err_code || 'WALLYT_REFUND_BIZ_ERROR',
          result.status,
          result.result_code
        );
      }

      return result;
    } catch (error: any) {
      if (error instanceof WallytError) {
        throw error;
      }

      logger.error('wallyt.refund.error', {
        out_trade_no: params.outTradeNo,
        error: error.message
      });

      throw new WallytError(
        error.message || 'Refund request failed',
        'WALLYT_REQUEST_ERROR'
      );
    }
  }

  /**
   * 关闭订单
   *
   * @param outTradeNo - 商户订单号
   * @returns 关闭结果
   */
  async closeOrder(outTradeNo: string): Promise<WallytCloseResponse> {
    const request: WallytCloseRequest = {
      service: 'unified.trade.close',
      version: '2.0',
      charset: 'UTF-8',
      sign_type: this.config.signType,
      mch_id: this.config.mchId,
      out_trade_no: outTradeNo,
      nonce_str: generateNonceStr()
    };

    request.sign = generateSign(request, this.config.secretKey, this.config.signType);

    const xml = objectToXml(request);

    logger.info('wallyt.close.request', { out_trade_no: outTradeNo });

    try {
      const response = await this.httpClient.post('', xml);
      const result = xmlToObject<WallytCloseResponse>(response.data);

      logger.info('wallyt.close.response', {
        out_trade_no: outTradeNo,
        status: result.status,
        result_code: result.result_code
      });

      if (result.status !== '0') {
        throw new WallytError(
          result.message || 'Close failed',
          'WALLYT_CLOSE_ERROR',
          result.status
        );
      }

      return result;
    } catch (error: any) {
      if (error instanceof WallytError) {
        throw error;
      }

      logger.error('wallyt.close.error', {
        out_trade_no: outTradeNo,
        error: error.message
      });

      throw new WallytError(
        error.message || 'Close request failed',
        'WALLYT_REQUEST_ERROR'
      );
    }
  }

  /**
   * 验证回调通知签名
   *
   * @param params - 通知参数
   * @returns 签名是否有效
   */
  verifyNotification(params: Record<string, any>): boolean {
    return verifySign(params, this.config.secretKey, this.config.signType);
  }

  /**
   * 获取配置信息 (用于调试)
   */
  getConfig(): Omit<WallytConfig, 'secretKey'> {
    return {
      apiUrl: this.config.apiUrl,
      mchId: this.config.mchId,
      signType: this.config.signType,
      subAppId: this.config.subAppId,
      notifyUrl: this.config.notifyUrl
    };
  }
}

// ========== 单例管理 ==========

let wallytClientInstance: WallytClient | null = null;

/**
 * 获取 Wallyt 客户端单例
 * 从环境变量读取配置
 */
export function getWallytClient(): WallytClient {
  if (!wallytClientInstance) {
    const config: WallytConfig = {
      apiUrl: env.WALLYT_API_URL,
      mchId: env.WALLYT_MCH_ID,
      secretKey: env.WALLYT_SECRET_KEY,
      signType: env.WALLYT_SIGN_TYPE as 'MD5' | 'SHA256' | 'RSA_1_256',
      subAppId: env.WECHAT_APPID,
      notifyUrl: env.WALLYT_NOTIFY_URL
    };

    // 验证必要配置
    if (!config.mchId) {
      logger.warn('wallyt.config.missing', { field: 'WALLYT_MCH_ID' });
    }
    if (!config.secretKey) {
      logger.warn('wallyt.config.missing', { field: 'WALLYT_SECRET_KEY' });
    }
    if (!config.subAppId) {
      logger.warn('wallyt.config.missing', { field: 'WECHAT_APPID' });
    }
    if (!config.notifyUrl) {
      logger.warn('wallyt.config.missing', { field: 'WALLYT_NOTIFY_URL' });
    }

    wallytClientInstance = new WallytClient(config);
  }

  return wallytClientInstance;
}

/**
 * 重置客户端 (用于测试)
 */
export function resetWallytClient(): void {
  wallytClientInstance = null;
}

/**
 * 检查 Wallyt 配置是否完整
 */
export function isWallytConfigured(): boolean {
  return !!(
    env.WALLYT_MCH_ID &&
    env.WALLYT_SECRET_KEY &&
    env.WECHAT_APPID &&
    env.WALLYT_NOTIFY_URL
  );
}
