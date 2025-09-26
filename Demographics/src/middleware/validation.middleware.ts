import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validationMiddleware<T>(
  schema: ZodSchema<T>, 
  target: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = target === 'body' ? req.body : 
                  target === 'query' ? req.query : req.params;
      
      const validatedData = schema.parse(data);
      
      // Store validated data in a custom property
      (req as any).validatedData = (req as any).validatedData || {};
      (req as any).validatedData[target] = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            value: issue.code
          })),
          requestId: req.requestId,
        });
        return; // Prevent calling next(error) for validation errors
      }

      next(error);
    }
  };
}