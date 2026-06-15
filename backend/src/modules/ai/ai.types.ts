export type InsightStatus = 'healthy' | 'degraded' | 'critical';
export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

export type RateLimitInfo = {
  used: number;
  remaining: number;
  limit: number;
  resetAt: string | null;
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

export type AiInsight = {
  headline: string;
  status: InsightStatus;
  observations: string[];
  recommendation: string;
  recordsAnalyzed: number;
  generatedAt: string;
  fromCache: boolean;
  // computed metrics (for charts)
  successRate: number;
  avgResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  recentAvgMs: number;
  olderAvgMs: number;
  trend: TrendDirection;
  failureCount: number;
  errorCodes: number[];
  // cost & quota
  tokenUsage: TokenUsage;
  rateLimit: RateLimitInfo;
};
