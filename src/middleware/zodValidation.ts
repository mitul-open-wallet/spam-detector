import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const validateWithZod = (schema: z.ZodSchema) => {
    return (request: Request, response: Response, next: NextFunction) => {
        const result = schema.safeParse(request.body)

        if (result.success === false) {
            const errors = result.error.issues.map(issue => {
                const field = issue.path.length > 0 ? issue.path.join(",") : 'body'
                return `${field} ${issue.message}`
            })
            response.status(400).json({
                    error: 'Validation failed',
                    details: errors
            });
            return;
        }

        request.body = result.data;
        next()
    }
}

export default validateWithZod