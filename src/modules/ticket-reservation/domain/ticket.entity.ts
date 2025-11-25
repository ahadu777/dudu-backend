import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type TicketReservationStatus = 'PENDING_PAYMENT' | 'ACTIVATED' | 'RESERVED' | 'VERIFIED' | 'EXPIRED';

@Entity('tickets')
@Index(['ticket_code'])
@Index(['order_id'])
@Index(['status'])
@Index(['orq'])
export class TicketEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  ticket_code!: string;

  @Column({ type: 'int' })
  order_id!: number;

  @Column({
    type: 'enum',
    enum: ['PENDING_PAYMENT', 'ACTIVATED', 'RESERVED', 'VERIFIED', 'EXPIRED'],
    default: 'PENDING_PAYMENT'
  })
  status!: TicketReservationStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_email?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customer_phone?: string;

  @Column({ type: 'int' })
  product_id!: number;

  @Column({ type: 'int', comment: 'Organization ID' })
  orq!: number;

  @Column({ type: 'text', nullable: true, comment: 'Base64 QR code image' })
  qr_code?: string;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  activated_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  reserved_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  verified_at?: Date;

  @Column({ type: 'int', nullable: true, comment: 'Operator user ID' })
  verified_by?: number;
}
