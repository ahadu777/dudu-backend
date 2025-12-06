/**
 * Wallyt 签名工具
 * 支持 MD5 和 SHA256 签名方式
 */

import crypto from 'crypto';

/** 支持的签名类型 */
export type SignType = 'MD5' | 'SHA256' | 'RSA_1_256';

/**
 * 生成签名
 *
 * 签名规则：
 * 1. 过滤空值和 sign 字段
 * 2. 参数按 key 的 ASCII 码排序
 * 3. 拼接成 key=value&key=value 格式
 * 4. 末尾加上 &key=secretKey
 * 5. MD5/SHA256 加密后转大写
 *
 * @param params - 请求参数对象
 * @param secretKey - 商户密钥
 * @param signType - 签名类型 (MD5 | SHA256 | RSA_1_256)
 * @returns 签名字符串 (大写)
 */
export function generateSign(
  params: Record<string, any>,
  secretKey: string,
  signType: SignType = 'MD5'
): string {
  // 1. 过滤空值和 sign 字段，按 key 排序
  const filtered = Object.entries(params)
    .filter(([key, value]) => {
      if (key === 'sign') return false;
      if (value === '' || value === undefined || value === null) return false;
      return true;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  // 2. 拼接字符串
  const stringA = filtered
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  // 3. 加上密钥
  const stringSignTemp = `${stringA}&key=${secretKey}`;

  // 4. 计算签名并转大写
  if (signType === 'SHA256') {
    return crypto
      .createHash('sha256')
      .update(stringSignTemp, 'utf8')
      .digest('hex')
      .toUpperCase();
  }

  if (signType === 'RSA_1_256') {
    // RSA 签名需要私钥，这里 secretKey 应该是 RSA 私钥
    // 注意：RSA 签名不需要 &key= 后缀
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(stringA, 'utf8');
    return sign.sign(secretKey, 'base64');
  }

  // 默认 MD5
  return crypto
    .createHash('md5')
    .update(stringSignTemp, 'utf8')
    .digest('hex')
    .toUpperCase();
}

/**
 * 验证签名
 *
 * @param params - 包含 sign 的参数对象
 * @param secretKey - 商户密钥 (RSA 时为公钥)
 * @param signType - 签名类型
 * @returns 签名是否有效
 */
export function verifySign(
  params: Record<string, any>,
  secretKey: string,
  signType: SignType = 'MD5'
): boolean {
  const receivedSign = params.sign;
  if (!receivedSign) {
    return false;
  }

  if (signType === 'RSA_1_256') {
    // RSA 验签需要公钥
    // 1. 过滤空值和 sign 字段，按 key 排序
    const filtered = Object.entries(params)
      .filter(([key, value]) => {
        if (key === 'sign') return false;
        if (value === '' || value === undefined || value === null) return false;
        return true;
      })
      .sort(([a], [b]) => a.localeCompare(b));

    const stringA = filtered.map(([key, value]) => `${key}=${value}`).join('&');

    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(stringA, 'utf8');
    try {
      return verify.verify(secretKey, receivedSign, 'base64');
    } catch {
      return false;
    }
  }

  const calculatedSign = generateSign(params, secretKey, signType);
  return receivedSign.toUpperCase() === calculatedSign;
}

/**
 * 生成随机字符串
 *
 * @param length - 字符串长度 (默认 32)
 * @returns 随机字符串
 */
export function generateNonceStr(length: number = 32): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * 生成时间字符串
 * 格式: yyyyMMddHHmmss (北京时间 GMT+8)
 *
 * @param date - 日期对象 (默认当前时间)
 * @returns 格式化的时间字符串
 */
export function formatWallytTime(date: Date = new Date()): string {
  // 转换为北京时间 (UTC+8)
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');
  const hours = String(beijingTime.getUTCHours()).padStart(2, '0');
  const minutes = String(beijingTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(beijingTime.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * 解析 Wallyt 时间字符串为 Date 对象
 *
 * @param timeStr - yyyyMMddHHmmss 格式的时间字符串
 * @returns Date 对象
 */
export function parseWallytTime(timeStr: string): Date {
  if (!timeStr || timeStr.length !== 14) {
    return new Date();
  }

  const year = parseInt(timeStr.slice(0, 4), 10);
  const month = parseInt(timeStr.slice(4, 6), 10) - 1;
  const day = parseInt(timeStr.slice(6, 8), 10);
  const hours = parseInt(timeStr.slice(8, 10), 10);
  const minutes = parseInt(timeStr.slice(10, 12), 10);
  const seconds = parseInt(timeStr.slice(12, 14), 10);

  // 创建北京时间，然后转换为 UTC
  const beijingDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  // 减去 8 小时得到 UTC 时间
  return new Date(beijingDate.getTime() - 8 * 60 * 60 * 1000);
}
