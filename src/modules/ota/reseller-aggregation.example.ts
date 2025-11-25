/**
 * 经销商聚合查询示例
 * 从批次JSON字段中提取经销商信息并聚合
 */

/**
 * GET /api/ota/resellers/summary
 *
 * 功能:从所有批次中聚合经销商信息
 *
 * 查询参数:
 * - status: 'active' | 'all' (默认active)
 * - date_range: '2025-01' | '2025-Q1' (可选,按时间筛选)
 */

// ============= SQL聚合查询实现 =============

export const aggregateResellersSql = `
SELECT
  JSON_UNQUOTE(JSON_EXTRACT(reseller_metadata, '$.intended_reseller')) as reseller_name,
  JSON_UNQUOTE(JSON_EXTRACT(reseller_metadata, '$.contact_email')) as contact_email,
  JSON_UNQUOTE(JSON_EXTRACT(reseller_metadata, '$.contact_phone')) as contact_phone,

  -- 统计信息
  COUNT(DISTINCT batch_id) as total_batches,
  SUM(total_quantity) as total_tickets_generated,
  SUM(activated_count) as total_tickets_activated,

  -- 最近活动
  MAX(created_at) as last_batch_date,
  MIN(created_at) as first_batch_date,

  -- 佣金统计(按百分比类型)
  AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(reseller_metadata, '$.commission_config.rate')) AS DECIMAL(5,4))) as avg_commission_rate,

  -- 结算周期(取最常见的)
  JSON_UNQUOTE(JSON_EXTRACT(reseller_metadata, '$.settlement_cycle')) as settlement_cycle

FROM ota_ticket_batches

WHERE partner_id = ?
  AND reseller_metadata IS NOT NULL
  AND distribution_mode = 'reseller_batch'
  AND status = 'active'

GROUP BY
  JSON_UNQUOTE(JSON_EXTRACT(reseller_metadata, '$.intended_reseller')),
  contact_email,
  contact_phone,
  settlement_cycle

ORDER BY total_tickets_activated DESC
`;

// ============= API响应格式 =============

export interface ResellerSummary {
  reseller_name: string;
  contact_email?: string;
  contact_phone?: string;

  // 业务统计
  statistics: {
    total_batches: number;
    total_tickets_generated: number;
    total_tickets_activated: number;
    activation_rate: number;  // activated / generated
  };

  // 佣金信息
  commission: {
    avg_rate: number;         // 平均佣金率
    settlement_cycle: string; // 结算周期
  };

  // 时间信息
  first_batch_date: string;
  last_batch_date: string;
  days_active: number;
}

// ============= 示例响应 =============

export const exampleResponse = {
  total: 3,
  resellers: [
    {
      reseller_name: "携程旅行社",
      contact_email: "partner@ctrip.com",
      contact_phone: "138-1234-5678",

      statistics: {
        total_batches: 12,
        total_tickets_generated: 5000,
        total_tickets_activated: 4200,
        activation_rate: 0.84
      },

      commission: {
        avg_rate: 0.15,
        settlement_cycle: "monthly"
      },

      first_batch_date: "2025-10-01",
      last_batch_date: "2025-11-15",
      days_active: 45
    },
    {
      reseller_name: "美团门票",
      contact_email: "tickets@meituan.com",
      contact_phone: "139-9876-5432",

      statistics: {
        total_batches: 8,
        total_tickets_generated: 3000,
        total_tickets_activated: 2800,
        activation_rate: 0.93
      },

      commission: {
        avg_rate: 0.12,
        settlement_cycle: "weekly"
      },

      first_batch_date: "2025-11-01",
      last_batch_date: "2025-11-18",
      days_active: 17
    }
  ]
};

// ============= 佣金计算示例 =============

export interface CommissionCalculation {
  ticket_code: string;
  base_price: number;
  commission_config: {
    type: 'percentage' | 'fixed_amount';
    rate?: number;
    fixed_amount?: number;
    min_commission?: number;
    max_commission?: number;
  };
  calculated_commission: number;
}

export function calculateCommission(
  basePrice: number,
  config: CommissionCalculation['commission_config']
): number {
  let commission = 0;

  if (config.type === 'percentage' && config.rate) {
    commission = basePrice * config.rate;
  } else if (config.type === 'fixed_amount' && config.fixed_amount) {
    commission = config.fixed_amount;
  }

  // 应用最小值限制
  if (config.min_commission && commission < config.min_commission) {
    commission = config.min_commission;
  }

  // 应用最大值限制
  if (config.max_commission && commission > config.max_commission) {
    commission = config.max_commission;
  }

  return Math.round(commission * 100) / 100; // 保留两位小数
}

// ============= 佣金计算案例 =============

export const commissionExamples = [
  {
    scenario: "15%佣金,无封底封顶",
    base_price: 299,
    config: { type: 'percentage', rate: 0.15 },
    result: 44.85  // 299 * 0.15
  },
  {
    scenario: "15%佣金,最低10元",
    base_price: 50,
    config: { type: 'percentage', rate: 0.15, min_commission: 10 },
    result: 10  // 50 * 0.15 = 7.5 < 10,取最低值
  },
  {
    scenario: "15%佣金,最高50元",
    base_price: 500,
    config: { type: 'percentage', rate: 0.15, max_commission: 50 },
    result: 50  // 500 * 0.15 = 75 > 50,取最高值
  },
  {
    scenario: "固定20元/张",
    base_price: 299,
    config: { type: 'fixed_amount', fixed_amount: 20 },
    result: 20
  }
];
