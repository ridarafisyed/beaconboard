import type { NextFunction, Request, Response } from "express";

export const errorMiddleware = (
    error: Error, 
    _req: Request,
    res: Response, 
    _next: NextFunction
) => {
    res.status(500).json({
        message: 'Internal Server Error', 
        error: error.message,
    });
};