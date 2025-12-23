import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { OTAResellerEntity } from '../../../models/ota-reseller.entity';

export type BatchStatus = 'creating' | 'active' | 'expired' | 'cancelled';
export type DistributionMode = 'direct_sale' | 'reseller_batch';

interface PricingSnapshot {
  base_product_id: number;
  base_price: number;
  customer_type_pricing: Array<{
    customer_type: 'adult' | 'child' | 'elderly';
    unit_price: number;
    discount_applied?: number;
  }>;
  weekend_premium?: number;
  special_date_multiplier?: number;
  currency: string;
  captured_at: string;
  valid_until?: string;
  // NEW: Batch-specific pricing overrides
  pricing_overrides?: {
    campaign_discount_rate?: number; // e.g., 0.25 for 25% off
    override_weekend_premium?: number; // Override or disable weekend pricing
    custom_customer_pricing?: {
      adult?: number;
      child?: number;
      elderly?: number;
    };
    campaign_rules?: string[]; // e.g., ["early_bird_25_percent_off", "no_weekend_premium"]
    override_reason?: string; // e.g., "Early bird campaign pricing"
  };
}

interface ResellerMetadata {
  intended_reseller: string;
  contact_email?: string;
  contact_phone?: string;

  // 佣金配置(按批次设置)
  commission_config?: {
    type: 'percentage' | 'fixed_amount';
    rate?: number;              // 百分比佣金(0.15 = 15%)
    fixed_amount?: number;      // 固定金额佣金(每张票)
    min_commission?: number;    // 最低佣金(封底)
    max_commission?: number;    // 最高佣金(封顶)
  };

  batch_purpose?: string;
  distribution_notes?: string;
  margin_guidance?: number;     // Suggested markup percentage (deprecated,用commission_config替代)

  // 结算信息
  settlement_cycle?: 'weekly' | 'monthly' | 'quarterly';
  payment_terms?: string;       // e.g., "T+30", "T+60"
}

interface BatchMetadata {
  campaign_type?: 'early_bird' | 'flash_sale' | 'group_discount' | 'seasonal' | 'standard';
  campaign_name?: string; // e.g., "Spring 2025 Early Bird", "Black Friday Flash"
  special_conditions?: string[]; // e.g., ["valid_weekends_only", "requires_group_booking"]
  marketing_tags?: string[]; // e.g., ["premium", "family_friendly", "limited_time"]
  target_demographics?: string[]; // e.g., ["young_adults", "families", "seniors"]
  distribution_channels?: string[]; // e.g., ["social_media", "email_campaign", "partner_websites"]
  promotional_code?: string; // Associated promo code if any
  notes?: string; // Additional context
}

@Entity('ota_ticket_batches')
@Index(['partner_id', 'product_id']) // For partner-specific queries
@Index(['status', 'expires_at']) // For batch cleanup
@Index(['distribution_mode']) // For analytics
@Index(['created_at']) // For temporal queries
export class OTATicketBatchEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  batch_id!: string;

  @Column({ type: 'varchar', length: 50 })
  partner_id!: string;

  @Column({ type: 'int' })
  product_id!: number;

  @Column({ type: 'int', unsigned: true })
  total_quantity!: number;

  @Column({
    type: 'enum',
    enum: ['direct_sale', 'reseller_batch'],
    default: 'direct_sale'
  })
  distribution_mode!: DistributionMode;

  @Column({ type: 'json' })
  pricing_snapshot!: PricingSnapshot;

  @Column({ type: 'json', nullable: true })
  reseller_metadata?: ResellerMetadata;

  @Column({ type: 'json', nullable: true })
  batch_metadata?: BatchMetadata;

  // === Reseller Relationship (NEW - 2025-11-14) ===
  @Column({ type: 'int', nullable: true, comment: '经销商ID，关联ota_resellers.id' })
  reseller_id?: number;

  @ManyToOne(() => OTAResellerEntity, { nullable: true })
  @JoinColumn({ name: 'reseller_id' })
  reseller?: OTAResellerEntity;

  @Column({ type: 'timestamp', nullable: true })
  expires_at?: Date;

  @Column({
    type: 'enum',
    enum: ['creating', 'active', 'expired', 'cancelled'],
    default: 'active'
  })
  status!: BatchStatus;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @BeforeInsert()
  generateBatchId() {
    if (!this.batch_id) {
      // Generate batch ID: BATCH-YYYYMMDD-{partner}-{random}
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      this.batch_id = `BATCH-${date}-${this.partner_id}-${random}`;
    }
  }

  // Business logic methods
  isExpired(): boolean {
    return this.status === 'active' && this.expires_at !== null && new Date() > this.expires_at!;
  }

  isActive(): boolean {
    return this.status === 'active' && (!this.expires_at || new Date() <= this.expires_at);
  }

  expire(): void {
    if (this.status === 'active') {
      this.status = 'expired';
    }
  }

  cancel(): void {
    if (this.status === 'active') {
      this.status = 'cancelled';
    }
  }

  // Get pricing for specific customer type (with batch overrides)
  getPricingForCustomerType(customerType: 'adult' | 'child' | 'elderly'): number {
    // Check for custom pricing override first
    const overridePrice = this.pricing_snapshot.pricing_overrides?.custom_customer_pricing?.[customerType];
    if (overridePrice !== undefined) {
      return overridePrice;
    }

    // Fall back to standard pricing
    const pricing = this.pricing_snapshot.customer_type_pricing.find(
      p => p.customer_type === customerType
    );
    const basePrice = pricing?.unit_price || this.pricing_snapshot.base_price;

    // Apply campaign discount if no custom override
    const discountRate = this.pricing_snapshot.pricing_overrides?.campaign_discount_rate || 0;
    return basePrice * (1 - discountRate);
  }

  // Check if batch has pricing overrides
  hasPricingOverrides(): boolean {
    return !!(this.pricing_snapshot.pricing_overrides);
  }

  // Get effective weekend premium (considering overrides)
  getEffectiveWeekendPremium(): number {
    const override = this.pricing_snapshot.pricing_overrides?.override_weekend_premium;
    return override !== undefined ? override : (this.pricing_snapshot.weekend_premium || 0);
  }

  // Get campaign discount rate
  getCampaignDiscountRate(): number {
    return this.pricing_snapshot.pricing_overrides?.campaign_discount_rate || 0;
  }

  // Check if batch has extended expiry (reseller batches)
  hasExtendedExpiry(): boolean {
    return this.distribution_mode === 'reseller_batch';
  }

  // Campaign and batch metadata methods
  getCampaignType(): string {
    return this.batch_metadata?.campaign_type || 'standard';
  }

  getCampaignName(): string {
    return this.batch_metadata?.campaign_name || 'Standard Batch';
  }

  isEarlyBirdCampaign(): boolean {
    return this.batch_metadata?.campaign_type === 'early_bird';
  }

  isFlashSale(): boolean {
    return this.batch_metadata?.campaign_type === 'flash_sale';
  }

  hasSpecialConditions(): boolean {
    return !!(this.batch_metadata?.special_conditions && this.batch_metadata.special_conditions.length > 0);
  }

  getMarketingTags(): string[] {
    return this.batch_metadata?.marketing_tags || [];
  }
}