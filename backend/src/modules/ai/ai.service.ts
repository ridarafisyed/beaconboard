import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RequestOptions } from '@google/generative-ai';

import { env } from '@/config/env.ts';
import { monitoringRepository } from '@/modules/monitoring/monitoring.repository.ts';
import { AppError } from '@/shared/errors/app-error.ts';
import type { AiInsight, RateLimitInfo, TokenUsage } from './ai.types.ts';

// ── Rate limiting ─────────────────────────────────────────────────────────────
const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour sliding window
const callLog: number[] = [];

// ── Response cache ────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cache: { insight: AiInsight; cachedAt: number } | null = null;

// ── Gemini pricing (gemini-2.0-flash-lite, per million tokens) ────────────────
const PRICE_PER_M_INPUT = 0.075;
const PRICE_PER_M_OUTPUT = 0.30;

function getRateLimitInfo(): RateLimitInfo {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  while (callLog.length > 0 && callLog[0]! < cutoff) callLog.shift();
  return {
    used: callLog.length,
    remaining: Math.max(0, RATE_LIMIT - callLog.length),
    limit: RATE_LIMIT,
    resetAt: callLog.length > 0 ? new Date(callLog[0]! + WINDOW_MS).toISOString() : null,
  };
}

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

  getRateLimitStatus(): RateLimitInfo {
    return getRateLimitInfo();
  }

  async generateInsights(limit = 50): Promise<AiInsight> {
    // ── 1. Serve from cache if still fresh ──────────────────────────────────
    if (cache && Date.now() - cache.cachedAt < CACHE_TTL_MS) {
      const ageS = Math.round((Date.now() - cache.cachedAt) / 1000);
      console.debug('[AI] Cache hit (age: %ds) — skipping API call', ageS);
      return { ...cache.insight, fromCache: true, rateLimit: getRateLimitInfo() };
    }

    // ── 2. Rate limit check ─────────────────────────────────────────────────
    const info = getRateLimitInfo();
    if (info.remaining === 0) {
      console.warn('[AI] Rate limit reached (%d/%d used)', info.used, info.limit);
      // Return stale cache rather than blocking the user entirely
      if (cache) {
        console.warn('[AI] Returning stale cache as fallback');
        return { ...cache.insight, fromCache: true, rateLimit: info };
      }
      throw new AppError(
        429,
        `Rate limit reached: max ${RATE_LIMIT} AI requests per hour. Try again after ${info.resetAt}.`
      );
    }

    // Consume one slot
    callLog.push(Date.now());
    const rateLimit = getRateLimitInfo();

    // ── 3. Compute stats ────────────────────────────────────────────────────
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
      recentAvg > olderAvg * 1.1 ? 'increasing'
      : recentAvg < olderAvg * 0.9 ? 'decreasing'
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

    // ── 4. Count tokens before calling ─────────────────────────────────────
    const model = this.getModel();
    let inputTokens = 0;
    try {
      const tokenResult = await model.countTokens(prompt);
      inputTokens = tokenResult.totalTokens;
      console.debug('[AI] Input tokens: %d (est. cost: $%s)', inputTokens, ((inputTokens / 1_000_000) * PRICE_PER_M_INPUT).toFixed(6));
    } catch {
      console.debug('[AI] Token counting unavailable — using character estimate');
      inputTokens = Math.ceil(prompt.length / 4);
    }

    // ── 5. Call Gemini ──────────────────────────────────────────────────────
    console.debug('[AI] Sending prompt to Gemini (%d chars, %d records)', prompt.length, records.length);

    let result: Awaited<ReturnType<typeof model.generateContent>>;
    try {
      result = await model.generateContent(prompt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AI] Gemini API call failed:', msg);
      console.error('[AI] Full error:', err);

      // Fallback: return stale cache on quota/availability errors
      if (cache && (msg.includes('429') || msg.includes('503'))) {
        console.warn('[AI] Returning stale cache as fallback due to API error');
        return { ...cache.insight, fromCache: true, rateLimit };
      }
      throw err;
    }

    console.debug('[AI] Gemini response received');

    // ── 6. Parse response ───────────────────────────────────────────────────
    const outputText = result.response.text().trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '');

    console.debug('[AI] Raw response text:', outputText);

    let parsed: Pick<AiInsight, 'headline' | 'status' | 'observations' | 'recommendation'>;
    try {
      parsed = JSON.parse(outputText) as typeof parsed;
    } catch {
      console.error('[AI] JSON parse failed. Raw text was:', outputText);
      throw new AppError(500, 'AI returned an unexpected response format. Please try again.');
    }

    // ── 7. Compute cost ─────────────────────────────────────────────────────
    const outputTokens =
      result.response.usageMetadata?.candidatesTokenCount ??
      Math.ceil(outputText.length / 4);

    const tokenUsage: TokenUsage = {
      inputTokens,
      outputTokens,
      estimatedCostUsd:
        Math.round(
          ((inputTokens / 1_000_000) * PRICE_PER_M_INPUT +
            (outputTokens / 1_000_000) * PRICE_PER_M_OUTPUT) *
            1_000_000
        ) / 1_000_000,
    };

    console.debug('[AI] Token usage:', tokenUsage);

    // ── 8. Build and cache result ───────────────────────────────────────────
    const insight: AiInsight = {
      ...parsed,
      recordsAnalyzed: records.length,
      generatedAt: new Date().toISOString(),
      fromCache: false,
      successRate,
      avgResponseTimeMs: avgMs,
      minResponseTimeMs: minMs,
      maxResponseTimeMs: maxMs,
      recentAvgMs: recentAvg,
      olderAvgMs: olderAvg,
      trend,
      failureCount: failures.length,
      errorCodes,
      tokenUsage,
      rateLimit,
    };

    cache = { insight, cachedAt: Date.now() };

    return insight;
  }
}

export const aiService = new AiService();

// Reset module-level state between test runs — not part of the public API
export const _resetForTesting = () => {
  callLog.length = 0;
  cache = null;
};
