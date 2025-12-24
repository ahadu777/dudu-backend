import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index
} from 'typeorm';
import { ResearchReferenceEntity } from './research-reference.entity';

/**
 * 研究主题状态
 */
export enum ResearchTopicStatus {
  ACTIVE = 'active',           // 进行中
  SYNTHESIZING = 'synthesizing', // 综合整理中
  DONE = 'done',               // 已完成（生成 Memo）
  ARCHIVED = 'archived'        // 已归档
}

/**
 * 待解答问题
 */
export interface ResearchQuestion {
  text: string;
  answered: boolean;
}

/**
 * 研究主题实体
 *
 * 用于整理来自多个外部来源的研究资料
 * - ChatGPT/Claude 对话导出到 Notion
 * - 微信/WhatsApp 截图
 * - 会议笔记
 */
@Entity('research_topics')
@Index(['status'])
@Index(['started_at'])
@Index(['leads_to_memo'])
export class ResearchTopicEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  // 研究主题
  @Column({ type: 'varchar', length: 255 })
  topic!: string;

  // 状态
  @Column({ type: 'enum', enum: ResearchTopicStatus, default: ResearchTopicStatus.ACTIVE })
  status!: ResearchTopicStatus;

  // 综合笔记（Markdown）
  @Column({ type: 'text', nullable: true })
  synthesis_notes?: string;

  // 待解答问题列表
  @Column({ type: 'json', nullable: true })
  questions?: ResearchQuestion[];

  // 关联 Memo ID (如 MEMO-001)
  @Column({ type: 'varchar', length: 50, nullable: true })
  leads_to_memo?: string;

  // Memo 内容（文本形式存储）
  @Column({ type: 'text', nullable: true })
  memo_content?: string;

  // 开始日期
  @Column({ type: 'date' })
  started_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // 关联参考资料
  @OneToMany(() => ResearchReferenceEntity, reference => reference.topic)
  references?: ResearchReferenceEntity[];
}
