import "server-only";

const SUPPORTED_SCHEMA_KEYS = new Set([
  "type",
  "properties",
  "required",
  "items",
  "enum",
  "anyOf",
  "description",
  "nullable",
  "propertyOrdering",
]);

/**
 * Gemini accepts a smaller JSON Schema subset than Zod emits. Runtime Zod
 * parsing still enforces every length, item-count, and numeric constraint.
 */
export function geminiResponseSchema(value: unknown): Record<string, unknown> {
  const simplified = simplify(value);
  return simplified && typeof simplified === "object" && !Array.isArray(simplified)
    ? simplified as Record<string, unknown>
    : {};
}

function simplify(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(simplify);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => SUPPORTED_SCHEMA_KEYS.has(key))
      .map(([key, item]) => [
        key,
        key === "properties" && item && typeof item === "object" && !Array.isArray(item)
          ? Object.fromEntries(Object.entries(item).map(([name, property]) => [name, simplify(property)]))
          : simplify(item),
      ]),
  );
}
