import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the user
 *         email:
 *           type: string
 *           description: User's email address (required for email auth)
 *         wechat_openid:
 *           type: string
 *           description: WeChat openid (required for WeChat auth)
 *         phone:
 *           type: string
 *           description: User's phone number (E.164 format)
 *         name:
 *           type: string
 *           description: User's full name
 *         auth_type:
 *           type: string
 *           enum: [email, wechat]
 *           description: Authentication source
 *         wechat_extra:
 *           type: object
 *           description: Additional WeChat user data
 *           properties:
 *             nickname:
 *               type: string
 *             gender:
 *               type: integer
 *             city:
 *               type: string
 *             country:
 *               type: string
 *             province:
 *               type: string
 *             phone_country_code:
 *               type: string
 *         age:
 *           type: integer
 *           description: User's age
 *         isActive:
 *           type: boolean
 *           description: User's active status
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the user was last updated
 *       example:
 *         id: 1
 *         email: john.doe@example.com
 *         wechat_openid: oABC123xyz456
 *         phone: "+8613800138000"
 *         name: John Doe
 *         auth_type: wechat
 *         age: 30
 *         isActive: true
 */
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, nullable: true, default: null })
  email?: string;

  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  wechat_openid?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', length: 20, default: 'email' })
  auth_type!: string; // 'email' | 'wechat'

  @Column({ type: 'json', nullable: true })
  wechat_extra?: {
    nickname?: string;
    gender?: number; // 0: unknown, 1: male, 2: female
    city?: string;
    country?: string;
    province?: string;
    phone_country_code?: string;
  };

  @Column({ nullable: true })
  age?: number;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
