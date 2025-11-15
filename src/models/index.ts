/**
 * Shared Domain Models
 *
 * This directory contains core entities used by multiple modules.
 *
 * Guidelines:
 * - Place entities here if used by 2+ modules
 * - Keep module-specific entities in modules slash star slash domain slash model
 */

// Export entities for TypeScript imports
export * from './user.entity';
export * from './ota-reseller.entity';
export * from './operator.entity';

// Export entity array for TypeORM registration
// This is the SINGLE SOURCE OF TRUTH for shared entities
import { UserEntity } from './user.entity';
import { OTAResellerEntity } from './ota-reseller.entity';
import { Operator } from './operator.entity';

export const SHARED_ENTITIES = [
  UserEntity,
  OTAResellerEntity,
  Operator,
  // Add more shared entities here as they are created
  // ProductEntity,
  // OrderEntity,
] as const;
