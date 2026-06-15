export type InsightStatus = 'healthy' | 'degraded' | 'critical';
export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

export type AiInsight = {
  headline: string;
  status: InsightStatus;
  observations: string[];
  recommendation: string;
  recordsAnalyzed: number;
  generatedAt: string;
  successRate: number;
  avgResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  recentAvgMs: number;
  olderAvgMs: number;
  trend: TrendDirection;
  failureCount: number;
  errorCodes: number[];
};
