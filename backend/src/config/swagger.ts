import swaggerJsdoc from 'swagger-jsdoc';

import { env } from './env.ts';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PulseWatch API',
      version: '1.0.0',
      description: 'Real-time HTTP monitoring API',
    },
    servers: [
      {
        url: `http://localhost:${env.port}/api/${env.apiVersion}`,
        description: 'Local server',
      },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts'],
});