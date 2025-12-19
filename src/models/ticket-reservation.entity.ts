import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TicketEntity } from './ticket.entity';
import { ReservationSlotEntity } from './reservation-slot.entity';

export type ReservationStatus = 'RESERVED' | 'CANCELLED' | 'VERIFIED';
export type ReservationSource = 'direct' | 'ota';

@Entity('ticket_reservations')
@Index(['ticket_id'])
@Index(['slot_id'])
@Index(['orq'])
@Index(['source'])
@Index(['ticket_id'], { unique: true }) // One direct ticket = one reservation
@Index(['ota_ticket_code'], { unique: true }) // One OTA ticket = one reservation
export class TicketReservationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: ['direct', 'ota'],
    default: 'direct',
    comment: '票券来源：direct=小程序直购, ota=OTA渠道'
  })
  source!: ReservationSource;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'OTA票券编码（source=ota时使用）'
  })
  ota_ticket_code?: string;

  @Column({ type: 'int', nullable: true, comment: '票务ID（source=direct时使用）' })
  ticket_id?: number;

  @Column({ type: 'int' })
  slot_id!: number;

  @Column({ type: 'varchar', length: 255 })
  customer_email!: string;

  @Column({ type: 'varchar', length: 20 })
  customer_phone!: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '客户姓名（可选，级联查询时使用）'
  })
  customer_name?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  reserved_at!: Date;

  @Column({
    type: 'enum',
    enum: ['RESERVED', 'CANCELLED', 'VERIFIED'],
    default: 'RESERVED'
  })
  status!: ReservationStatus;

  @Column({ type: 'int', comment: 'Organization ID' })
  orq!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations (optional - for TypeORM query building)
  @ManyToOne(() => TicketEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'ticket_id' })
  ticket?: TicketEntity;

  @ManyToOne(() => ReservationSlotEntity)
  @JoinColumn({ name: 'slot_id' })
  slot?: ReservationSlotEntity;
}
