import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import type { ServerDB } from '../storage/db.js';

const router = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_TIMEOUT_MS = 10_000;

// ── Known issues fallback (mirrors cli/src/classifiers/types.ts) ──

const KNOWN_ISSUES: Record<string, {
  verdict: string;
  status: string;
  cves: string[];
  size: string;
  alternative: { name: string; reason: string } | null;
  summary: string;
}> = {
  'moment': {
    verdict: 'SWITCH',
    status: 'DEPRECATED',
    cves: [],
    size: '290KB minified',
    alternative: { name: 'date-fns', reason: '12KB, tree-shakeable, actively maintained' },
    summary: 'moment.js is deprecated since 2020. Use date-fns or dayjs instead.',
  },
  'request': {
    verdict: 'SWITCH',
    status: 'DEPRECATED',
    cves: [],
    size: '200KB+',
    alternative: { name: 'undici', reason: 'Built into Node.js, fast, maintained by Node core team' },
    summary: 'request is fully deprecated since Feb 2020. Use undici or native fetch.',
  },
  'lodash': {
    verdict: 'CAUTION',
    status: 'ACTIVE',
    cves: [],
    size: '72KB min+gzip',
    alternative: { name: 'lodash-es', reason: 'Tree-shakeable, same API' },
    summary: 'Full lodash is 72KB min+gzip. Most projects use <5 functions. Consider lodash-es or individual packages.',
  },
  'axios': {
    verdict: 'CAUTION',
    status: 'ACTIVE',
    cves: [],
    size: '29KB min+gzip',
    alternative: { name: 'native fetch', reason: 'Built into Node 18+, zero dependency' },
    summary: 'Native fetch is available in Node 18+. Axios adds unnecessary dependency for simple HTTP calls.',
  },
  'jsonwebtoken': {
    verdict: 'SWITCH',
    status: 'VULNERABILITY',
    cves: ['CVE-2024-33663'],
    size: '12KB',
    alternative: { name: 'jose', reason: 'Standards-compliant, no algorithm confusion vulnerability' },
    summary: 'CVE-2024-33663: algorithm confusion vulnerability. Switch to jose.',
  },
  'puppeteer': {
    verdict: 'CAUTION',
    status: 'ACTIVE',
    cves: [],
    size: '~280MB (includes Chromium)',
    alternative: { name: 'playwright', reason: 'Smaller install, multi-browser support' },
    summary: 'Downloads Chromium binary (~280MB). Consider playwright for smaller installs.',
  },
  'body-parser': {
    verdict: 'SWITCH',
    status: 'DEPRECATED',
    cves: [],
    size: '20KB',
    alternative: { name: 'express.json()', reason: 'Built into Express 4.16+, no extra install needed' },
    summary: 'body-parser is built into Express 4.16+. Separate install is unnecessary.',
  },
};

// ── Validation schema ──

const EvaluateBodySchema = z.object({
  packageName: z.string().min(1).max(200),
  packageManager: z.enum(['npm', 'pip', 'cargo', 'go', 'gem']),
  command: z.string().min(1).max(500),
});

// ── Gemini call ──

interface GeminiEvaluation {
  packageName: string;
  verdict: string;
  status: string;
  cves: string[];
  size: string;
  alternative: { name: string; reason: string } | null;
  summary: string;
}

async function callGemini(packageName: string, packageManager: string, command: string): Promise<GeminiEvaluation> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `You are a package security and quality evaluator. Analyze this package installation:

Package: ${packageName}
Package Manager: ${packageManager}
Command: ${command}

Research this package using web search and provide:
1. Current maintenance status (ACTIVE, DEPRECATED, UNMAINTAINED, ARCHIVED)
2. Known CVEs (list CVE IDs)
3. Approximate install/bundle size
4. Download trend (growing, stable, declining)
5. 1-2 better alternatives if any exist
6. Verdict: PROCEED (safe to install), CAUTION (works but has concerns), or SWITCH (should use alternative)

Respond in this exact JSON format:
{
  "packageName": "${packageName}",
  "verdict": "PROCEED|CAUTION|SWITCH",
  "status": "ACTIVE|DEPRECATED|UNMAINTAINED|ARCHIVED",
  "cves": ["CVE-XXXX-XXXXX"],
  "size": "approximate size",
  "alternative": {"name": "package-name", "reason": "why it's better"} or null,
  "summary": "One sentence summary of the evaluation."
}

Return ONLY the JSON object, no markdown or other text.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty Gemini response');
    }

    // Extract JSON from response (may be wrapped in ```json blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeminiEvaluation;

    // Normalize verdict
    if (!['PROCEED', 'CAUTION', 'SWITCH'].includes(parsed.verdict)) {
      parsed.verdict = 'PROCEED';
    }

    return {
      packageName: parsed.packageName ?? packageName,
      verdict: parsed.verdict,
      status: parsed.status ?? 'UNKNOWN',
      cves: Array.isArray(parsed.cves) ? parsed.cves : [],
      size: parsed.size ?? 'unknown',
      alternative: parsed.alternative ?? null,
      summary: parsed.summary ?? `Evaluated ${packageName}.`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ── POST /evaluate ──

router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user!;
    const db = req.app.get('db') as ServerDB;

    const body = EvaluateBodySchema.parse(req.body);

    let evaluation: GeminiEvaluation;
    let source = 'gemini';

    try {
      evaluation = await callGemini(body.packageName, body.packageManager, body.command);
    } catch (err) {
      // Fall back to known issues
      console.warn('Gemini evaluation failed, using fallback:', err instanceof Error ? err.message : String(err));

      const known = KNOWN_ISSUES[body.packageName.toLowerCase()];
      if (known) {
        evaluation = { ...known, packageName: body.packageName };
        source = 'known_issues';
      } else {
        evaluation = {
          packageName: body.packageName,
          verdict: 'PROCEED',
          status: 'UNKNOWN',
          cves: [],
          size: 'unknown',
          alternative: null,
          summary: `Could not evaluate ${body.packageName}. Proceeding with install.`,
        };
        source = 'fallback';
      }
    }

    // Log to DB
    try {
      db.insertEvaluation(
        user.id,
        body.packageName,
        body.packageManager,
        body.command,
        evaluation.verdict,
        JSON.stringify({ ...evaluation, source }),
      );
    } catch (dbErr) {
      console.error('Failed to log evaluation:', dbErr);
    }

    res.json(evaluation);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    console.error('Evaluate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
