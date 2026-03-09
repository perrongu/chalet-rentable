import type { ProjectInputs, InputWithSource, SourceInfo } from "../types";

// ============================================================================
// EXTRACTION DE VALEURS ET SOURCES
// ============================================================================

export function extractValue<T>(input: InputWithSource<T> | T): T {
  if (typeof input === "object" && input !== null && "value" in input) {
    // Si useRange est activé et qu'on a une range, utiliser la valeur par défaut
    if ("range" in input && input.range && input.range.useRange) {
      return input.range.default as T;
    }
    return input.value;
  }
  return input as T;
}

export function extractSource<T>(
  input: InputWithSource<T> | T,
): SourceInfo | undefined {
  if (
    typeof input === "object" &&
    input !== null &&
    "value" in input &&
    "sourceInfo" in input
  ) {
    return input.sourceInfo;
  }
  return undefined;
}

// ============================================================================
// UTILITAIRE POUR MODIFIER UNE VALEUR PAR CHEMIN (path)
// ============================================================================

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function parsePathSegment(segment: string): {
  name: string;
  index: number | null;
} {
  const match = segment.match(/^(.+?)\[(\d+)\]$/);
  if (match) {
    return { name: match[1], index: parseInt(match[2], 10) };
  }
  return { name: segment, index: null };
}

/**
 * Modifie une valeur dans un objet ProjectInputs par chemin (path).
 * Opère sur un clone structuré : la mutation interne est intentionnelle et
 * sûre car le clone n'est référencé par aucun appelant avant le return.
 */
export function setValueByPath(
  inputs: ProjectInputs,
  path: string,
  value: number,
): ProjectInputs {
  const parts = path.split(".");

  // Guard against prototype pollution
  if (
    parts.some((segment) => FORBIDDEN_KEYS.has(parsePathSegment(segment).name))
  ) {
    return inputs;
  }

  // Clone profond — les mutations ci-dessous opèrent sur ce clone uniquement
  const newInputs =
    typeof structuredClone !== "undefined"
      ? structuredClone(inputs)
      : JSON.parse(JSON.stringify(inputs));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: Record<string, any> = newInputs;

  for (let i = 0; i < parts.length - 1; i++) {
    const { name, index } = parsePathSegment(parts[i]);
    if (!Object.prototype.hasOwnProperty.call(current, name)) return inputs;
    current = current[name];

    if (index !== null && Array.isArray(current)) {
      if (index < 0 || index >= current.length) return inputs;
      current = current[index];
    }
  }

  const lastPart = parts[parts.length - 1];
  const { name: lastName, index: lastIndex } = parsePathSegment(lastPart);

  if (lastIndex !== null) {
    // C'est un tableau
    if (
      Array.isArray(current[lastName]) &&
      lastIndex >= 0 &&
      lastIndex < current[lastName].length
    ) {
      if (
        typeof current[lastName][lastIndex] === "object" &&
        "value" in current[lastName][lastIndex]
      ) {
        if (
          "range" in current[lastName][lastIndex] &&
          current[lastName][lastIndex].range?.useRange
        ) {
          current[lastName][lastIndex].range.default = value;
        } else {
          current[lastName][lastIndex].value = value;
        }
      } else {
        current[lastName][lastIndex] = value;
      }
    }
  } else {
    // C'est un objet simple
    if (typeof current[lastName] === "object" && "value" in current[lastName]) {
      if ("range" in current[lastName] && current[lastName].range?.useRange) {
        current[lastName].range.default = value;
      } else {
        current[lastName].value = value;
      }
    } else {
      current[lastName] = value;
    }
  }

  return newInputs;
}
