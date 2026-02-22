import { z } from 'zod';

/** Schema for a single incoming event from the CLI */
export const IncomingEventSchema = z.object({
  agent: z.string().min(1),
  action: z.string().min(1),
  classification: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  packageName: z.string().optional(),
  packageVersion: z.string().optional(),
  packageManager: z.string().optional(),
  isInstall: z.boolean().optional(),
  isSearch: z.boolean().optional(),
  abandoned: z.boolean().optional(),
  timestamp: z.string().min(1),
});

export type ValidatedEvent = z.infer<typeof IncomingEventSchema>;

/** Patterns that indicate a value contains PII (file paths, env vars) */
const PATH_PATTERN = /[/\\]/;
const ENV_VAR_PATTERN = /^[A-Z_][A-Z0-9_]*=.+/;
const HOME_DIR_PATTERN = /(?:\/home\/|\/Users\/|C:\\Users\\)/i;

/** Fields that are allowed to contain path-like characters */
const PATH_EXEMPT_FIELDS = new Set(['timestamp', 'agent', 'action', 'classification', 'packageManager']);

/**
 * Strip any string field value that looks like it contains a file path or env var.
 * Returns the value as-is if it passes checks, or undefined if it should be stripped.
 */
function sanitizeStringValue(key: string, value: string): string | undefined {
  // Exempt fields that may legitimately contain special characters
  if (PATH_EXEMPT_FIELDS.has(key)) {
    return value;
  }

  // Strip values that look like file paths
  if (PATH_PATTERN.test(value) && !isVersionString(value)) {
    return undefined;
  }

  // Strip values that look like env var assignments
  if (ENV_VAR_PATTERN.test(value)) {
    return undefined;
  }

  // Strip values that contain home directory references
  if (HOME_DIR_PATTERN.test(value)) {
    return undefined;
  }

  return value;
}

/** Check if a string is a version number (e.g., "1.2.3") rather than a path */
function isVersionString(value: string): boolean {
  return /^\d+\.\d+/.test(value) || /^\^?\~?\d+/.test(value);
}

/**
 * Validate and sanitize incoming events to ensure they don't contain PII.
 *
 * - Validates that required fields exist using zod schema
 * - Strips any field values that look like file paths
 * - Strips any field values that look like environment variables
 * - Returns an array of cleaned, validated events
 *
 * @throws z.ZodError if required fields are missing or invalid
 */
export function sanitizeEvents(rawEvents: unknown[]): ValidatedEvent[] {
  const cleaned: ValidatedEvent[] = [];

  for (const raw of rawEvents) {
    if (typeof raw !== 'object' || raw === null) {
      continue;
    }

    const obj = raw as Record<string, unknown>;

    // Sanitize string fields that might contain PII
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const clean = sanitizeStringValue(key, value);
        if (clean !== undefined) {
          sanitized[key] = clean;
        }
        // If undefined, the field is stripped entirely
      } else {
        sanitized[key] = value;
      }
    }

    // Validate the sanitized object against the schema
    const parsed = IncomingEventSchema.parse(sanitized);
    cleaned.push(parsed);
  }

  return cleaned;
}
