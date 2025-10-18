import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the user
 *         email:
 *           type: string
 *           description: User's email address
 *         name:
 *           type: string
 *           description: User's full name
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
 *         name: John Doe
 *         age: 30
 *         isActive: true
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  age?: number;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

