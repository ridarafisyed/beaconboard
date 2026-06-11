import type { NextFunction, Request, Response } from "express";

import { AppError } from '@/shared/errors/app-error.ts';

export const errorMiddleware = (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            message: error.message,
        });
        return;
    }

    res.status(500).json({
        message: 'Internal Server Error',
        error: error.message,
    });
};