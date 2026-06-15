import express, { Router } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

import { env } from '@/config/env.ts';
import aiRoutes from '@/modules/ai/ai.routes.ts';
import healthRoutes from '@/modules/health/health.routes.ts';
import monitoringRoutes from '@/modules/monitoring/monitoring.routes.ts';
import { notFoundMiddleware } from '@/shared/middlewares/not-found.middleware.ts';
import { errorMiddleware } from '@/shared/middlewares/error.middleware.ts';
import { swaggerSpec } from '@/config/swagger.ts';


const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());
app.get('/', (_req, res) => res.redirect('/api-docs'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/monitoring', monitoringRoutes);
apiRouter.use('/ai', aiRoutes);


app.use(`/api/${env.apiVersion}`, apiRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;