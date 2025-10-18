import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { AppError } from './errorHandler';

export const validateBody = (dtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dtoObject = plainToClass(dtoClass, req.body);
    const errors: ValidationError[] = await validate(dtoObject);

    if (errors.length > 0) {
      const messages = errors.map((error: ValidationError) => {
        return Object.values(error.constraints || {}).join(', ');
      });
      return next(new AppError(messages.join('; '), 400));
    }

    req.body = dtoObject;
    next();
  };
};

