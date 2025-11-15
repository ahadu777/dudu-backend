import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export type ResellerStatus = 'active' | 'suspended' | 'terminated';
export type SettlementCycle = 'weekly' | 'monthly' | 'quarterly';
export type ResellerTier = 'platinum' | 'gold' | 'silver' | 'bronze';

/**
 * OTA Reseller Entity
 *
 * Centralized registry for OTA resellers (sub-distributors).
 * Each reseller belongs to an OTA partner and can receive ticket batches for distribution.
 *
 * Business Context:
 * - Supports B2B2C model where OTA partners distribute tickets through resellers
 * - Enables commission-based billing and contract management
 * - Normalizes reseller data (previously stored as JSON in batches)
 *
 * Related Entities:
 * - OTATicketBatchEntity: batches can be assigned to specific resellers via reseller_id FK
 * - Partner authentication: partner_id links to authenticated OTA partner
 */
@Entity('ota_resellers')
@Index(['partner_id', 'reseller_code'], { unique: true }) // Unique per partner
@Index(['partner_id']) // Fast partner-scoped queries
@Index(['status']) // Filter active/suspended resellers
@Index(['region']) // Regional analytics
export class OTAResellerEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // === OTA Partner Association ===
  @Column({ type: 'varchar', length: 50, comment: 'OTA platform ID (e.g., ctrip, klook)' })
  partner_id!: string;

  // === Reseller Identification ===
  @Column({ type: 'varchar', length: 50, comment: 'Unique code within partner (e.g., GD-TRAVEL-001)' })
  reseller_code!: string;

  @Column({ type: 'varchar', length: 200, comment: 'Display name (e.g., "广州国旅")' })
  reseller_name!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  contact_email?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contact_phone?: string;

  // === Business Configuration ===
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0.10,
    comment: '佣金比例 (e.g., 0.10 = 10%)'
  })
  commission_rate!: number;

  @Column({ type: 'date', nullable: true })
  contract_start_date?: Date;

  @Column({ type: 'date', nullable: true })
  contract_end_date?: Date;

  @Column({
    type: 'enum',
    enum: ['active', 'suspended', 'terminated'],
    default: 'active'
  })
  status!: ResellerStatus;

  // === Settlement Configuration ===
  @Column({
    type: 'enum',
    enum: ['weekly', 'monthly', 'quarterly'],
    default: 'monthly'
  })
  settlement_cycle!: SettlementCycle;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: 'e.g., Net 30, Net 60' })
  payment_terms?: string;

  // === Categorization ===
  @Column({ type: 'varchar', length: 100, nullable: true, comment: 'e.g., "华南地区", "华北地区"' })
  region?: string;

  @Column({
    type: 'enum',
    enum: ['platinum', 'gold', 'silver', 'bronze'],
    default: 'bronze'
  })
  tier!: ResellerTier;

  // === Metadata ===
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
