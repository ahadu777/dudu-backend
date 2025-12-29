/**
 * Shared Domain Models
 *
 * This directory contains core entities used by multiple modules.
 *
 * Guidelines:
 * - Place entities here if used by 2+ modules
 * - Keep module-specific entities in modules/{name}/domain/
 */

// Export entities for TypeScript imports
export * from './user.entity';
export * from './ota-reseller.entity';
export * from './operator.entity';
export * from './order.entity';
export * from './order-payment.entity';
export * from './ticket.entity';
export * from './reservation-slot.entity';
export * from './ticket-reservation.entity';
export * from './product.entity';
export * from './product-inventory.entity';
export * from './qa-verification-record.entity';

// Export entity array for TypeORM registration
// This is the SINGLE SOURCE OF TRUTH for shared entities
import { UserEntity } from './user.entity';
import { OTAResellerEntity } from './ota-reseller.entity';
import { Operator } from './operator.entity';
import { OrderEntity } from './order.entity';
import { OrderPaymentEntity } from './order-payment.entity';
import { TicketEntity } from './ticket.entity';
import { ReservationSlotEntity } from './reservation-slot.entity';
import { TicketReservationEntity } from './ticket-reservation.entity';
import { ProductEntity } from './product.entity';
import { ProductInventoryEntity } from './product-inventory.entity';
import { QaVerificationRecordEntity } from './qa-verification-record.entity';

export const SHARED_ENTITIES = [
  UserEntity,
  OTAResellerEntity,
  Operator,
  OrderEntity,
  OrderPaymentEntity,
  TicketEntity,
  ReservationSlotEntity,
  TicketReservationEntity,
  ProductEntity,
  ProductInventoryEntity,
  QaVerificationRecordEntity,
] as const;
