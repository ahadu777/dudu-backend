import { AppDataSource } from '../../config/database';
import { logger } from '../../utils/logger';
import { ResearchTopicEntity, ResearchTopicStatus } from './domain/research-topic.entity';
import { ResearchReferenceEntity } from './domain/research-reference.entity';
import {
  ResearchTopicDTO,
  ResearchReferenceDTO,
  CreateTopicRequest,
  UpdateTopicRequest,
  CreateReferenceRequest,
  UpdateReferenceRequest,
  TopicFilters
} from './types';

/**
 * Helper to format date - handles both Date objects and strings from MySQL
 */
function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  return value.toISOString().split('T')[0];
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.toISOString();
}

/**
 * Research Service
 * Handles CRUD operations for research topics and references
 */
export class ResearchService {
  private topicRepo = AppDataSource.getRepository(ResearchTopicEntity);
  private referenceRepo = AppDataSource.getRepository(ResearchReferenceEntity);

  constructor() {
    logger.info('research.service.initialized');
  }

  // ========== Topic Operations ==========

  /**
   * List topics with optional filters
   */
  async listTopics(filters: TopicFilters = {}): Promise<{ topics: ResearchTopicDTO[]; total: number }> {
    try {
      const qb = this.topicRepo.createQueryBuilder('topic')
        .leftJoin('topic.references', 'ref')
        .addSelect('COUNT(ref.id)', 'refCount')
        .groupBy('topic.id');

      if (filters.status) {
        qb.andWhere('topic.status = :status', { status: filters.status });
      }

      // Count total before pagination
      const countQb = this.topicRepo.createQueryBuilder('topic');
      if (filters.status) {
        countQb.andWhere('topic.status = :status', { status: filters.status });
      }
      const total = await countQb.getCount();

      // Apply sorting
      const sortField = filters.sort?.replace('-', '') || 'created_at';
      const sortOrder = filters.sort?.startsWith('-') ? 'DESC' : 'ASC';
      qb.orderBy(`topic.${sortField}`, sortOrder as 'ASC' | 'DESC');

      // Apply pagination
      qb.limit(filters.limit || 100);
      qb.offset(filters.offset || 0);

      const rawResults = await qb.getRawAndEntities();

      const topics: ResearchTopicDTO[] = rawResults.entities.map((entity, index) => ({
        id: Number(entity.id),
        topic: entity.topic,
        status: entity.status,
        synthesis_notes: entity.synthesis_notes,
        questions: entity.questions,
        leads_to_memo: entity.leads_to_memo,
        memo_content: entity.memo_content,
        started_at: formatDate(entity.started_at),
        created_at: formatDateTime(entity.created_at),
        updated_at: formatDateTime(entity.updated_at),
        reference_count: parseInt(rawResults.raw[index]?.refCount || '0', 10)
      }));

      logger.info('research.topics.list.success', { count: topics.length, total });

      return { topics, total };
    } catch (error: any) {
      logger.error('research.topics.list.failed', { error: error.message });
      throw new Error('Failed to fetch topics');
    }
  }

  /**
   * Get single topic by ID with references
   */
  async getTopic(id: number): Promise<ResearchTopicDTO | null> {
    try {
      const topic = await this.topicRepo.findOne({
        where: { id },
        relations: ['references']
      });

      if (!topic) {
        return null;
      }

      return {
        id: Number(topic.id),
        topic: topic.topic,
        status: topic.status,
        synthesis_notes: topic.synthesis_notes,
        questions: topic.questions,
        leads_to_memo: topic.leads_to_memo,
        memo_content: topic.memo_content,
        started_at: formatDate(topic.started_at),
        created_at: formatDateTime(topic.created_at),
        updated_at: formatDateTime(topic.updated_at),
        reference_count: topic.references?.length || 0
      };
    } catch (error: any) {
      logger.error('research.topics.get.failed', { id, error: error.message });
      throw new Error('Failed to fetch topic');
    }
  }

  /**
   * Create new topic
   */
  async createTopic(data: CreateTopicRequest): Promise<ResearchTopicDTO> {
    try {
      const topic = this.topicRepo.create({
        topic: data.topic,
        started_at: data.started_at ? new Date(data.started_at) : new Date(),
        synthesis_notes: data.synthesis_notes,
        questions: data.questions,
        status: ResearchTopicStatus.ACTIVE
      });

      const saved = await this.topicRepo.save(topic);

      logger.info('research.topics.create.success', { id: saved.id, topic: saved.topic });

      return {
        id: Number(saved.id),
        topic: saved.topic,
        status: saved.status,
        synthesis_notes: saved.synthesis_notes,
        questions: saved.questions,
        leads_to_memo: saved.leads_to_memo,
        memo_content: saved.memo_content,
        started_at: formatDate(saved.started_at),
        created_at: formatDateTime(saved.created_at),
        updated_at: formatDateTime(saved.updated_at),
        reference_count: 0
      };
    } catch (error: any) {
      logger.error('research.topics.create.failed', { error: error.message });
      throw new Error('Failed to create topic');
    }
  }

