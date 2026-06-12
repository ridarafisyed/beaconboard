import Anthropic from '@anthropic-ai/sdk';

import { env } from '@/config/env.ts';
import { monitoringRepository } from '@/modules/monitoring/monitoring.repository.ts';
import { AppError } from '@/shared/errors/app-error.ts';
import type { AiInsight } from './ai.types.ts';

const MODEL = 'claude-haiku-4-5-20251001';

class AiService {
  private getClient(): Anthropic {
    if (!env.anthropicApiKey) {
      throw new AppError(503, 'AI insights are not configured. Set ANTHROPIC_API_KEY to enable this feature.');
    }
    return new Anthropic({ apiKey: env.anthropicApiKey });
  }

  async generateInsights(limit = 50): Promise<AiInsight> {
    const { records } = await monitoringRepository.getHistory(limit, 0);

    if (records.length < 3) {
      throw new AppError(422, 'Not enough data yet. Trigger a few pings first.');
    }

    const successCount = records.filter((r) => r.statusCode >= 200 && r.statusCode < 300).length;
    const successRate = Math.round((successCount / records.length) * 100);
    const avgMs = Math.round(records.reduce((s, r) => s + r.responseTimeMs, 0) / records.length);
    const minMs = Math.min(...records.map((r) => r.responseTimeMs));
    const maxMs = Math.max(...records.map((r) => r.responseTimeMs));

    // Compare newest half vs oldest half to detect trends
    const half = Math.floor(records.length / 2);
    const recentAvg = Math.round(records.slice(0, half).reduce((s, r) => s + r.responseTimeMs, 0) / half);
    const olderAvg = Math.round(records.slice(half).reduce((s, r) => s + r.responseTimeMs, 0) / half);
    const trend =
      recentAvg > olderAvg * 1.1
        ? 'increasing'
        : recentAvg < olderAvg * 0.9
          ? 'decreasing'
          : 'stable';

    const failures = records.filter((r) => r.statusCode < 200 || r.statusCode >= 300);
    const errorCodes = [...new Set(failures.map((r) => r.statusCode))];

    const eventBreakdown = records.reduce<Record<string, number>>((acc, r) => {
      acc[r.eventType] = (acc[r.eventType] ?? 0) + 1;
      return acc;
    }, {});

    const recentRows = records
      .slice(0, 10)
      .map((r) => `  ${new Date(r.createdAt).toISOString()} | ${r.statusCode} | ${r.responseTimeMs}ms | ${r.eventType}`)
      .join('\n');

    const prompt = `You are an HTTP monitoring analyst. Analyze the following data and return structured insights.

SUMMARY (last ${records.length} pings):
- Success rate: ${successRate}%
- Avg / Min / Max response time: ${avgMs}ms / ${minMs}ms / ${maxMs}ms
- Response time trend: ${trend} (recent ${recentAvg}ms vs older ${olderAvg}ms)
- Failures: ${failures.length} (codes seen: ${errorCodes.join(', ') || 'none'})
- Event breakdown: ${JSON.stringify(eventBreakdown)}

LAST 10 PINGS (newest first):
${recentRows}

Reply with ONLY a valid JSON object, no markdown fences, no extra text:
{
  "headline": "One concise sentence summarising overall health",
  "status": "healthy" | "degraded" | "critical",
  "observations": ["up to 3 specific, data-driven observations under 20 words each"],
  "recommendation": "One specific, actionable recommendation"
}

Status rules: healthy = success rate >= 90%; degraded = 70–89%; critical = < 70%.`;

    const client = this.getClient();

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';

    let parsed: Omit<AiInsight, 'recordsAnalyzed' | 'generatedAt'>;
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      throw new AppError(500, 'AI returned an unexpected response format. Please try again.');
    }

    return {
      ...parsed,
      recordsAnalyzed: records.length,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const aiService = new AiService();
