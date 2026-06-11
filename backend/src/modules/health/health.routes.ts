import { Router } from "express";
import { getHealth } from "@/modules/health/health.controller.ts";

const routes = Router();

routes.get('/', getHealth);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is running
 */
export default routes; 
