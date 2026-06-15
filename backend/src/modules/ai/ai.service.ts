import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RequestOptions } from '@google/generative-ai';

import { env } from '@/config/env.ts';
import { monitoringRepository } from '@/modules/monitoring/monitoring.repository.ts';
import { AppError } from '@/shared/errors/app-error.ts';
import type { AiInsight } from './ai.types.ts';

class AiService {
  // GEMINI_BASE_URL is "https://generativelanguage.googleapis.com/v1beta"
  // The SDK expects baseUrl (origin) and apiVersion (e.g. "v1beta") separately.
  private buildRequestOptions(): RequestOptions {
    if (!env.geminiBaseUrl) {
      console.debug('[AI] No GEMINI_BASE_URL set — using SDK default endpoint');
      return {};
    }
    try {
      const url = new URL(env.geminiBaseUrl);
      const versionMatch = url.pathname.match(/\/(v\d+(?:beta)?)\/?$/);
      const opts: RequestOptions = {
        baseUrl: url.origin,
        ...(versionMatch?.[1] ? { apiVersion: versionMatch[1] } : {}),
      };
      console.debug('[AI] Using custom base URL:', url.origin, '| apiVersion:', opts.apiVersion ?? '(sdk default)');
      return opts;
    } catch (err) {
      console.warn('[AI] GEMINI_BASE_URL is set but failed to parse:', env.geminiBaseUrl, err);
      return {};
    }
  }

  private getModel() {
    console.debug('[AI] GEMINI_API_KEY present:', !!env.geminiApiKey);
    console.debug('[AI] GEMINI_MODEL:', env.geminiModel);
    console.debug('[AI] GEMINI_BASE_URL:', env.geminiBaseUrl || '(not set)');

    if (!env.geminiApiKey) {
      console.error('[AI] Missing GEMINI_API_KEY — cannot initialise model');
      throw new AppError(503, 'AI insights are not configured. Set GEMINI_API_KEY to enable this feature.');
    }
    const requestOptions = this.buildRequestOptions();
    console.debug('[AI] Request options:', JSON.stringify(requestOptions));
    return new GoogleGenerativeAI(env.geminiApiKey).getGenerativeModel(
      { model: env.geminiModel },
      requestOptions
    );
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

    const model = this.getModel();
    console.debug('[AI] Sending prompt to Gemini (%d chars, %d records)', prompt.length, records.length);

    let result: Awaited<ReturnType<typeof model.generateContent>>;
    try {
      result = await model.generateContent(prompt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AI] Gemini API call failed:', msg);
      // Surface the raw error so it's visible in logs even if caught upstream
      console.error('[AI] Full error:', err);
      throw err;
    }

    console.debug('[AI] Gemini response received');

    // Strip markdown fences in case the model wraps the response
    const raw = result.response.text().trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '');

    console.debug('[AI] Raw response text:', raw);

    let parsed: Pick<AiInsight, 'headline' | 'status' | 'observations' | 'recommendation'>;
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      console.error('[AI] JSON parse failed. Raw text was:', raw);
      throw new AppError(500, 'AI returned an unexpected response format. Please try again.');
    }

    return {
      ...parsed,
      recordsAnalyzed: records.length,
      generatedAt: new Date().toISOString(),
      successRate,
      avgResponseTimeMs: avgMs,
      minResponseTimeMs: minMs,
      maxResponseTimeMs: maxMs,
      recentAvgMs: recentAvg,
      olderAvgMs: olderAvg,
      trend,
      failureCount: failures.length,
      errorCodes,
    };
  }
}

export const aiService = new AiService();
