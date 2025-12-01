import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { VenueSession } from './venue-session.entity';
import { RedemptionEvent } from './redemption-event.entity';

@Entity('venues')
export class Venue {
  @PrimaryGeneratedColumn()
  venue_id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  venue_code!: string; // 'central-pier', 'cheung-chau', 'gift-shop-central'

  @Column({ type: 'varchar', length: 200 })
  venue_name!: string; // 'Central Pier Terminal', 'Cheung Chau Terminal'

  @Column({ type: 'varchar', length: 50 })
  venue_type!: string; // 'ferry_terminal', 'gift_shop', 'playground'

  @Column({ type: 'varchar', length: 200, nullable: true })
  location_address!: string;

  @Column({ type: 'json', nullable: true })
  supported_functions!: string[]; // ['ferry_boarding', 'gift_redemption', 'playground_token']

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  partner_id!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @DeleteDateColumn()
  deleted_at!: Date | null;

  @OneToMany(() => VenueSession, session => session.venue)
  sessions!: VenueSession[];

  @OneToMany(() => RedemptionEvent, event => event.venue)
  redemption_events!: RedemptionEvent[];
}