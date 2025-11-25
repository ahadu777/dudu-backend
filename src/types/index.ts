/**
 * Type Exports - Single Source of Truth
 * 
 * This file exports TypeORM entities as the primary source of truth for types.
 * Domain-specific types that don't map to entities remain in domain.ts.
 * 
 * Migration Guide:
 * - Import from this file for entity types: import { User, Operator } from '../types'
 * - Import from domain.ts for domain-specific types: import { OrderStatus, TicketStatus } from '../types/domain'
 */

// Export TypeORM entities as primary types
export { UserEntity as User } from '../models/user.entity';
export { Operator } from '../models/operator.entity';
export { OTAResellerEntity as OTAReseller } from '../models/ota-reseller.entity';

// Re-export domain types that don't have entity equivalents
export * from './domain';

