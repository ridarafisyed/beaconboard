import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

import { errorMiddleware } from '@/shared/middlewares/error.middleware.ts';
import { AppError } from '@/shared/errors/app-error.ts';

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

const req = {} as Request;
const next = vi.fn() as NextFunction;

describe('errorMiddleware', () => {
  describe('AppError', () => {
    it('responds with the AppError statusCode', () => {
      const res = makeRes();
      errorMiddleware(new AppError(404, 'Not found'), req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('responds with the AppError message', () => {
      const res = makeRes();
      errorMiddleware(new AppError(404, 'Not found'), req, res, next);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not found' });
    });

    it('handles 422 Unprocessable Entity', () => {
      const res = makeRes();
      errorMiddleware(new AppError(422, 'Validation failed'), req, res, next);
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({ message: 'Validation failed' });
    });

    it('handles 401 Unauthorized', () => {
      const res = makeRes();
      errorMiddleware(new AppError(401, 'Unauthorized'), req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('generic Error', () => {
    it('responds with 500 for a plain Error', () => {
      const res = makeRes();
      errorMiddleware(new Error('Unexpected crash'), req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('uses "Internal Server Error" as the top-level message', () => {
      const res = makeRes();
      errorMiddleware(new Error('DB down'), req, res, next);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(body.message).toBe('Internal Server Error');
    });

    it('exposes the original error message in the error field', () => {
      const res = makeRes();
      errorMiddleware(new Error('Connection refused'), req, res, next);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(body.error).toBe('Connection refused');
    });
  });

  describe('AppError class', () => {
    it('has the correct name', () => {
      expect(new AppError(500, 'msg').name).toBe('AppError');
    });

    it('is an instance of Error', () => {
      expect(new AppError(400, 'bad')).toBeInstanceOf(Error);
    });

    it('exposes statusCode as a public property', () => {
      expect(new AppError(403, 'Forbidden').statusCode).toBe(403);
    });
  });
});
