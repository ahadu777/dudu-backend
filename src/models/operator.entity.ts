import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('operators')
export class Operator {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint', nullable: true })
  merchant_id!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  partner_id!: string | null;

  @Column({ type: 'varchar', length: 64, unique: true })
  account!: string;

  @Column({ type: 'varchar', length: 128 })
  password_hash!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  real_name!: string | null;

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'DISABLED'],
    default: 'ACTIVE'
  })
  status!: 'ACTIVE' | 'DISABLED';

  @Column({
    type: 'enum',
    enum: ['INTERNAL', 'OTA'],
    default: 'INTERNAL'
  })
  operator_type!: 'INTERNAL' | 'OTA';

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  // Helper method to check if operator is active
  isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  // Helper method to check if operator is OTA type
  isOtaOperator(): boolean {
    return this.operator_type === 'OTA';
  }
}
