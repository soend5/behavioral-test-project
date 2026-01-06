import { z } from "zod";

export function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function safeJsonParseWithSchema<T>(
  value: string | null | undefined,
  schema: z.ZodType<T>,
  fallback: T
): T {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = safeJsonParse(value);
  if (parsed === null) {
    return fallback;
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return fallback;
  }

  return result.data;
}

