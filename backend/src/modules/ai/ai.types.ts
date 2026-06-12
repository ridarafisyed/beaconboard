export type InsightStatus = 'healthy' | 'degraded' | 'critical';

export type AiInsight = {
  headline: string;
  status: InsightStatus;
  observations: string[];
  recommendation: string;
  recordsAnalyzed: number;
  generatedAt: string;
};
