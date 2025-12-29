/**
 * QA 验证记录实体
 *
 * 统一存储两种类型的 QA 维护数据：
 * - assertion_label: 断言标签（原始断言名 → 中文标签）
 * - manual_check: 手动验证记录（PRD/API 级别的 QA 验证）
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index
} from 'typeorm';

export type QaRecordType = 'assertion_label' | 'manual_check';
export type ManualCheckStatus = 'passed' | 'failed' | 'pending';

@Entity('qa_verification_records')
@Index('idx_type', ['type'])
@Index('idx_prd', ['prd_id'])
@Index('idx_original_name', ['original_name'])
@Index('idx_deleted_at', ['deleted_at'])
@Index('idx_type_deleted_at', ['type', 'deleted_at'])
export class QaVerificationRecordEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ type: 'enum', enum: ['assertion_label', 'manual_check'] })
  type!: QaRecordType;

  // ============ assertion_label 专用字段 ============

  /** 原始断言名称 (如 "Status code is 200") */
  @Column({ type: 'varchar', length: 255, nullable: true })
  original_name?: string;

  /** 中文标签 (如 "接口响应正常") */
  @Column({ type: 'varchar', length: 255, nullable: true })
  label?: string;

  // ============ manual_check 专用字段 ============

  /** PRD/Story ID (如 "PRD-006", "US-012", "cross-prd-xxx") */
  @Column({ type: 'varchar', length: 100, nullable: true })
  prd_id?: string;

  /** API 名称 (如 "Get Cruise Products")，为空表示 PRD 级别验证 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  api_name?: string;

  /** 验证描述 */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /** 验证人 */
  @Column({ type: 'varchar', length: 50, nullable: true })
  verified_by?: string;

  /** 验证状态 */
  @Column({ type: 'enum', enum: ['passed', 'failed', 'pending'], nullable: true })
  status?: ManualCheckStatus;

  /** 验证日期 */
  @Column({ type: 'date', nullable: true })
  verified_date?: Date;

  // ============ 通用字段 ============

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  /** 软删除时间 */
  @DeleteDateColumn()
  deleted_at?: Date;
}
