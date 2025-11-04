import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Venue } from './venue.entity';

@Entity('venue_sessions')
export class VenueSession {
  @PrimaryGeneratedColumn()
  session_id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  session_code!: string; // UUID for session identification

  @Column({ type: 'int' })
  venue_id!: number;

  @Column({ type: 'int' })
  operator_id!: number; // Reference to operator/user

  @Column({ type: 'varchar', length: 100 })
  operator_name!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  terminal_device_id!: string; // Physical device identifier

  @Column({ type: 'datetime' })
  started_at!: Date;

  @Column({ type: 'datetime', nullable: true })
  ended_at!: Date;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string; // 'active', 'expired', 'ended'

  @Column({ type: 'int', default: 28800 }) // 8 hours in seconds
  session_duration_seconds!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Venue, venue => venue.sessions)
  @JoinColumn({ name: 'venue_id' })
  venue!: Venue;

  // Helper method to check if session is valid
  isValid(): boolean {
    if (this.status !== 'active') return false;

    const expiryTime = new Date(this.started_at.getTime() + (this.session_duration_seconds * 1000));
    return new Date() < expiryTime;
  }
}