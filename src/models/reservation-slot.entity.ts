import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type SlotStatus = 'ACTIVE' | 'FULL' | 'CLOSED';

@Entity('reservation_slots')
@Index(['date'])
@Index(['orq'])
@Index(['status'])
@Index(['date', 'start_time', 'orq'], { unique: true })
export class ReservationSlotEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'time' })
  start_time!: string;

  @Column({ type: 'time' })
  end_time!: string;

  @Column({ type: 'int', nullable: true, comment: 'Future: multi-venue support' })
  venue_id?: number;

  @Column({ type: 'int', default: 200 })
  total_capacity!: number;

  @Column({ type: 'int', default: 0 })
  booked_count!: number;

  // Note: TypeORM doesn't support MySQL STORED computed columns directly
  // We'll calculate available_count in the application layer
  // available_count = total_capacity - booked_count

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'FULL', 'CLOSED'],
    default: 'ACTIVE'
  })
  status!: SlotStatus;

  @Column({ type: 'int', comment: 'Organization ID' })
  orq!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Virtual property for available_count
  get available_count(): number {
    return this.total_capacity - this.booked_count;
  }

  // Helper method to determine capacity status
  get capacity_status(): 'AVAILABLE' | 'LIMITED' | 'FULL' {
    const percentage = this.booked_count / this.total_capacity;
    if (percentage >= 1.0) return 'FULL';
    if (percentage >= 0.5) return 'LIMITED';
    return 'AVAILABLE';
  }
}
