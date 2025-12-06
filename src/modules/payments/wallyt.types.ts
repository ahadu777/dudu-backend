/**
 * Wallyt 微信小程序支付类型定义
 * 基于 Wallyt JS Pay API 文档
 */

// ========== 请求参数 ==========

/**
 * 创建预支付订单请求参数 (pay.weixin.jspay)
 */
export interface WallytJSPayRequest {
  /** 接口类型，固定值: pay.weixin.jspay */
  service: 'pay.weixin.jspay';
  /** 版本号，默认: 2.0 */
  version?: string;
  /** 字符集，默认: UTF-8 */
  charset?: string;
  /** 签名类型: MD5, SHA256, RSA_1_256 */
  sign_type?: 'MD5' | 'SHA256' | 'RSA_1_256';
  /** 商户号 (Wallyt 分配) */
  mch_id: string;
  /** 原生模式: "1" = 小程序, "0" = 非原生 */
  is_raw: '1' | '0';
  /** 商户订单号 (5-32位，字母数字下划线) */
  out_trade_no: string;
  /** 终端设备号 (可选) */
  device_info?: string;
  /** 商品描述 (127字符内) */
  body: string;
  /** 用户 OpenID (小程序下的唯一标识) */
  sub_openid: string;
  /** 小程序 AppID */
  sub_appid: string;
  /** 附加数据 (原样返回) */
  attach?: string;
  /** 金额 (分，整数) */
  total_fee: number;
  /** 终端 IP */
  mch_create_ip: string;
  /** 支付结果通知地址 */
  notify_url: string;
  /** 支付完成跳转地址 (可选) */
  callback_url?: string;
  /** 订单生成时间 (yyyyMMddHHmmss) */
  time_start?: string;
  /** 订单过期时间 (yyyyMMddHHmmss) */
  time_expire?: string;
  /** 商品标签 (优惠券用) */
  goods_tag?: string;
  /** 随机字符串 (32字符内) */
  nonce_str: string;
  /** 禁用信用卡: "1" = 禁用, "0" = 允许 */
  limit_credit_pay?: '1' | '0';
  /** 签名 */
  sign?: string;
}

/**
 * 创建预支付订单响应
 */
export interface WallytJSPayResponse {
  /** 通信标识: "0" = 成功 */
  status: string;
  /** 返回消息 (签名验证失败时返回) */
  message?: string;
  /** 业务结果: "0" = 成功 */
  result_code?: string;
  /** 公众号 ID */
  appid?: string;
  /** 版本号 */
  version?: string;
  /** 字符集 */
  charset?: string;
  /** 签名类型 */
  sign_type?: string;
  /** 商户号 */
  mch_id?: string;
  /** 终端设备号 */
  device_info?: string;
  /** 随机字符串 */
  nonce_str?: string;
  /** 错误码 */
  err_code?: string;
  /** 错误信息 */
  err_msg?: string;
  /** 签名 */
  sign?: string;
  /** 预支付 Token (交互 API 使用) */
  token_id?: string;
  /** 小程序支付参数 (JSON 字符串, is_raw="1" 时返回) */
  pay_info?: string;
}

/**
 * 小程序支付参数 (pay_info 解析后)
 * 直接传给 wx.requestPayment
 */
export interface MiniProgramPayParams {
  /** 小程序 AppID */
  appId: string;
  /** 时间戳 (秒) */
  timeStamp: string;
  /** 随机字符串 */
  nonceStr: string;
  /** 预支付ID: prepay_id=xxx */
  package: string;
  /** 签名类型 */
  signType: string;
  /** 支付签名 */
  paySign: string;
}

// ========== 回调通知 ==========

/**
 * Wallyt 支付结果通知
 * POST 到 notify_url, XML 格式
 */
export interface WallytNotification {
  /** 版本号 */
  version: string;
  /** 字符集 */
  charset: string;
  /** 签名类型 */
  sign_type: string;
  /** 通信标识: "0" = 成功 */
  status: string;
  /** 返回消息 */
  message?: string;
  /** 业务结果: "0" = 成功 */
  result_code?: string;
  /** 商户号 */
  mch_id?: string;
  /** 终端设备号 */
  device_info?: string;
  /** 随机字符串 */
  nonce_str?: string;
  /** 错误码 */
  err_code?: string;
  /** 错误信息 */
  err_msg?: string;
  /** 签名 */
  sign?: string;
  /** 用户 OpenID */
  openid?: string;
  /** 交易类型 */
  trade_type?: string;
  /** 是否关注公众号: Y/N */
  is_subscribe?: string;
  /** 支付结果: 0 = 成功 */
  pay_result?: string;
  /** 支付结果信息 */
  pay_info?: string;
  /** 平台订单号 */
  transaction_id?: string;
  /** 渠道订单号 (微信交易号) */
  out_transaction_id?: string;
  /** 子商户是否关注 */
  sub_is_subscribe?: string;
  /** 子商户 AppID */
  sub_appid?: string;
  /** 子商户用户 OpenID */
  sub_openid?: string;
  /** 商户订单号 */
  out_trade_no?: string;
  /** 订单金额 (分) */
  total_fee?: string;
  /** 优惠金额 (分) */
  coupon_fee?: string;
  /** 货币类型 */
  fee_type?: string;
  /** 附加数据 */
  attach?: string;
  /** 付款银行 */
  bank_type?: string;
  /** 银行订单号 */
  bank_billno?: string;
  /** 支付完成时间 (yyyyMMddHHmmss) */
  time_end?: string;
  /** 现金支付金额 (分) */
  cash_fee?: string;
  /** 现金支付货币类型 */
  cash_fee_type?: string;
  /** 汇率 */
  rate?: string;
}

