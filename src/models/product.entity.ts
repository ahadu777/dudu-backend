import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
import { ProductInventoryEntity } from './product-inventory.entity';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_price!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  weekend_premium?: number;

  @Column({ type: 'json', nullable: true })
  customer_discounts?: Record<string, number>;

  @Column({ type: 'enum', enum: ['active', 'inactive'] })
  status!: 'active' | 'inactive';

  @Column({ type: 'varchar', length: 50 })
  category!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url?: string;

  @Column({ type: 'json', nullable: true })
  entitlements?: Array<{
    type: string;
    description: string;
    metadata?: Record<string, any>;
  }>;

  @Column({ type: 'json', nullable: true })
  qr_config?: {
    dark_color?: string;   // QR foreground color (default: #CC0000)
    light_color?: string;  // QR background color (default: #FFFFFF)
    logo_url?: string;     // Optional logo overlay URL
  };

  @OneToMany(() => ProductInventoryEntity, inventory => inventory.product)
  inventory!: ProductInventoryEntity[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
