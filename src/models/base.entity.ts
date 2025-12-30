import { CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

/**
 * 基础时间戳实体
 *
 * 提供统一的时间戳字段：
 * - created_at: 创建时间
 * - updated_at: 更新时间
 * - deleted_at: 软删除时间
 *
 * 使用方式：
 * ```typescript
 * @Entity('table_name')
 * export class MyEntity extends BaseTimestampEntity {
 *   @PrimaryGeneratedColumn()
 *   id!: number;
 *   // ... 其他字段
 * }
 * ```
 *
 * TypeORM 软删除支持：
 * - repo.softDelete(id)     // 设置 deleted_at
 * - repo.restore(id)        // 清除 deleted_at
 * - repo.find()             // 自动排除已删除
 * - repo.find({ withDeleted: true }) // 包含已删除
 */
export abstract class BaseTimestampEntity {
  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @DeleteDateColumn()
  deleted_at!: Date | null;
}