// ========== 查询订单 ==========

/**
 * 订单查询请求
 */
export interface WallytQueryRequest {
  /** 接口类型 */
  service: 'unified.trade.query';
  /** 版本号 */
  version?: string;
  /** 字符集 */
  charset?: string;
  /** 签名类型 */
  sign_type?: 'MD5' | 'SHA256' | 'RSA_1_256';
  /** 商户号 */
  mch_id: string;
  /** 商户订单号 (与 transaction_id 二选一) */
  out_trade_no?: string;
  /** 平台订单号 (与 out_trade_no 二选一) */
  transaction_id?: string;
  /** 随机字符串 */
  nonce_str: string;
  /** 签名 */
  sign?: string;
}

/**
 * 订单查询响应
 */
export interface WallytQueryResponse {
  /** 通信标识 */
  status: string;
  /** 返回消息 */
  message?: string;
  /** 业务结果 */
  result_code?: string;
  /** 商户号 */
  mch_id?: string;
  /** 随机字符串 */
  nonce_str?: string;
  /** 错误码 */
  err_code?: string;
  /** 错误信息 */
  err_msg?: string;
  /** 签名 */
  sign?: string;
  /** 用户 OpenID */
  openid?: string;
  /** 交易类型 */
  trade_type?: string;
  /** 交易状态: SUCCESS/REFUND/NOTPAY/CLOSED/REVOKED/USERPAYING/PAYERROR */
  trade_state?: string;
  /** 付款银行 */
  bank_type?: string;
  /** 订单金额 (分) */
  total_fee?: string;
  /** 优惠金额 (分) */
  coupon_fee?: string;
  /** 货币类型 */
  fee_type?: string;
  /** 平台订单号 */
  transaction_id?: string;
  /** 商户订单号 */
  out_trade_no?: string;
  /** 附加数据 */
  attach?: string;
  /** 支付完成时间 */
  time_end?: string;
  /** 交易状态描述 */
  trade_state_desc?: string;
}

// ========== 退款 ==========

/**
 * 退款请求
 */
export interface WallytRefundRequest {
  /** 接口类型 */
  service: 'unified.trade.refund';
  /** 版本号 */
  version?: string;
  /** 字符集 */
  charset?: string;
  /** 签名类型 */
  sign_type?: 'MD5' | 'SHA256' | 'RSA_1_256';
  /** 商户号 */
  mch_id: string;
  /** 商户订单号 */
  out_trade_no?: string;
  /** 平台订单号 */
  transaction_id?: string;
  /** 商户退款单号 */
  out_refund_no: string;
  /** 订单金额 (分) */
  total_fee: number;
  /** 退款金额 (分) */
  refund_fee: number;
  /** 操作员 */
  op_user_id?: string;
  /** 随机字符串 */
  nonce_str: string;
  /** 签名 */
  sign?: string;
}

/**
 * 退款响应
 */
export interface WallytRefundResponse {
  /** 通信标识 */
  status: string;
  /** 返回消息 */
  message?: string;
  /** 业务结果 */
  result_code?: string;
  /** 商户号 */
  mch_id?: string;
  /** 随机字符串 */
  nonce_str?: string;
  /** 错误码 */
  err_code?: string;
  /** 错误信息 */
  err_msg?: string;
  /** 签名 */
  sign?: string;
  /** 平台订单号 */
  transaction_id?: string;
  /** 商户订单号 */
  out_trade_no?: string;
  /** 商户退款单号 */
  out_refund_no?: string;
  /** 平台退款单号 */
  refund_id?: string;
  /** 退款金额 (分) */
  refund_fee?: string;
  /** 优惠退款金额 (分) */
  coupon_refund_fee?: string;
}

// ========== 关闭订单 ==========

/**
 * 关闭订单请求
 */
export interface WallytCloseRequest {
  /** 接口类型 */
  service: 'unified.trade.close';
  /** 版本号 */
  version?: string;
  /** 字符集 */
  charset?: string;
  /** 签名类型 */
  sign_type?: 'MD5' | 'SHA256' | 'RSA_1_256';
  /** 商户号 */
  mch_id: string;
  /** 商户订单号 */
  out_trade_no: string;
  /** 随机字符串 */
  nonce_str: string;
  /** 签名 */
  sign?: string;
}

/**
 * 关闭订单响应
 */
export interface WallytCloseResponse {
  /** 通信标识 */
  status: string;
  /** 返回消息 */
  message?: string;
  /** 业务结果 */
  result_code?: string;
  /** 商户号 */
  mch_id?: string;
  /** 随机字符串 */
  nonce_str?: string;
  /** 错误码 */
  err_code?: string;
  /** 错误信息 */
  err_msg?: string;
  /** 签名 */
  sign?: string;
}

// ========== 配置 ==========

/**
 * Wallyt 配置
 */
export interface WallytConfig {
  /** API 地址 */
  apiUrl: string;
  /** 商户号 */
  mchId: string;
  /** 密钥 (MD5/SHA256 签名用) */
  secretKey: string;
  /** 签名类型 */
  signType: 'MD5' | 'SHA256' | 'RSA_1_256';
  /** 小程序 AppID */
  subAppId: string;
  /** 支付回调地址 */
  notifyUrl: string;
}
