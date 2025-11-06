/**
 * Function Type System for PRD-003 Multi-Function Package Validation
 * 
 * Defines how different function codes behave during redemption:
 * - UNLIMITED: Always allowed, never decrements (ferry boarding)
 * - SINGLE_USE: Check redemption history, not remaining_uses (gift redemption)
 * - COUNTED: Decrement remaining_uses (playground tokens)
 */

export enum FunctionType {
  UNLIMITED = 'unlimited',    // ferry_boarding - always allowed, never decrements
  SINGLE_USE = 'single_use',  // gift_redemption - check redemption history, not remaining_uses
  COUNTED = 'counted'         // playground_token - decrement remaining_uses
}

/**
 * Maps function codes to their behavior type
 * Supports both product function codes and PRD-003 standard codes
 */
export const FUNCTION_TYPE_MAP: Record<string, FunctionType> = {
  // Ferry boarding (unlimited)
  'ferry': FunctionType.UNLIMITED,
  'ferry_boarding': FunctionType.UNLIMITED,
  'pet_ferry': FunctionType.UNLIMITED,
  'vip_ferry': FunctionType.UNLIMITED,
  
  // Gift redemption (single use)
  'monchhichi_gift': FunctionType.SINGLE_USE,
  'gift_redemption': FunctionType.SINGLE_USE,
  'monchhichi_gift_x2': FunctionType.SINGLE_USE,
  
  // Playground tokens (counted)
  'playground_tokens': FunctionType.COUNTED,
  'playground_token': FunctionType.COUNTED,
  'pet_playground': FunctionType.COUNTED,
  
  // Tea set (location-specific, counted)
  'tea_set': FunctionType.COUNTED
};

/**
 * Get function type for a given function code
 */
export function getFunctionType(functionCode: string): FunctionType {
  return FUNCTION_TYPE_MAP[functionCode] || FunctionType.COUNTED; // Default to COUNTED for safety
}

/**
 * Check if function type is unlimited
 */
export function isUnlimited(functionCode: string): boolean {
  return getFunctionType(functionCode) === FunctionType.UNLIMITED;
}

/**
 * Check if function type is single use
 */
export function isSingleUse(functionCode: string): boolean {
  return getFunctionType(functionCode) === FunctionType.SINGLE_USE;
}

/**
 * Check if function type is counted
 */
export function isCounted(functionCode: string): boolean {
  return getFunctionType(functionCode) === FunctionType.COUNTED;
}


