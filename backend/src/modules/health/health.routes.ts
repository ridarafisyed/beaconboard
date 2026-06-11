import { Router } from "express";
import { getHealth } from "@/modules/health/health.controler.ts";

const routes = Router();

routes.get('/', getHealth);

export default routes; 
