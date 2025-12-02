import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Venue } from './venue.entity';

@Entity('redemption_events')
@Index('idx_redemption_jti', ['jti']) // Fast JTI lookup
@Index('idx_redemption_venue_time', ['venue_id', 'redeemed_at'])
@Index('idx_redemption_ticket', ['ticket_code', 'function_code'])
@Index('idx_redemption_success_unique', ['success_unique_key'], { unique: true }) // Only success records have unique constraint
export class RedemptionEvent {
  @PrimaryGeneratedColumn()
  event_id!: number;

  @Column({ type: 'varchar', length: 100 })
  ticket_code!: string; // e.g., 'TIK-USR123-106'

  @Column({ type: 'varchar', length: 50 })
  function_code!: string; // 'ferry_boarding', 'gift_redemption', 'playground_token'

  @Column({ type: 'int' })
  venue_id!: number;

  @Column({ type: 'int' })
  operator_id!: number;

  @Column({ type: 'varchar', length: 100 })
  session_code!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  terminal_device_id!: string;

  @Column({ type: 'varchar', length: 36 })
  jti!: string; // JWT Token ID

  @Column({ type: 'varchar', length: 100, nullable: true })
  success_unique_key!: string | null; // Only set for success: `${jti}_${function_code}`, NULL for reject (allows duplicates)

  @Column({ type: 'varchar', length: 20 })
  result!: string; // 'success', 'reject'

  @Column({ type: 'varchar', length: 100, nullable: true })
  reason!: string; // For rejections: 'TOKEN_EXPIRED', 'ALREADY_REDEEMED', etc.

  @Column({ type: 'int', nullable: true })
  remaining_uses_after!: number; // For tracking entitlement usage

  @Column({ type: 'datetime' })
  redeemed_at!: Date;

  @Column({ type: 'json', nullable: true })
  additional_data!: Record<string, any>; // For analytics, debugging

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Venue, venue => venue.redemption_events)
  @JoinColumn({ name: 'venue_id' })
  venue!: Venue;

  // Helper methods for PRD-003 analytics
  isSuccess(): boolean {
    return this.result === 'success';
  }

  isFraudAttempt(): boolean {
    return this.reason === 'ALREADY_REDEEMED' || this.reason === 'DUPLICATE_JTI';
  }

  isMultiFunction(): boolean {
    // Check if this ticket has multiple function types in same session
    return ['ferry_boarding', 'gift_redemption', 'playground_token'].includes(this.function_code);
  }
}