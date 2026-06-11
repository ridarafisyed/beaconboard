import express, { Router } from 'express';
import cors from 'cors';

import { env } from '@/config/env.ts';
import healthRoutes from '@/modules/health/health.routes.ts';
import { notFountMiddleware } from '@/shared/middlewares/not-found.middleware.ts';
import { errorMiddleware } from '@/shared/middlewares/error.middleware.ts';

const app = express();

app.use(cors());
app.use(express.json());

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);

app.use(`/api/${env.apiVersion}`, apiRouter);

app.use(notFountMiddleware);
app.use(errorMiddleware);

export default app;