import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TicketEntity } from './ticket.entity';
import { ReservationSlotEntity } from './reservation-slot.entity';

export type ReservationStatus = 'RESERVED' | 'CANCELLED' | 'VERIFIED';

@Entity('ticket_reservations')
@Index(['ticket_id'])
@Index(['slot_id'])
@Index(['orq'])
@Index(['ticket_id'], { unique: true }) // One ticket = one reservation
export class TicketReservationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  ticket_id!: number;

  @Column({ type: 'int' })
  slot_id!: number;

  @Column({ type: 'varchar', length: 255 })
  customer_email!: string;

  @Column({ type: 'varchar', length: 20 })
  customer_phone!: string;

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
  @ManyToOne(() => TicketEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket?: TicketEntity;

  @ManyToOne(() => ReservationSlotEntity)
  @JoinColumn({ name: 'slot_id' })
  slot?: ReservationSlotEntity;
}
