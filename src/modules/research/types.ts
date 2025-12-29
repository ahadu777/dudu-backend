import { ResearchTopicStatus, ResearchQuestion } from './domain/research-topic.entity';
import { ReferenceType } from './domain/research-reference.entity';

// Re-export enums for convenience
export { ResearchTopicStatus, ResearchQuestion } from './domain/research-topic.entity';
export { ReferenceType } from './domain/research-reference.entity';

// ========== Topic Types ==========

export interface ResearchTopicDTO {
  id: number;
  topic: string;
  status: ResearchTopicStatus;
  synthesis_notes?: string;
  questions?: ResearchQuestion[];
  leads_to_memo?: string;
  memo_content?: string;
  started_at: string;
  created_at: string;
  updated_at: string;
  reference_count?: number;
}

export interface CreateTopicRequest {
  topic: string;
  started_at?: string; // ISO date, defaults to today
  synthesis_notes?: string;
  questions?: ResearchQuestion[];
}

export interface UpdateTopicRequest {
  topic?: string;
  status?: ResearchTopicStatus;
  synthesis_notes?: string;
  questions?: ResearchQuestion[];
  leads_to_memo?: string;
  memo_content?: string;
  started_at?: string;
}

export interface TopicFilters {
  status?: ResearchTopicStatus;
  limit?: number;
  offset?: number;
  sort?: string;
}

// ========== Reference Types ==========

export interface ResearchReferenceDTO {
  id: number;
  research_topic_id: number;
  type: ReferenceType;
  title: string;
  url?: string;
  directus_file_id?: string;
  notes?: string;
  reference_date?: string;
  created_at: string;
}

export interface CreateReferenceRequest {
  type: ReferenceType;
  title: string;
  url?: string;
  directus_file_id?: string;
  notes?: string;
  reference_date?: string; // ISO date
}

export interface UpdateReferenceRequest {
  type?: ReferenceType;
  title?: string;
  url?: string;
  directus_file_id?: string;
  notes?: string;
  reference_date?: string;
}

// ========== API Response Types ==========

export interface ResearchTopicResponse {
  success: boolean;
  data?: ResearchTopicDTO;
  error?: string;
}

export interface ResearchTopicListResponse {
  success: boolean;
  data?: ResearchTopicDTO[];
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}

export interface ResearchReferenceResponse {
  success: boolean;
  data?: ResearchReferenceDTO;
  error?: string;
}

export interface ResearchReferenceListResponse {
  success: boolean;
  data?: ResearchReferenceDTO[];
  error?: string;
}

export interface DeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}
