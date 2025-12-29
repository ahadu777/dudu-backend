/**
 * Services 模块聚合导出
 */

// 指标计算服务
export {
  generateAutoActionItems,
  calculateProductionReadiness,
  type AutoActionItem,
  type ProductionReadiness
} from './metrics';

// 参考文档服务
export {
  getReferenceFilePurpose,
  getAllReferencePurposes
} from './reference-docs';

// Directus PRD 文档服务
export {
  fetchDirectusFiles,
  fetchFileMetadata,
  fetchFileContent,
  processPrdMarkdown,
  renderMetadataCard,
  processAndRenderMarkdown,
  type DirectusFile,
  type ProcessedMarkdown
} from './prd-docs';
