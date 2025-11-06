/**
 * Function Code Translation Layer
 * 
 * Maps product function codes to PRD-003 standard codes during scanning redemption.
 * This allows products to use different function codes while maintaining PRD-003 compatibility.
 */

/**
 * Translate product function code to PRD-003 standard code
 * 
 * @param productFunctionCode - Function code from product definition (e.g., 'ferry', 'monchhichi_gift')
 * @returns PRD-003 standard function code (e.g., 'ferry_boarding', 'gift_redemption')
 */
export function translateFunctionCode(productFunctionCode: string): string {
  const mapping: Record<string, string> = {
    // Ferry boarding mappings
    'ferry': 'ferry_boarding',
    'pet_ferry': 'ferry_boarding',
    'vip_ferry': 'ferry_boarding',
    
    // Gift redemption mappings
    'monchhichi_gift': 'gift_redemption',
    'monchhichi_gift_x2': 'gift_redemption',
    
    // Playground token mappings
    'playground_tokens': 'playground_token',
    'pet_playground': 'playground_token',
    
    // Tea set (location-specific, no translation needed)
    'tea_set': 'tea_set'
  };
  
  return mapping[productFunctionCode] || productFunctionCode;
}

/**
 * Check if function code requires location-specific validation
 */
export function requiresLocationValidation(functionCode: string): boolean {
  return functionCode === 'tea_set';
}

/**
 * Get required venue code for location-specific functions
 */
export function getRequiredVenueCode(functionCode: string): string | null {
  if (functionCode === 'tea_set') {
    return 'cheung-chau';
  }
  return null;
}


