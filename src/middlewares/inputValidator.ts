/**
 * Input Validation Middleware
 * 
 * Validates and sanitizes user inputs to prevent XSS, injection attacks, and invalid data.
 * Applies to all POST/PUT/PATCH requests.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * HTML tag detection regex
 */
const HTML_TAG_REGEX = /<[^>]*>/g;

/**
 * String length limits
 */
const STRING_LIMITS: Record<string, number> = {
  customer_name: 200,
  batch_id: 100,
  email: 255,
  phone: 50,
  session_code: 100,
  terminal_device_id: 50,
  function_code: 50
};

/**
 * Sanitize string by removing HTML tags
 */
function sanitizeString(value: string): string {
  return value.replace(HTML_TAG_REGEX, '').trim();
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate integer (reject floats)
 */
function isValidInteger(value: any): boolean {
  return typeof value === 'number' && Number.isInteger(value) && !isNaN(value);
}

/**
 * Validate string length
 */
function isValidLength(field: string, value: string): boolean {
  const limit = STRING_LIMITS[field] || 1000; // Default limit
  return value.length <= limit;
}

/**
 * Check if string contains HTML tags
 */
function containsHtmlTags(value: string): boolean {
  return HTML_TAG_REGEX.test(value);
}

/**
 * Input validation middleware
 */
export function inputValidatorMiddleware(req: Request, res: Response, next: NextFunction) {
  const errors: ValidationError[] = [];

  // Only validate POST, PUT, PATCH requests
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Validate Content-Type for POST/PUT/PATCH
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Content-Type must be application/json'
      });
    }
  }

  // Validate request body
  if (req.body) {
    // Validate customer_details if present
    if (req.body.customer_details) {
      const { name, email, phone } = req.body.customer_details;

      if (name !== undefined) {
        if (typeof name !== 'string') {
          errors.push({ field: 'customer_details.name', message: 'Must be a string' });
        } else if (name.trim().length === 0) {
          errors.push({ field: 'customer_details.name', message: 'Cannot be empty' });
        } else if (containsHtmlTags(name)) {
          errors.push({ field: 'customer_details.name', message: 'HTML tags not allowed' });
        } else if (!isValidLength('customer_name', name)) {
          errors.push({ field: 'customer_details.name', message: `Exceeds maximum length of ${STRING_LIMITS.customer_name} characters` });
        } else {
          // Sanitize name
          req.body.customer_details.name = sanitizeString(name);
        }
      }

      if (email !== undefined) {
        if (typeof email !== 'string') {
          errors.push({ field: 'customer_details.email', message: 'Must be a string' });
        } else if (!isValidEmail(email)) {
          errors.push({ field: 'customer_details.email', message: 'Invalid email format' });
        } else if (!isValidLength('email', email)) {
          errors.push({ field: 'customer_details.email', message: `Exceeds maximum length of ${STRING_LIMITS.email} characters` });
        }
      }

      if (phone !== undefined && typeof phone === 'string' && !isValidLength('phone', phone)) {
        errors.push({ field: 'customer_details.phone', message: `Exceeds maximum length of ${STRING_LIMITS.phone} characters` });
      }
    }

    // Validate product_id (must be integer)
    if (req.body.product_id !== undefined) {
      if (!isValidInteger(req.body.product_id)) {
        errors.push({ field: 'product_id', message: 'Must be an integer' });
      }
    }

    // Validate quantity (must be integer)
    if (req.body.quantity !== undefined) {
      if (!isValidInteger(req.body.quantity)) {
        errors.push({ field: 'quantity', message: 'Must be an integer' });
      }
    }

    // Validate batch_id
    if (req.body.batch_id !== undefined) {
      if (typeof req.body.batch_id !== 'string') {
        errors.push({ field: 'batch_id', message: 'Must be a string' });
      } else if (containsHtmlTags(req.body.batch_id)) {
        errors.push({ field: 'batch_id', message: 'HTML tags not allowed' });
      } else if (!isValidLength('batch_id', req.body.batch_id)) {
        errors.push({ field: 'batch_id', message: `Exceeds maximum length of ${STRING_LIMITS.batch_id} characters` });
      } else {
        req.body.batch_id = sanitizeString(req.body.batch_id);
      }
    }

    // Validate function_code
    if (req.body.function_code !== undefined) {
      if (typeof req.body.function_code !== 'string') {
        errors.push({ field: 'function_code', message: 'Must be a string' });
      } else if (!isValidLength('function_code', req.body.function_code)) {
        errors.push({ field: 'function_code', message: `Exceeds maximum length of ${STRING_LIMITS.function_code} characters` });
      }
    }

    // Validate session_code
    if (req.body.session_code !== undefined) {
      if (typeof req.body.session_code !== 'string') {
        errors.push({ field: 'session_code', message: 'Must be a string' });
      } else if (!isValidLength('session_code', req.body.session_code)) {
        errors.push({ field: 'session_code', message: `Exceeds maximum length of ${STRING_LIMITS.session_code} characters` });
      }
    }

    // Validate operator_name
    if (req.body.operator_name !== undefined) {
      if (typeof req.body.operator_name !== 'string') {
        errors.push({ field: 'operator_name', message: 'Must be a string' });
      } else if (req.body.operator_name.trim().length === 0) {
        errors.push({ field: 'operator_name', message: 'Cannot be empty' });
      } else if (containsHtmlTags(req.body.operator_name)) {
        errors.push({ field: 'operator_name', message: 'HTML tags not allowed' });
      } else if (!isValidLength('customer_name', req.body.operator_name)) {
        errors.push({ field: 'operator_name', message: `Exceeds maximum length of ${STRING_LIMITS.customer_name} characters` });
      } else {
        // Sanitize operator_name
        req.body.operator_name = sanitizeString(req.body.operator_name);
      }
    }
  }

  // Return validation errors if any
  if (errors.length > 0) {
    logger.warn('input.validation.failed', {
      path: req.path,
      method: req.method,
      errors
    });

    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Input validation failed',
      errors
    });
  }

  next();
}

/**
 * JSON parsing error handler middleware
 * Must be added before routes
 */
export function jsonErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn('json.parse.error', {
      path: req.path,
      method: req.method,
      error: err.message
    });

    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'Invalid JSON format'
    });
  }
  next(err);
}