  /**
   * Update existing topic
   */
  async updateTopic(id: number, data: UpdateTopicRequest): Promise<ResearchTopicDTO> {
    try {
      const topic = await this.topicRepo.findOne({ where: { id } });

      if (!topic) {
        throw new Error('TOPIC_NOT_FOUND');
      }

      // Update fields
      if (data.topic !== undefined) topic.topic = data.topic;
      if (data.status !== undefined) topic.status = data.status;
      if (data.synthesis_notes !== undefined) topic.synthesis_notes = data.synthesis_notes;
      if (data.questions !== undefined) topic.questions = data.questions;
      if (data.leads_to_memo !== undefined) topic.leads_to_memo = data.leads_to_memo;
      if (data.memo_content !== undefined) topic.memo_content = data.memo_content;
      if (data.started_at !== undefined) topic.started_at = new Date(data.started_at);

      const saved = await this.topicRepo.save(topic);

      logger.info('research.topics.update.success', { id, fields: Object.keys(data) });

      return {
        id: Number(saved.id),
        topic: saved.topic,
        status: saved.status,
        synthesis_notes: saved.synthesis_notes,
        questions: saved.questions,
        leads_to_memo: saved.leads_to_memo,
        memo_content: saved.memo_content,
        started_at: formatDate(saved.started_at),
        created_at: formatDateTime(saved.created_at),
        updated_at: formatDateTime(saved.updated_at)
      };
    } catch (error: any) {
      logger.error('research.topics.update.failed', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Delete topic (cascades to references)
   */
  async deleteTopic(id: number): Promise<void> {
    try {
      const result = await this.topicRepo.delete(id);

      if (result.affected === 0) {
        throw new Error('TOPIC_NOT_FOUND');
      }

      logger.info('research.topics.delete.success', { id });
    } catch (error: any) {
      logger.error('research.topics.delete.failed', { id, error: error.message });
      throw error;
    }
  }

  // ========== Reference Operations ==========

  /**
   * List references for a topic
   */
  async listReferences(topicId: number): Promise<ResearchReferenceDTO[]> {
    try {
      const references = await this.referenceRepo.find({
        where: { research_topic_id: topicId },
        order: { created_at: 'DESC' }
      });

      return references.map(ref => ({
        id: Number(ref.id),
        research_topic_id: Number(ref.research_topic_id),
        type: ref.type,
        title: ref.title,
        url: ref.url,
        directus_file_id: ref.directus_file_id,
        notes: ref.notes,
        reference_date: formatDate(ref.reference_date) || undefined,
        created_at: formatDateTime(ref.created_at)
      }));
    } catch (error: any) {
      logger.error('research.references.list.failed', { topicId, error: error.message });
      throw new Error('Failed to fetch references');
    }
  }

  /**
   * Add reference to topic
   */
  async addReference(topicId: number, data: CreateReferenceRequest): Promise<ResearchReferenceDTO> {
    try {
      // Verify topic exists
      const topic = await this.topicRepo.findOne({ where: { id: topicId } });
      if (!topic) {
        throw new Error('TOPIC_NOT_FOUND');
      }

      const reference = this.referenceRepo.create({
        research_topic_id: topicId,
        type: data.type,
        title: data.title,
        url: data.url,
        directus_file_id: data.directus_file_id,
        notes: data.notes,
        reference_date: data.reference_date ? new Date(data.reference_date) : undefined
      });

      const saved = await this.referenceRepo.save(reference);

      logger.info('research.references.add.success', { topicId, id: saved.id, title: saved.title });

      return {
        id: Number(saved.id),
        research_topic_id: Number(saved.research_topic_id),
        type: saved.type,
        title: saved.title,
        url: saved.url,
        directus_file_id: saved.directus_file_id,
        notes: saved.notes,
        reference_date: formatDate(saved.reference_date) || undefined,
        created_at: formatDateTime(saved.created_at)
      };
    } catch (error: any) {
      logger.error('research.references.add.failed', { topicId, error: error.message });
      throw error;
    }
  }

  /**
   * Update reference
   */
  async updateReference(refId: number, data: UpdateReferenceRequest): Promise<ResearchReferenceDTO> {
    try {
      const reference = await this.referenceRepo.findOne({ where: { id: refId } });

      if (!reference) {
        throw new Error('REFERENCE_NOT_FOUND');
      }

      // Update fields
      if (data.type !== undefined) reference.type = data.type;
      if (data.title !== undefined) reference.title = data.title;
      if (data.url !== undefined) reference.url = data.url;
      if (data.directus_file_id !== undefined) reference.directus_file_id = data.directus_file_id;
      if (data.notes !== undefined) reference.notes = data.notes;
      if (data.reference_date !== undefined) reference.reference_date = data.reference_date ? new Date(data.reference_date) : undefined;

      const saved = await this.referenceRepo.save(reference);

      logger.info('research.references.update.success', { id: refId, fields: Object.keys(data) });

      return {
        id: Number(saved.id),
        research_topic_id: Number(saved.research_topic_id),
        type: saved.type,
        title: saved.title,
        url: saved.url,
        directus_file_id: saved.directus_file_id,
        notes: saved.notes,
        reference_date: formatDate(saved.reference_date) || undefined,
        created_at: formatDateTime(saved.created_at)
      };
    } catch (error: any) {
      logger.error('research.references.update.failed', { id: refId, error: error.message });
      throw error;
    }
  }

  /**
   * Delete reference
   */
  async deleteReference(refId: number): Promise<void> {
    try {
      const result = await this.referenceRepo.delete(refId);

      if (result.affected === 0) {
        throw new Error('REFERENCE_NOT_FOUND');
      }

      logger.info('research.references.delete.success', { id: refId });
    } catch (error: any) {
      logger.error('research.references.delete.failed', { id: refId, error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
export const researchService = new ResearchService();
